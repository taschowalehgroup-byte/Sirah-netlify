/* ═══════════════════════════════════════════════════════
   DentCare Pro — Operations & Admin Features
   1. Audit Log viewer
   2. Insurance Claims tracker
   3. Multi-branch filter
   4. 2FA Setup & Login
   ═══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   1. AUDIT LOG
   ══════════════════════════════════════════════════════ */
const AuditLog = {
  _data: [],

  async render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div class="audit-toolbar">
      <input type="search" class="search-input" id="auditSearch" placeholder="🔍 Filter by user, action, table…" oninput="AuditLog.filter(this.value)" style="width:260px">
      <select id="auditActionFilter" onchange="AuditLog.filter()" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:.4rem .75rem;font-size:.82rem">
        <option value="">All actions</option>
        <option value="CREATE">Create</option>
        <option value="UPDATE">Update</option>
        <option value="DELETE">Delete</option>
      </select>
      <button class="btn-icon" onclick="AuditLog.render('${containerId}')">🔄 Refresh</button>
      <button class="btn-icon danger" onclick="AuditLog.clearAll('${containerId}')">🗑 Clear Log</button>
    </div>
    <div id="auditTableWrap"></div>`;

    try {
      this._data = await DB.audit.all(500);
      this._renderTable(this._data);
    } catch(e) {
      document.getElementById('auditTableWrap').innerHTML =
        '<div style="padding:2rem;color:var(--text2);text-align:center">No audit data yet — actions will appear here as staff use the system</div>';
    }
  },

  _renderTable(rows) {
    const wrap = document.getElementById('auditTableWrap');
    if (!wrap) return;
    if (!rows.length) {
      wrap.innerHTML = '<div style="padding:2rem;color:var(--text2);text-align:center">No entries match your filter</div>';
      return;
    }
    const ACTION_COLORS = { CREATE: 'var(--green)', UPDATE: 'var(--accent)', DELETE: 'var(--red)' };
    wrap.innerHTML = `
      <div class="card" style="margin-top:.75rem;overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record</th><th>Detail</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr style="--ri:${i}">
                <td style="white-space:nowrap;font-size:.75rem;color:var(--text2)">${new Date(r.created_at).toLocaleString('en-EG')}</td>
                <td><strong>${r.username || '—'}</strong></td>
                <td><span class="badge" style="background:${ACTION_COLORS[r.action]||'var(--accent)'};color:#fff;font-size:.7rem;padding:2px 8px;border-radius:999px">${r.action}</span></td>
                <td style="font-family:monospace;font-size:.78rem;color:var(--text2)">${r.table_name || '—'}</td>
                <td style="color:var(--text2);font-size:.78rem">${r.record_id || '—'}</td>
                <td style="font-size:.73rem;color:var(--text3);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(r.detail||'').replace(/"/g,"'")}">${r.detail || '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    /* stagger rows */
    if (typeof staggerTableRows === 'function') {
      wrap.querySelectorAll('tbody tr').forEach((tr, i) => tr.style.setProperty('--ri', i));
    }
  },

  filter(q) {
    q = q !== undefined ? q : (document.getElementById('auditSearch')?.value || '');
    const action = document.getElementById('auditActionFilter')?.value || '';
    const lower  = q.toLowerCase();
    const filtered = this._data.filter(r => {
      const matchQ = !lower ||
        (r.username||'').toLowerCase().includes(lower) ||
        (r.action||'').toLowerCase().includes(lower) ||
        (r.table_name||'').toLowerCase().includes(lower) ||
        (r.detail||'').toLowerCase().includes(lower);
      const matchA = !action || r.action === action;
      return matchQ && matchA;
    });
    this._renderTable(filtered);
  },

  async clearAll(containerId) {
    if (!confirm('Clear the entire audit log? This cannot be undone.')) return;
    try {
      await DB.audit.clear();
      toast('Audit log cleared', 'success');
      this.render(containerId);
    } catch(e) { toast('Failed to clear log', 'error'); }
  }
};

/* ══════════════════════════════════════════════════════
   2. INSURANCE CLAIMS TRACKER
   ══════════════════════════════════════════════════════ */
