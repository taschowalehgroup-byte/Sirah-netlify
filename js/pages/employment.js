/* ═══════════════════════════════════════════════════════
   DentCare Pro — Employment Page
   Staff records + optional system login creation
   (mirrors the doctor create-user pattern exactly)
   ═══════════════════════════════════════════════════════ */

const EmploymentPage = {
  _records: [],

  async render() {
    this._records = await DB.tables.employment.all();
    this._renderPayrollSummary();
    this._renderTable(this._records);
  },

  _renderPayrollSummary() {
    const active   = this._records.filter(r => r.status === 'active');
    const monthly  = active.filter(r => r.salary_type === 'monthly')
                           .reduce((s, r) => s + (r.salary || 0), 0);
    const depts    = [...new Set(this._records.map(r => r.department))].filter(Boolean).length;

    const el = document.getElementById('empPayrollRow');
    if (!el) return;

    const deptBreakdown = {};
    active.forEach(r => {
      const d = r.department || 'other';
      if (!deptBreakdown[d]) deptBreakdown[d] = { count: 0, total: 0 };
      deptBreakdown[d].count++;
      if (r.salary_type === 'monthly') deptBreakdown[d].total += (r.salary || 0);
    });

    const deptCards = Object.entries(deptBreakdown).map(([dept, d]) => `
      <div class="emp-dept-card">
        <div class="emp-dept-name">${dept.charAt(0).toUpperCase() + dept.slice(1)}</div>
        <div class="emp-dept-count">${d.count} staff</div>
        <div class="emp-dept-salary">${fmt(d.total)}<span>/mo</span></div>
      </div>`).join('');

    el.innerHTML = `
      <div class="emp-payroll-header">
        <div class="emp-payroll-kpi">
          <div class="emp-kpi-card">
            <div class="emp-kpi-icon">👥</div>
            <div>
              <div class="emp-kpi-val">${active.length}</div>
              <div class="emp-kpi-lbl">Active Staff</div>
            </div>
          </div>
          <div class="emp-kpi-card accent">
            <div class="emp-kpi-icon">💵</div>
            <div>
              <div class="emp-kpi-val">${fmt(monthly)}</div>
              <div class="emp-kpi-lbl">Monthly Payroll</div>
            </div>
          </div>
          <div class="emp-kpi-card">
            <div class="emp-kpi-icon">🏢</div>
            <div>
              <div class="emp-kpi-val">${depts}</div>
              <div class="emp-kpi-lbl">Departments</div>
            </div>
          </div>
          <div class="emp-kpi-card">
            <div class="emp-kpi-icon">💤</div>
            <div>
              <div class="emp-kpi-val">${this._records.filter(r => r.status !== 'active').length}</div>
              <div class="emp-kpi-lbl">Inactive / Leave</div>
            </div>
          </div>
        </div>
        ${deptCards ? `<div class="emp-dept-strip">${deptCards}</div>` : ''}
      </div>`;
  },

  _renderTable(rows) {
    const tbody = document.getElementById('empBody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div>👥</div><p>No employment records found</p></div></td></tr>`;
      return;
    }

    const statusBadge = s => ({
      active:   '<span class="badge badge-confirmed">Active</span>',
      inactive: '<span class="badge badge-cancelled">Inactive</span>',
      on_leave: '<span class="badge badge-normal">On Leave</span>'
    }[s] || `<span class="badge">${s}</span>`);

    const deptColor = {
      clinical:'#06d6a0', administrative:'#00d4ff', inventory:'#b388ff',
      finance:'#ffd166', management:'#f72585', other:'#7b84a3'
    };

    tbody.innerHTML = rows.map(r => {
      const color = deptColor[r.department] || deptColor.other;
      const hire  = r.hire_date ? new Date(r.hire_date).toLocaleDateString() : '—';
      return `<tr>
        <td><strong>${r.employee_name}</strong></td>
        <td style="color:var(--text2)">${r.role}</td>
        <td><span class="emp-dept-tag" style="--dept-clr:${color}">${r.department || '—'}</span></td>
        <td class="emp-salary-cell">
          <strong>${fmt(r.salary)}</strong>
          <span class="emp-salary-type">/${r.salary_type || 'monthly'}</span>
        </td>
        <td>${hire}</td>
        <td>${statusBadge(r.status)}</td>
        <td style="color:var(--text2)">${r.phone || '—'}</td>
        <td style="color:var(--text2)">${r.email || '—'}</td>
        <td><div class="actions">
          <button class="action-btn" onclick="EmploymentPage._editModal(${r.id})">Edit</button>
          <button class="action-btn danger" onclick="EmploymentPage._delete(${r.id})">Del</button>
        </div></td>
      </tr>`;
    }).join('');
  },

  search(q) {
    const lq = q.toLowerCase();
    this._renderTable(this._records.filter(r =>
      (r.employee_name || '').toLowerCase().includes(lq) ||
      (r.role || '').toLowerCase().includes(lq) ||
      (r.department || '').toLowerCase().includes(lq)
    ));
  },

  filterDept(dept) {
    document.querySelectorAll('.emp-filter-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active');
    if (!dept || dept === 'all') return this._renderTable(this._records);
    this._renderTable(this._records.filter(r => r.department === dept));
  },

  /* ══════════════════════════════════════════════════════
     MODAL
  ══════════════════════════════════════════════════════ */
  _closeModal() {
    const m = document.getElementById('empModal');
    if (m) m.remove();
  },

  _addModal() {
    this._closeModal();
    const html = `
    <div id="empModal" class="modal-overlay open"
         onclick="if(event.target===this)EmploymentPage._closeModal()">
      <div class="modal" style="max-width:580px;max-height:90vh;overflow-y:auto">
        <div class="modal-head">
          <h3>👤 Add Employment Record</h3>
          <button class="close-btn" onclick="EmploymentPage._closeModal()">✕</button>
        </div>
        <div class="modal-body">
          ${this._formFields()}
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" onclick="EmploymentPage._closeModal()">Cancel</button>
          <button class="btn-primary" onclick="EmploymentPage._saveNew()">✓ Add Record</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    // Generate credentials immediately (same as doctor modal behaviour)
    this._previewCredentials('');
  },

  async _editModal(id) {
    const r = this._records.find(x => x.id === id)
           || await DB.tables.employment.find(id);
    if (!r) return;
    this._closeModal();
    const html = `
    <div id="empModal" class="modal-overlay open"
         onclick="if(event.target===this)EmploymentPage._closeModal()">
      <div class="modal" style="max-width:580px;max-height:90vh;overflow-y:auto">
        <div class="modal-head">
          <h3>✏️ Edit Employment Record</h3>
          <button class="close-btn" onclick="EmploymentPage._closeModal()">✕</button>
        </div>
        <div class="modal-body">
          ${this._formFields(r)}
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" onclick="EmploymentPage._closeModal()">Cancel</button>
          <button class="btn-primary" onclick="EmploymentPage._saveEdit(${id})">✓ Update Record</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  /* ── Form HTML (shared by add + edit) ─────────────────── */
  _formFields(r = {}) {
    const isEdit   = !!r.id;
    const depts    = ['clinical','administrative','inventory','finance','management','other'];
    const types    = ['monthly','hourly','commission'];
    const statuses = ['active','inactive','on_leave'];

    const dOpts = depts.map(d =>
      `<option value="${d}" ${r.department === d ? 'selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`
    ).join('');
    const tOpts = types.map(t =>
      `<option value="${t}" ${(r.salary_type || 'monthly') === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
    ).join('');
    const sOpts = statuses.map(s =>
      `<option value="${s}" ${(r.status || 'active') === s ? 'selected' : ''}>${s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>`
    ).join('');

    // Only show "create login" option when adding a new record
    const createUserSection = isEdit ? '' : `
      <!-- ── Auto-generated Login Credentials (always visible, mirrors doctor modal) ── -->
      <div style="grid-column:1/-1;margin-top:.5rem">
        <div id="empCredentialsPreview" style="
          margin-top:.25rem;
          padding:1rem;
          background:var(--surface2);
          border-radius:10px;
          border:1px solid var(--border)
        ">
          <p style="margin:0 0 .5rem;font-size:.78rem;color:var(--text2);font-weight:700;text-transform:uppercase;letter-spacing:.05em">
            🔑 Auto-generated Login Credentials
          </p>
          <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
            <div>
              <span style="font-size:.72rem;color:var(--text2)">Username</span><br>
              <code id="empPreviewUsername" style="font-size:1rem;letter-spacing:2px;color:var(--accent)">—</code>
            </div>
            <div>
              <span style="font-size:.72rem;color:var(--text2)">Password</span><br>
              <code id="empPreviewPassword" style="font-size:1rem;letter-spacing:2px;color:var(--green)">—</code>
            </div>
          </div>
          <div style="margin-top:.75rem">
            <label style="font-size:.78rem;color:var(--text2);display:block;margin-bottom:.3rem">System Access Role</label>
            <select id="emp_system_role" class="form-control" style="max-width:220px">
              <option value="receptionist">Receptionist</option>
              <option value="accountant">Accountant</option>
              <option value="assistant">Assistant</option>
              <option value="hygienist">Hygienist</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p style="margin:.6rem 0 0;font-size:.72rem;color:var(--text2)">
            ⚠️ Save these credentials — the password won't be shown again.
          </p>
        </div>
      </div>`;

    return `
    <div class="form-grid-2">
      <div class="form-group" style="grid-column:1/-1">
        <label>Employee Name *</label>
        <input id="emp_name" type="text" class="form-control"
               value="${(r.employee_name || '').replace(/"/g,'&quot;')}"
               placeholder="Full name"
               oninput="EmploymentPage._onNameInput(this.value)">
      </div>
      <div class="form-group">
        <label>Role / Job Title *</label>
        <input id="emp_role" type="text" class="form-control"
               value="${(r.role || '').replace(/"/g,'&quot;')}"
               placeholder="e.g. Inventory Manager">
      </div>
      <div class="form-group">
        <label>Department</label>
        <select id="emp_dept" class="form-control">${dOpts}</select>
      </div>
      <div class="form-group">
        <label>Salary *</label>
        <input id="emp_salary" type="number" min="0" step="0.01" class="form-control"
               value="${r.salary || 0}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>Salary Type</label>
        <select id="emp_type" class="form-control">${tOpts}</select>
      </div>
      <div class="form-group">
        <label>Hire Date</label>
        <input id="emp_hire" type="date" class="form-control" value="${r.hire_date || ''}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="emp_status" class="form-control">${sOpts}</select>
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input id="emp_phone" type="text" class="form-control"
               value="${(r.phone || '').replace(/"/g,'&quot;')}" placeholder="Phone number">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="emp_email" type="email" class="form-control"
               value="${(r.email || '').replace(/"/g,'&quot;')}" placeholder="Email address">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>Notes</label>
        <textarea id="emp_notes" class="form-control" rows="2"
                  placeholder="Additional notes…">${r.notes || ''}</textarea>
      </div>
      ${createUserSection}
    </div>`;
  },

  /* ── Live name input → update username preview ─────────── */
  _onNameInput(name) {
    this._previewCredentials(name);
  },

  /* ── Build username + password preview (same algo as doctor) ── */
  async _previewCredentials(fullName) {
    const uEl = document.getElementById('empPreviewUsername');
    const pEl = document.getElementById('empPreviewPassword');
    if (!uEl || !pEl) return;

    const clean = fullName.trim();
    if (!clean) { uEl.textContent = '—'; pEl.textContent = '—'; return; }

    // Build initials
    const parts    = clean.split(/\s+/).filter(w => /^[a-zA-Z]/.test(w));
    const initials = ((parts[0]?.[0] || 'X') + (parts[1]?.[0] || 'X')).toUpperCase();

    // Check existing usernames to avoid collision
    try {
      const existing = await DB.tables.users.all();
      const taken    = new Set(existing.map(u => u.username));
      let num = 1;
      while (taken.has(`${initials}-${String(num).padStart(2, '0')}`)) num++;
      uEl.textContent = `${initials}-${String(num).padStart(2, '0')}`;
    } catch {
      uEl.textContent = `${initials}-01`;
    }

    // Only generate once per modal open
    if (!pEl.dataset.generated) {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const l1 = letters[Math.floor(Math.random() * letters.length)];
      const l2 = letters[Math.floor(Math.random() * letters.length)];
      const n  = String(Math.floor(Math.random() * 90) + 10);
      pEl.textContent       = `${l1}${l2}-${n}`;
      pEl.dataset.generated = '1';
    }
  },

  /* ── Save new record ───────────────────────────────────── */
  async _saveNew() {
    const name   = document.getElementById('emp_name')?.value.trim();
    const role   = document.getElementById('emp_role')?.value.trim();
    const salary = parseFloat(document.getElementById('emp_salary')?.value) || 0;
    if (!name || !role) { toast('Name and role are required', 'error'); return; }

    try {
      // 1 — insert employment record
      const record = await DB.tables.employment.insert({
        employee_name: name,
        role,
        salary,
        department:  document.getElementById('emp_dept')?.value,
        salary_type: document.getElementById('emp_type')?.value,
        hire_date:   document.getElementById('emp_hire')?.value || null,
        status:      document.getElementById('emp_status')?.value,
        phone:       document.getElementById('emp_phone')?.value.trim(),
        email:       document.getElementById('emp_email')?.value.trim(),
        notes:       document.getElementById('emp_notes')?.value.trim()
      });

      // 2 — always create system login (same as doctor flow, always runs)
      const systemRole  = document.getElementById('emp_system_role')?.value || 'receptionist';
      const userAccount = await DB.tables.users.insert({
        employee_name: name,
        system_role:   systemRole,
        employment_id: record.id
      });

      const uname = userAccount.username || '—';
      const pass  = userAccount.password  || '—';
      this._closeModal();
      toast(
        `✅ "${name}" added! Login → <strong>${uname}</strong> / <strong>${pass}</strong>`,
        'success', 8000
      );
      await this.render();
    } catch(e) { toast('Failed to add record: ' + e.message, 'error'); }
  },

  /* ── Save edited record ────────────────────────────────── */
  async _saveEdit(id) {
    const name   = document.getElementById('emp_name')?.value.trim();
    const role   = document.getElementById('emp_role')?.value.trim();
    const salary = parseFloat(document.getElementById('emp_salary')?.value) || 0;
    if (!name || !role) { toast('Name and role are required', 'error'); return; }
    try {
      await DB.tables.employment.update(id, {
        employee_name: name,
        role,
        salary,
        department:  document.getElementById('emp_dept')?.value,
        salary_type: document.getElementById('emp_type')?.value,
        hire_date:   document.getElementById('emp_hire')?.value || null,
        status:      document.getElementById('emp_status')?.value,
        phone:       document.getElementById('emp_phone')?.value.trim(),
        email:       document.getElementById('emp_email')?.value.trim(),
        notes:       document.getElementById('emp_notes')?.value.trim()
      });
      this._closeModal();
      toast('Employment record updated!', 'success');
      await this.render();
    } catch(e) { toast('Failed to update: ' + e.message, 'error'); }
  },

  async _delete(id) {
    const r = this._records.find(x => x.id === id);
    if (!confirm(`Delete employment record for "${r?.employee_name}"?`)) return;
    try {
      await DB.tables.employment.delete(id);
      toast('Record deleted', 'info');
      await this.render();
    } catch(e) { toast('Failed to delete: ' + e.message, 'error'); }
  },

  exportExcel() { DB.tables.employment.all().then(rows => UI.exportExcel(rows, 'employment')); },
  exportJson()  { DB.tables.employment.all().then(rows => UI.exportJson(rows, 'employment')); },
  importFile() {
    UI.importFile(async rows => {
      const res = await DB.tables.employment.bulk(rows);
      toast(`Imported ${res.inserted} records`, 'success');
      this.render();
    });
  }
};
