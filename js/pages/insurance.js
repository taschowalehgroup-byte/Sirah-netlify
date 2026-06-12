/* ═══════════════════════════════════════════════════════
   DentCare Pro — Insurance Company Management
   ═══════════════════════════════════════════════════════ */
const InsurancePage = (() => {

  let _companies = [], _policies = [], _claims = [];
  let _doctors   = [], _patients = [];
  let _view      = 'companies';
  let _editingCo = null, _editingPol = null, _editingClaim = null;
  let _filterCo  = '';

  const curr = () => { try { return window._settings?.clinic?.currency||'EGP'; } catch(e){ return 'EGP'; }};
  const fmt  = n  => Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const today= () => new Date().toISOString().split('T')[0];

  const CLAIM_STATUS = {
    pending:   { cls:'badge-urgent',    icon:'⏳', label:'Pending' },
    submitted: { cls:'badge-scheduled', icon:'📤', label:'Submitted' },
    approved:  { cls:'badge-normal',    icon:'✅', label:'Approved' },
    paid:      { cls:'badge-confirmed', icon:'💰', label:'Paid' },
    rejected:  { cls:'badge-emergency', icon:'❌', label:'Rejected' },
  };

  /* ── KPIs ─────────────────────────────────────────── */
  function renderKpis(stats) {
    const el = document.getElementById('insKpis');
    if (!el) return;
    const active   = _companies.filter(c=>c.status==='active').length;
    const policies = _policies.length;
    el.innerHTML = [
      { icon:'🏥', label:'Companies',       val:_companies.length,              c:'var(--accent)' },
      { icon:'✅', label:'Active',           val:active,                         c:'var(--green)' },
      { icon:'📋', label:'Policies',         val:policies,                       c:'var(--teal)' },
      { icon:'📄', label:'Total Claims',     val:stats?.total||0,                c:'var(--orange)' },
      { icon:'⏳', label:'Pending Claims',   val:stats?.pending||0,              c:'var(--yellow)' },
      { icon:'💰', label:'Total Paid',       val:`${curr()} ${fmt(stats?.total_paid||0)}`, c:'var(--pink)' },
    ].map((k,i)=>`
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  /* ── Companies grid ───────────────────────────────── */
  function renderCompanies() {
    const el = document.getElementById('insCoGrid');
    if (!el) return;
    const list = _companies.filter(c =>
      !_filterCo || c.name.toLowerCase().includes(_filterCo.toLowerCase()) ||
      (c.code||'').toLowerCase().includes(_filterCo.toLowerCase())
    );
    if (!list.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div>🏥</div><p>No insurance companies yet</p></div>`;
      return;
    }
    el.innerHTML = list.map((c,i) => {
      const claimsCount = _claims.filter(cl=>cl.company_id===c.id).length;
      const paidAmt     = _claims.filter(cl=>cl.company_id===c.id&&cl.status==='paid')
                                  .reduce((s,cl)=>s+(cl.approved_amount||0),0);
      return `
      <div class="ins-co-card" style="--co-col:${c.logo_color||'#5b6cf9'};--i:${i}">
        <div class="ins-co-card-top">
          <div class="ins-co-avatar" style="background:${c.logo_color||'#5b6cf9'}22;border:2px solid ${c.logo_color||'#5b6cf9'}55;color:${c.logo_color||'#5b6cf9'}">
            ${(c.name||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0">
            <div class="ins-co-name">${c.name}</div>
            ${c.code?`<div class="ins-co-code">${c.code}</div>`:''}
          </div>
          <span class="badge ${c.status==='active'?'badge-confirmed':'badge-completed'}">${c.status}</span>
        </div>

        <div class="ins-co-stats">
          <div class="ins-co-stat">
            <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:${c.logo_color||'var(--accent)'}">${c.total_patients||0}</div>
            <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Patients</div>
          </div>
          <div class="ins-co-stat">
            <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800;color:${c.logo_color||'var(--accent)'}">${claimsCount}</div>
            <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Claims</div>
          </div>
          <div class="ins-co-stat">
            <div style="font-family:'Syne',sans-serif;font-size:1rem;font-weight:800;color:var(--green)">${curr()} ${fmt(paidAmt)}</div>
            <div style="font-size:.68rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Paid Out</div>
          </div>
        </div>

        <div class="ins-co-info">
          ${c.contact_person?`<div class="ins-info-row"><span>👤</span>${c.contact_person}</div>`:''}
          ${c.phone?`<div class="ins-info-row"><span>📞</span>${c.phone}</div>`:''}
          ${c.email?`<div class="ins-info-row"><span>✉️</span>${c.email}</div>`:''}
          ${c.coverage_types?`<div class="ins-info-row"><span>🛡️</span>${c.coverage_types}</div>`:''}
        </div>

        <div class="ins-co-actions">
          <button class="btn-ghost" style="font-size:.75rem;padding:.32rem .8rem" onclick="InsurancePage.viewCompany(${c.id})">📋 Policies &amp; Claims</button>
          <button class="btn-ghost" style="font-size:.75rem;padding:.32rem .8rem" onclick="InsurancePage.editCompany(${c.id})">✏️ Edit</button>
          <button class="action-btn danger" onclick="InsurancePage.delCompany(${c.id})">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  /* ── Policies table ───────────────────────────────── */
  function renderPolicies(coId) {
    const list = coId ? _policies.filter(p=>p.company_id===coId) : _policies;
    const el   = document.getElementById('insPoliciesBody');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<tr><td colspan="8"><div class="empty-state sm"><div>📋</div><p>No policies yet</p></div></td></tr>`;
      return;
    }
    el.innerHTML = list.map(p => {
      const exp    = p.end_date ? new Date(p.end_date) < new Date() : false;
      const status = exp ? 'expired' : p.status;
      const sBadge = status==='active'?'badge-confirmed':status==='expired'?'badge-emergency':'badge-completed';
      return `<tr>
        <td><strong>${p.policy_number}</strong></td>
        <td>${p.patient_name||'<span style="color:var(--text3)">Group/General</span>'}</td>
        <td>${p.company_name}</td>
        <td style="font-weight:700;color:var(--accent)">${p.coverage_percent||0}%</td>
        <td>${p.max_annual_benefit?`${curr()} ${fmt(p.max_annual_benefit)}`:'—'}</td>
        <td>${p.end_date||'—'}</td>
        <td><span class="badge ${sBadge}">${status}</span></td>
        <td style="display:flex;gap:.3rem">
          <button class="action-btn" onclick="InsurancePage.editPolicy(${p.id})">✏️</button>
          <button class="action-btn danger" onclick="InsurancePage.delPolicy(${p.id})">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Claims table ─────────────────────────────────── */
  function renderClaims(coId) {
    const list = coId ? _claims.filter(c=>c.company_id===coId) : _claims;
    const el   = document.getElementById('insClaimsBody');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<tr><td colspan="9"><div class="empty-state sm"><div>📄</div><p>No claims yet</p></div></td></tr>`;
      return;
    }
    el.innerHTML = list.map(c => {
      const st = CLAIM_STATUS[c.status] || CLAIM_STATUS.pending;
      return `<tr>
        <td>${c.treatment_date||'—'}</td>
        <td>${c.patient_name||'—'}</td>
        <td>${c.doctor_name||'—'}</td>
        <td>${c.company_name}</td>
        <td style="font-size:.78rem;max-width:160px;overflow:hidden;text-overflow:ellipsis">${c.service_description||'—'}</td>
        <td style="font-weight:600;color:var(--orange)">${curr()} ${fmt(c.claimed_amount)}</td>
        <td style="font-weight:600;color:var(--green)">${c.approved_amount?`${curr()} ${fmt(c.approved_amount)}`:'—'}</td>
        <td><span class="badge ${st.cls}">${st.icon} ${st.label}</span></td>
        <td style="display:flex;gap:.3rem;flex-wrap:wrap">
          ${Object.entries(CLAIM_STATUS)
            .filter(([s])=>s!==c.status)
            .slice(0,2).map(([s,st2])=>`
            <button class="action-btn" style="font-size:.7rem" onclick="InsurancePage.updateClaimStatus(${c.id},'${s}')">
              ${st2.icon} ${st2.label}
            </button>`).join('')}
          <button class="action-btn" onclick="InsurancePage.editClaim(${c.id})">✏️</button>
          <button class="action-btn danger" onclick="InsurancePage.delClaim(${c.id})">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Switch view ──────────────────────────────────── */
  function switchView(v) {
    _view = v;
    ['companies','policies','claims'].forEach(tab => {
      document.getElementById(`insTab-${tab}`)?.classList.toggle('active', tab===v);
      document.getElementById(`insPane-${tab}`)?.style.setProperty('display', tab===v?'block':'none');
    });
    const btn = document.getElementById('insBtnAdd');
    if (btn) {
      const labels  = { companies:'＋ Add Company', policies:'＋ Add Policy', claims:'＋ New Claim' };
      const actions = { companies:'InsurancePage.openAddCompany()', policies:'InsurancePage.openAddPolicy()', claims:'InsurancePage.openAddClaim()' };
      btn.textContent = labels[v];
      btn.setAttribute('onclick', actions[v]);
    }
  }

  async function loadDropdowns() {
    const [dr, pt, co] = await Promise.all([
      DB.tables.doctors.all(),
      DB.tables.patients.all(),
      DB.tables.insurance_companies.all(),
    ]);
    _doctors  = Array.isArray(dr) ? dr : [];
    _patients = Array.isArray(pt) ? pt : [];
    const coList = Array.isArray(co) ? co : [];

    const fillSel = (id, list, valF, labF, blank='') => {
      const s = document.getElementById(id);
      if (!s) return;
      s.innerHTML = (blank?`<option value="">${blank}</option>`:'')+
        list.map(x=>`<option value="${x[valF]}">${x[labF]}</option>`).join('');
    };
    fillSel('polCompanySel', coList, 'id', 'name', '— Select company —');
    fillSel('polPatientSel', _patients, 'id', 'full_name', '— Group / General —');
    fillSel('claimCompanySel', coList, 'id', 'name', '— Select company —');
    fillSel('claimPatientSel', _patients, 'id', 'full_name', '— Select patient —');
    fillSel('claimDoctorSel',  _doctors,  'id', 'full_name', '— Select doctor —');
    // policies for claim
    const polSel = document.getElementById('claimPolicySel');
    if (polSel) {
      polSel.innerHTML = '<option value="">— Select policy —</option>'+
        _policies.map(p=>`<option value="${p.id}">${p.policy_number} (${p.company_name})</option>`).join('');
    }
  }

  /* ── PUBLIC ───────────────────────────────────────── */
  return {
    async render() {
      try {
        const [co, po, cl, st] = await Promise.all([
          DB.tables.insurance_companies.all(),
          DB.tables.insurance_policies.all(),
          DB.tables.insurance_claims.all(),
          DB.fetch('/insurance/claims/stats'),
        ]);
        _companies = Array.isArray(co) ? co : [];
        _policies  = Array.isArray(po) ? po : [];
        _claims    = Array.isArray(cl) ? cl : [];
        renderKpis(st);
        renderCompanies();
        renderPolicies();
        renderClaims();
        switchView(_view);
      } catch(e) { toast('Failed to load insurance data','error'); }
    },

    switchView,

    filterCompanies() {
      _filterCo = document.getElementById('insCoSearch')?.value||'';
      renderCompanies();
    },

    filterClaims() {
      const q   = (document.getElementById('insClaimSearch')?.value||'').toLowerCase();
      const sta = document.getElementById('insClaimStatusFilter')?.value||'';
      const list = _claims.filter(c =>
        (!q || (c.patient_name||'').toLowerCase().includes(q) ||
               (c.company_name||'').toLowerCase().includes(q) ||
               (c.service_description||'').toLowerCase().includes(q)) &&
        (!sta || c.status===sta)
      );
      const el = document.getElementById('insClaimsBody');
      if (!el) return;
      if (!list.length) { el.innerHTML=`<tr><td colspan="9"><div class="empty-state sm"><div>🔍</div><p>No results</p></div></td></tr>`; return; }
      renderClaims();
    },

    viewCompany(id) {
      _view = 'policies';
      switchView('policies');
      renderPolicies(id);
      renderClaims(id);
    },

    /* Company modal */
    openAddCompany() {
      _editingCo = null;
      ['insCoName','insCoCode','insCoContact','insCoPHone','insCoEmail',
       'insCoAddress','insCoCoverage','insCoNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value='';
      });
      document.getElementById('insCoStatus').value  = 'active';
      document.getElementById('insCoColor').value   = '#5b6cf9';
      document.getElementById('insCoModalTitle').textContent = '🏥 Add Insurance Company';
      document.getElementById('insCoModal').classList.add('open');
    },
    editCompany(id) {
      _editingCo = _companies.find(c=>c.id===id);
      if (!_editingCo) return;
      const m = { insCoName:_editingCo.name, insCoCode:_editingCo.code||'',
        insCoContact:_editingCo.contact_person||'', insCoPHone:_editingCo.phone||'',
        insCoEmail:_editingCo.email||'', insCoAddress:_editingCo.address||'',
        insCoCoverage:_editingCo.coverage_types||'', insCoNotes:_editingCo.notes||'',
        insCoStatus:_editingCo.status||'active', insCoColor:_editingCo.logo_color||'#5b6cf9' };
      Object.entries(m).forEach(([id,val])=>{ const e=document.getElementById(id); if(e) e.value=val; });
      document.getElementById('insCoModalTitle').textContent = '✏️ Edit Insurance Company';
      document.getElementById('insCoModal').classList.add('open');
    },
    closeCoModal() { document.getElementById('insCoModal').classList.remove('open'); },
    async saveCo() {
      const body = {
        name:           document.getElementById('insCoName')?.value.trim(),
        code:           document.getElementById('insCoCode')?.value.trim()||null,
        contact_person: document.getElementById('insCoContact')?.value.trim()||null,
        phone:          document.getElementById('insCoPHone')?.value.trim()||null,
        email:          document.getElementById('insCoEmail')?.value.trim()||null,
        address:        document.getElementById('insCoAddress')?.value.trim()||null,
        coverage_types: document.getElementById('insCoCoverage')?.value.trim()||null,
        notes:          document.getElementById('insCoNotes')?.value.trim()||null,
        status:         document.getElementById('insCoStatus')?.value||'active',
        logo_color:     document.getElementById('insCoColor')?.value||'#5b6cf9',
      };
      if (!body.name) return toast('Company name is required','error');
      try {
        const _coRes=_editingCo ? await DB.tables.insurance_companies.update(_editingCo.id,body) : await DB.tables.insurance_companies.insert(body);
        const res=await fetch(url,{method:_editingCo?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(!res.ok) throw new Error((await res.json()).error);
        toast(_editingCo?'Company updated ✅':'Company added ✅','success');
        this.closeCoModal(); this.render();
      } catch(e){ toast('Error: '+e.message,'error'); }
    },
    async delCompany(id) {
      if (!confirm('Delete this company and all its policies/claims?')) return;
      await DB.tables.insurance_companies.delete(id);
      toast('Deleted','success'); this.render();
    },

    /* Policy modal */
    async openAddPolicy() {
      _editingPol = null;
      await loadDropdowns();
      ['polNumber','polCoverPct','polMaxBenefit','polDeductible','polStartDate',
       'polEndDate','polCoverTypes','polNotes'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
      document.getElementById('polStatus').value = 'active';
      document.getElementById('polStartDate').value = today();
      document.getElementById('insPolModalTitle').textContent = '📋 Add Policy';
      document.getElementById('insPolModal').classList.add('open');
    },
    async editPolicy(id) {
      _editingPol = _policies.find(p=>p.id===id);
      if (!_editingPol) return;
      await loadDropdowns();
      const p = _editingPol;
      const m = { polCompanySel:p.company_id, polPatientSel:p.patient_id||'',
        polNumber:p.policy_number, polCoverPct:p.coverage_percent||'',
        polMaxBenefit:p.max_annual_benefit||'', polDeductible:p.deductible||'',
        polStartDate:p.start_date||'', polEndDate:p.end_date||'',
        polCoverTypes:p.coverage_types||'', polNotes:p.notes||'', polStatus:p.status||'active' };
      Object.entries(m).forEach(([id,val])=>{ const e=document.getElementById(id); if(e) e.value=val; });
      document.getElementById('insPolModalTitle').textContent = '✏️ Edit Policy';
      document.getElementById('insPolModal').classList.add('open');
    },
    closePolModal() { document.getElementById('insPolModal').classList.remove('open'); },
    async savePol() {
      const body = {
        company_id:        document.getElementById('polCompanySel')?.value,
        patient_id:        document.getElementById('polPatientSel')?.value||null,
        policy_number:     document.getElementById('polNumber')?.value.trim(),
        coverage_percent:  document.getElementById('polCoverPct')?.value||0,
        max_annual_benefit:document.getElementById('polMaxBenefit')?.value||null,
        deductible:        document.getElementById('polDeductible')?.value||0,
        start_date:        document.getElementById('polStartDate')?.value||null,
        end_date:          document.getElementById('polEndDate')?.value||null,
        coverage_types:    document.getElementById('polCoverTypes')?.value.trim()||null,
        notes:             document.getElementById('polNotes')?.value.trim()||null,
        status:            document.getElementById('polStatus')?.value||'active',
      };
      if (!body.company_id) return toast('Select a company','error');
      if (!body.policy_number) return toast('Policy number is required','error');
      try {
        const _polRes=_editingPol ? await DB.tables.insurance_policies.update(_editingPol.id,body) : await DB.tables.insurance_policies.insert(body);
        const res=await fetch(url,{method:_editingPol?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(!res.ok) throw new Error((await res.json()).error);
        toast(_editingPol?'Policy updated ✅':'Policy added ✅','success');
        this.closePolModal(); this.render();
      } catch(e){ toast('Error: '+e.message,'error'); }
    },
    async delPolicy(id) {
      if(!confirm('Delete this policy?')) return;
      await DB.tables.insurance_policies.delete(id);
      toast('Deleted','success'); this.render();
    },

    /* Claim modal */
    async openAddClaim() {
      _editingClaim = null;
      await loadDropdowns();
      ['claimDate','claimService','claimAmount','claimApprovedAmt','claimDiag',
       'claimNotes','claimRejectReason'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
      document.getElementById('claimStatus').value = 'pending';
      document.getElementById('claimDate').value   = today();
      document.getElementById('insClaimModalTitle').textContent = '📄 New Insurance Claim';
      document.getElementById('insClaimModal').classList.add('open');
    },
    async editClaim(id) {
      _editingClaim = _claims.find(c=>c.id===id);
      if (!_editingClaim) return;
      await loadDropdowns();
      const c = _editingClaim;
      const m = { claimCompanySel:c.company_id, claimPatientSel:c.patient_id||'',
        claimDoctorSel:c.doctor_id||'', claimPolicySel:c.policy_id||'',
        claimDate:c.treatment_date||'', claimService:c.service_description||'',
        claimAmount:c.claimed_amount||'', claimApprovedAmt:c.approved_amount||'',
        claimDiag:c.diagnosis_code||'', claimStatus:c.status||'pending',
        claimRejectReason:c.rejection_reason||'', claimNotes:c.notes||'' };
      Object.entries(m).forEach(([id,val])=>{ const e=document.getElementById(id); if(e) e.value=val; });
      document.getElementById('insClaimModalTitle').textContent = '✏️ Edit Claim';
      document.getElementById('insClaimModal').classList.add('open');
    },
    closeClaimModal() { document.getElementById('insClaimModal').classList.remove('open'); },
    async saveClaim() {
      const body = {
        company_id:          document.getElementById('claimCompanySel')?.value,
        patient_id:          document.getElementById('claimPatientSel')?.value||null,
        doctor_id:           document.getElementById('claimDoctorSel')?.value||null,
        policy_id:           document.getElementById('claimPolicySel')?.value||null,
        treatment_date:      document.getElementById('claimDate')?.value||null,
        service_description: document.getElementById('claimService')?.value.trim()||null,
        claimed_amount:      document.getElementById('claimAmount')?.value||0,
        approved_amount:     document.getElementById('claimApprovedAmt')?.value||null,
        diagnosis_code:      document.getElementById('claimDiag')?.value.trim()||null,
        status:              document.getElementById('claimStatus')?.value||'pending',
        rejection_reason:    document.getElementById('claimRejectReason')?.value.trim()||null,
        notes:               document.getElementById('claimNotes')?.value.trim()||null,
      };
      if (!body.company_id) return toast('Select a company','error');
      if (!body.claimed_amount) return toast('Claimed amount is required','error');
      try {
        const _claimRes=_editingClaim ? await DB.tables.insurance_claims.update(_editingClaim.id,body) : await DB.tables.insurance_claims.insert(body);
        const res=await fetch(url,{method:_editingClaim?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(!res.ok) throw new Error((await res.json()).error);
        toast(_editingClaim?'Claim updated ✅':'Claim submitted ✅','success');
        this.closeClaimModal(); this.render();
      } catch(e){ toast('Error: '+e.message,'error'); }
    },
    async updateClaimStatus(id, status) {
      try {
        const extra = {};
        if (status==='approved') {
          const c = _claims.find(x=>x.id===id);
          extra.approved_amount = c?.claimed_amount||0;
        }
        await DB.tables.insurance_claims.update(id, { status, ...extra });
        toast(`Claim marked as ${status} ${CLAIM_STATUS[status]?.icon||''}`, 'success');
        this.render();
      } catch(e){ toast('Error','error'); }
    },
    async delClaim(id) {
      if(!confirm('Delete this claim?')) return;
      await DB.tables.insurance_claims.delete(id);
      toast('Deleted','success'); this.render();
    },
  };
})();