const InsuranceTracker = {
  _data: [],
  _patients: [],

  async render(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = `
      <div class="ins-toolbar">
        <div class="filter-tabs" id="insFilters">
          <button class="ftab active" onclick="InsuranceTracker.filter('all',this)">All</button>
          <button class="ftab" onclick="InsuranceTracker.filter('submitted',this)">Submitted</button>
          <button class="ftab" onclick="InsuranceTracker.filter('approved',this)">Approved</button>
          <button class="ftab" onclick="InsuranceTracker.filter('rejected',this)">Rejected</button>
          <button class="ftab" onclick="InsuranceTracker.filter('reimbursed',this)">Reimbursed</button>
        </div>
        <button class="btn-primary" onclick="InsuranceTracker.openNewModal()">+ New Claim</button>
      </div>
      <div id="insKpiRow" class="ins-kpi-row"></div>
      <div id="insTableWrap"></div>
      <div id="insModal" class="modal-overlay" onclick="if(event.target===this)this.classList.remove('active')">
        <div class="modal-box" style="max-width:480px">
          <div class="modal-head"><span id="insModalTitle">New Insurance Claim</span><button class="btn-icon" onclick="$('insModal').classList.remove('active')">✕</button></div>
          <div class="modal-body" id="insModalBody"></div>
        </div>
      </div>`;

    try {
      const [claims, patients] = await Promise.all([DB.insurance.all(), DB.tables.patients.all()]);
      this._data     = claims;
      this._patients = patients;
      await this._renderKpi();
      this._renderTable(claims);
    } catch(e) { console.error(e); }
  },

  async _renderKpi() {
    const el = document.getElementById('insKpiRow');
    if (!el) return;
    try {
      const s = await DB.insurance.stats();
      el.innerHTML = `
        <div class="ins-kpi-card"><div class="ins-kpi-val">${s.total||0}</div><div class="ins-kpi-label">Total Claims</div></div>
        <div class="ins-kpi-card" style="--c:var(--accent)"><div class="ins-kpi-val" style="color:var(--accent)">${s.submitted||0}</div><div class="ins-kpi-label">Submitted</div></div>
        <div class="ins-kpi-card" style="--c:var(--green)"><div class="ins-kpi-val" style="color:var(--green)">${s.approved||0}</div><div class="ins-kpi-label">Approved</div></div>
        <div class="ins-kpi-card" style="--c:var(--red)"><div class="ins-kpi-val" style="color:var(--red)">${s.rejected||0}</div><div class="ins-kpi-label">Rejected</div></div>
        <div class="ins-kpi-card" style="--c:var(--green)"><div class="ins-kpi-val" style="color:var(--green)">E£${Number(s.total_reimbursed||0).toLocaleString()}</div><div class="ins-kpi-label">Reimbursed</div></div>
        <div class="ins-kpi-card"><div class="ins-kpi-val">E£${Number(s.total_claimed||0).toLocaleString()}</div><div class="ins-kpi-label">Total Claimed</div></div>`;
    } catch(e) {}
  },

  _renderTable(rows) {
    const wrap = document.getElementById('insTableWrap');
    if (!wrap) return;
    const STATUS_COLORS = {
      submitted:   'var(--accent)',
      approved:    'var(--green)',
      rejected:    'var(--red)',
      reimbursed:  '#06d6a0',
      pending:     'var(--yellow)'
    };
    wrap.innerHTML = rows.length === 0
      ? '<div style="padding:2rem;text-align:center;color:var(--text2)">No insurance claims found</div>'
      : `<div class="card" style="margin-top:.75rem;overflow-x:auto">
          <table class="data-table">
            <thead><tr>
              <th>Patient</th><th>Insurer</th><th>Claim No</th>
              <th>Amount</th><th>Status</th><th>Submitted</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr style="--ri:${i}">
                  <td><strong>${r.patient_name || '—'}</strong></td>
                  <td>${r.insurer_name}</td>
                  <td style="font-family:monospace;font-size:.8rem">${r.claim_no || '—'}</td>
                  <td>E£${Number(r.amount||0).toLocaleString()}</td>
                  <td><span class="badge" style="background:${STATUS_COLORS[r.status]||'var(--border)'};color:#fff;font-size:.72rem;padding:2px 8px;border-radius:999px">${r.status}</span></td>
                  <td style="font-size:.8rem;color:var(--text2)">${r.submitted_date || '—'}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" onclick="InsuranceTracker.openEditModal(${r.id})">Edit</button>
                      <button class="action-btn danger" onclick="InsuranceTracker.deleteClaim(${r.id})">Del</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
  },

  filter(status, btn) {
    document.querySelectorAll('#insFilters .ftab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const filtered = status === 'all' ? this._data : this._data.filter(r => r.status === status);
    this._renderTable(filtered);
  },

  _claimForm(claim) {
    const ptOptions = this._patients.map(p =>
      `<option value="${p.id}" ${claim?.patient_id == p.id ? 'selected' : ''}>${p.full_name}</option>`
    ).join('');
    const statuses = ['submitted','approved','rejected','reimbursed'];
    return `
      <div class="form-group"><label>Patient</label>
        <select id="insPatient" class="form-input">${ptOptions}</select></div>
      <div class="form-group"><label>Insurance Company</label>
        <input id="insInsurer" class="form-input" value="${claim?.insurer_name||''}" placeholder="e.g. Allianz, MetLife"></div>
      <div class="form-group"><label>Claim Number</label>
        <input id="insClaimNo" class="form-input" value="${claim?.claim_no||''}" placeholder="Optional"></div>
      <div class="form-group"><label>Amount (E£)</label>
        <input id="insAmount" type="number" class="form-input" value="${claim?.amount||''}" placeholder="0.00"></div>
      <div class="form-group"><label>Status</label>
        <select id="insStatus" class="form-input">
          ${statuses.map(s => `<option value="${s}" ${claim?.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Submitted Date</label>
        <input id="insSubmittedDate" type="date" class="form-input" value="${claim?.submitted_date||''}"></div>
      <div class="form-group"><label>Notes</label>
        <textarea id="insNotes" class="form-input" rows="2">${claim?.notes||''}</textarea></div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1rem">
        <button class="btn-ghost" onclick="$('insModal').classList.remove('active')">Cancel</button>
        <button class="btn-primary" onclick="InsuranceTracker._saveClaim(${claim?.id||'null'})">💾 Save Claim</button>
      </div>`;
  },

  openNewModal() {
    $('insModalTitle').textContent = 'New Insurance Claim';
    $('insModalBody').innerHTML = this._claimForm(null);
    $('insModal').classList.add('active');
  },

  async openEditModal(id) {
    try {
      const claim = await DB.insurance.find(id);
      $('insModalTitle').textContent = 'Edit Insurance Claim';
      $('insModalBody').innerHTML = this._claimForm(claim);
      $('insModal').classList.add('active');
    } catch(e) { toast('Failed to load claim', 'error'); }
  },

  async _saveClaim(id) {
    const payload = {
      patient_id:     parseInt($('insPatient').value),
      insurer_name:   $('insInsurer').value.trim(),
      claim_no:       $('insClaimNo').value.trim() || null,
      amount:         parseFloat($('insAmount').value) || 0,
      status:         $('insStatus').value,
      submitted_date: $('insSubmittedDate').value || null,
      notes:          $('insNotes').value.trim() || null
    };
    if (!payload.insurer_name) { toast('Insurer name is required', 'error'); return; }
    try {
      if (id) await DB.insurance.update(id, payload);
      else    await DB.insurance.create(payload);
      $('insModal').classList.remove('active');
      toast(id ? 'Claim updated ✓' : 'Claim created ✓', 'success');
      const container = document.getElementById('insTableWrap')?.closest('[id]')?.id || 'insuranceWrap';
      await this.render(container.replace('Wrap','') || 'insuranceWrap');
    } catch(e) { toast('Save failed: ' + e.message, 'error'); }
  },

  async deleteClaim(id) {
    if (!confirm('Delete this insurance claim?')) return;
    try {
      await DB.insurance.delete(id);
      toast('Claim deleted', 'success');
      this._data = this._data.filter(r => r.id !== id);
      this._renderTable(this._data);
      this._renderKpi();
    } catch(e) { toast('Delete failed', 'error'); }
  }
};

/* ══════════════════════════════════════════════════════
   3. MULTI-BRANCH FILTER
   ══════════════════════════════════════════════════════ */
const BranchManager = {
  _current: 'All',
  _branches: ['All', 'Main'],

  /* Discover branches from patients + doctors */
  async loadBranches() {
    try {
      const [pts, drs] = await Promise.all([
        DB.tables.patients.all(),
        DB.tables.doctors.all()
      ]);
      const set = new Set(['All', 'Main']);
      pts.forEach(p => p.branch && set.add(p.branch));
      drs.forEach(d => d.branch && set.add(d.branch));
      this._branches = [...set];
      this._renderSelector();
    } catch(e) {}
  },

  _renderSelector() {
    const wrap = document.getElementById('branchSelectorWrap');
    if (!wrap) return;
    wrap.innerHTML = `
      <select id="branchSelect" onchange="BranchManager.switchBranch(this.value)"
        style="background:var(--bg3);color:var(--text);border:1px solid var(--border);
               border-radius:var(--radius-sm);padding:.35rem .75rem;font-size:.82rem;cursor:pointer">
        ${this._branches.map(b =>
          `<option value="${b}" ${b === this._current ? 'selected' : ''}>${b === 'All' ? '🏢 All Branches' : '🏥 ' + b}</option>`
        ).join('')}
      </select>
      <button class="btn-icon" onclick="BranchManager.openAddBranchModal()" title="Add branch" style="padding:.35rem .6rem">+</button>`;
  },

  switchBranch(branch) {
    this._current = branch;
    /* re-render whichever page is active */
    const page = App.currentPage;
    if (page && Pages[page]?.render) Pages[page].render();
    toast(`Branch: ${branch === 'All' ? 'All Branches' : branch}`, 'info');
  },

  getCurrent() { return this._current; },

  /** Filter any array by branch field */
  filter(rows) {
    if (this._current === 'All') return rows;
    return rows.filter(r => !r.branch || r.branch === this._current || r.branch === 'Main');
  },

  openAddBranchModal() {
    const name = prompt('New branch name (e.g. "Nasr City", "Alexandria"):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (!this._branches.includes(trimmed)) {
      this._branches.push(trimmed);
      this._renderSelector();
      toast(`Branch "${trimmed}" added — assign it to patients/doctors when creating them`, 'success');
    } else {
      toast('Branch already exists', 'info');
    }
  },

  /** Called from patients/doctors forms — injects branch dropdown */
  branchSelectHtml(current) {
    const opts = this._branches
      .filter(b => b !== 'All')
      .map(b => `<option value="${b}" ${b === (current||'Main') ? 'selected' : ''}>${b}</option>`)
      .join('');
    return `<div class="form-group"><label>Branch</label>
      <select name="branch" class="form-input">${opts}</select>
    </div>`;
  }
};

/* ══════════════════════════════════════════════════════
   4. TWO-FACTOR AUTHENTICATION (2FA / TOTP)
   ══════════════════════════════════════════════════════ */
const TwoFA = {
  _pendingUserId: null,
  _pendingSession: null,

  /* Called from settings page — show QR setup */
  async renderSetupPanel(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const sessionRaw = localStorage.getItem('dentcare_session');
    const session    = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!session) { el.innerHTML = '<div style="color:var(--text2)">Not logged in</div>'; return; }

    el.innerHTML = '<div style="color:var(--text2);padding:1rem">Loading 2FA status…</div>';

    try {
      const status = await DB.twofa.status(session.id);

      if (status.enabled) {
        el.innerHTML = `
          <div class="twofa-card">
            <div class="twofa-enabled-banner">✅ 2FA is ENABLED on your account</div>
            <p style="font-size:.85rem;color:var(--text2);margin:.75rem 0">
              Your account is protected with a time-based one-time password (TOTP).
              Use Google Authenticator, Authy, or any TOTP app to log in.
            </p>
            <button class="btn-icon danger" onclick="TwoFA.disable(${session.id}, '${containerId}')">🔓 Disable 2FA</button>
          </div>`;
      } else {
        el.innerHTML = `
          <div class="twofa-card">
            <div class="twofa-title">🔐 Set Up Two-Factor Authentication</div>
            <p style="font-size:.83rem;color:var(--text2);margin:.5rem 0 1rem">
              Protect your admin account with a TOTP authenticator app (Google Authenticator, Authy, etc.)
            </p>
            <button class="btn-primary" id="twofaGenerateBtn" onclick="TwoFA.generateQR(${session.id}, '${session.username}', '${containerId}')">
              📱 Generate QR Code
            </button>
          </div>`;
      }
    } catch(e) {
      el.innerHTML = '<div style="color:var(--red);padding:1rem">Failed to load 2FA status</div>';
    }
  },

  async generateQR(userId, username, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const btn = document.getElementById('twofaGenerateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

    try {
      const data = await DB.twofa.setup(userId, username);
      /* Build QR using a free API — no external JS lib needed */
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.otpauth_url)}`;

      el.innerHTML = `
        <div class="twofa-card">
          <div class="twofa-title">📱 Scan this QR Code</div>
          <p style="font-size:.83rem;color:var(--text2);margin:.4rem 0 .9rem">
            Open Google Authenticator or Authy, tap "+" and scan the code below.
          </p>
          <div style="display:flex;gap:1.5rem;align-items:flex-start;flex-wrap:wrap">
            <div class="twofa-qr-wrap">
              <img src="${qrUrl}" alt="QR Code" width="180" height="180" style="border-radius:8px;background:#fff;padding:8px">
            </div>
            <div style="flex:1;min-width:200px">
              <div style="font-size:.78rem;color:var(--text2);margin-bottom:.4rem">Manual entry key:</div>
              <code style="background:var(--bg3);padding:.4rem .75rem;border-radius:6px;font-size:.82rem;
                           letter-spacing:.15em;color:var(--accent);word-break:break-all">${data.secret}</code>
              <div style="margin-top:1.25rem;font-size:.82rem;color:var(--text2)">
                After scanning, enter the 6-digit code from your app to confirm:
              </div>
              <div style="display:flex;gap:.5rem;margin-top:.6rem;align-items:center">
                <input id="twofaConfirmCode" type="text" maxlength="6" placeholder="000000"
                  class="form-input" style="width:120px;letter-spacing:.2em;text-align:center;font-size:1.1rem"
                  oninput="this.value=this.value.replace(/\\D/g,'')">
                <button class="btn-primary" onclick="TwoFA.confirmEnable(${userId}, '${containerId}')">✓ Enable</button>
              </div>
            </div>
          </div>
        </div>`;
    } catch(e) {
      toast('Failed to generate QR: ' + e.message, 'error');
      this.renderSetupPanel(containerId);
    }
  },

  async confirmEnable(userId, containerId) {
    const token = document.getElementById('twofaConfirmCode')?.value?.trim();
    if (!token || token.length !== 6) { toast('Enter the 6-digit code from your app', 'error'); return; }
    try {
      const result = await DB.twofa.verify(userId, token, true);
      if (result.valid) {
        toast('✅ 2FA enabled! Your account is now protected.', 'success');
        this.renderSetupPanel(containerId);
      } else {
        toast('❌ Invalid code — check your app and try again', 'error');
      }
    } catch(e) { toast('Verification failed: ' + e.message, 'error'); }
  },

  async disable(userId, containerId) {
    if (!confirm('Disable 2FA? Your account will only be protected by your password.')) return;
    try {
      await DB.twofa.disable(userId);
      toast('2FA disabled', 'info');
      this.renderSetupPanel(containerId);
    } catch(e) { toast('Failed to disable 2FA', 'error'); }
  },

  /* ── 2FA Login Step ─────────────────────────────────
     Call this after a successful password login to check
     if 2FA is required, and if so show the OTP prompt.   */
  async checkAfterLogin(session, onSuccess) {
    try {
      const result = await DB.twofa.checkLogin(session.id, null);
      if (!result.required) { onSuccess(session); return; }
      /* 2FA required — show OTP modal */
      this._pendingUserId  = session.id;
      this._pendingSession = session;
      this._showOTPModal(onSuccess);
    } catch(e) {
      /* If 2FA check fails, don't block login */
      console.warn('[2FA] check failed, proceeding without 2FA:', e);
      onSuccess(session);
    }
  },

  _showOTPModal(onSuccess) {
    const overlay = document.getElementById('twofaLoginOverlay');
    if (!overlay) { /* fallback: skip 2FA if overlay not in DOM */ onSuccess(this._pendingSession); return; }
    overlay.classList.add('active');
    document.getElementById('twofaLoginInput')?.focus();
    overlay._onSuccess = onSuccess;
  },

  async submitLoginOTP() {
    const overlay = document.getElementById('twofaLoginOverlay');
    const token   = document.getElementById('twofaLoginInput')?.value?.trim();
    if (!token || token.length !== 6) { toast('Enter the 6-digit code', 'error'); return; }
    try {
      const result = await DB.twofa.checkLogin(this._pendingUserId, token);
      if (result.valid) {
        overlay.classList.remove('active');
        if (overlay._onSuccess) overlay._onSuccess(this._pendingSession);
        this._pendingUserId = null;
        this._pendingSession = null;
      } else {
        toast('❌ Invalid code — try again', 'error');
        document.getElementById('twofaLoginInput').value = '';
        document.getElementById('twofaLoginInput').focus();
      }
    } catch(e) { toast('Verification error', 'error'); }
  }
};

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Load branches after a short delay (after DB is ready) */
  setTimeout(() => BranchManager.loadBranches(), 1200);
});
