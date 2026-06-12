/* ═══════════════════════════════════════════════════════
   DentCare Pro — Supplier Management
   ═══════════════════════════════════════════════════════ */
const SuppliersPage = (() => {
  let _all = [];
  let _editing = null;

  const CATS = ['general','dental materials','equipment','lab','pharmaceuticals','consumables','other'];
  const CAT_COLORS = {
    'general':'var(--accent)', 'dental materials':'var(--teal)',
    'equipment':'var(--orange)', 'lab':'var(--pink)',
    'pharmaceuticals':'var(--green)', 'consumables':'var(--accent2)', 'other':'var(--text2)'
  };

  function kpiHtml(data) {
    const active   = data.filter(s=>s.status==='active').length;
    const inactive = data.filter(s=>s.status!=='active').length;
    const cats     = [...new Set(data.map(s=>s.category))].length;
    return [
      {icon:'🏢', label:'Total Suppliers', val:data.length,  c:'var(--accent)'},
      {icon:'✅', label:'Active',          val:active,       c:'var(--green)'},
      {icon:'⏸️', label:'Inactive',        val:inactive,     c:'var(--text2)'},
      {icon:'📦', label:'Categories',      val:cats,         c:'var(--orange)'},
    ].map((k,i)=>`
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  function cardHtml(s, idx=0) {
    const col = CAT_COLORS[s.category] || 'var(--accent)';
    return `
      <div class="sup-card" style="--sup-col:${col};--i:${idx}">
        <div class="sup-card-top">
          <div class="sup-avatar" style="background:${col}22;border:2px solid ${col}44;color:${col}">
            ${(s.name||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1">
            <div class="sup-name">${s.name}</div>
            <div class="sup-contact">${s.contact_person||'—'}</div>
          </div>
          <span class="badge ${s.status==='active'?'badge-confirmed':'badge-completed'}">${s.status}</span>
        </div>
        <div class="sup-cat-badge" style="color:${col};background:${col}18;border-color:${col}33">${s.category||'general'}</div>
        <div class="sup-info-grid">
          ${s.phone ? `<div class="sup-info-item"><span>📞</span>${s.phone}</div>` : ''}
          ${s.email ? `<div class="sup-info-item"><span>✉️</span>${s.email}</div>` : ''}
          ${s.payment_terms ? `<div class="sup-info-item"><span>💳</span>${s.payment_terms}</div>` : ''}
          ${s.address ? `<div class="sup-info-item full"><span>📍</span>${s.address}</div>` : ''}
        </div>
        ${s.notes ? `<div class="sup-notes">${s.notes}</div>` : ''}
        <div class="sup-foot">
          <button class="btn-ghost" style="font-size:.78rem;padding:.35rem .9rem" onclick="SuppliersPage.edit(${s.id})">✏️ Edit</button>
          <button class="action-btn danger" onclick="SuppliersPage.del(${s.id})">🗑 Delete</button>
        </div>
      </div>`;
  }

  function renderGrid(list) {
    const el = document.getElementById('supGrid');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div>🏢</div><p>No suppliers yet. Add the first one!</p></div>`;
      return;
    }
    el.innerHTML = list.map((s, idx) => cardHtml(s, idx)).join('');
  }

  function fillModal(s={}) {
    document.getElementById('supName').value          = s.name||'';
    document.getElementById('supContact').value       = s.contact_person||'';
    document.getElementById('supPhone').value         = s.phone||'';
    document.getElementById('supEmail').value         = s.email||'';
    document.getElementById('supAddress').value       = s.address||'';
    document.getElementById('supPayTerms').value      = s.payment_terms||'';
    document.getElementById('supNotes').value         = s.notes||'';
    document.getElementById('supStatus').value        = s.status||'active';
    const catSel = document.getElementById('supCategory');
    catSel.innerHTML = CATS.map(c=>`<option value="${c}" ${s.category===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('');
  }

  return {
    async render() {
      try {
        _all = await DB.tables.suppliers.all();
        document.getElementById('supKpis').innerHTML = kpiHtml(_all);
        renderGrid(_all);
      } catch(e) { toast('Failed to load suppliers','error'); }
    },

    filter() {
      const q   = (document.getElementById('supSearch')?.value||'').toLowerCase();
      const cat = document.getElementById('supCatFilter')?.value||'';
      const sta = document.getElementById('supStatusFilter')?.value||'';
      renderGrid(_all.filter(s=>{
        const mq  = !q   || s.name.toLowerCase().includes(q) || (s.contact_person||'').toLowerCase().includes(q);
        const mc  = !cat || s.category===cat;
        const ms  = !sta || s.status===sta;
        return mq && mc && ms;
      }));
    },

    openAdd() {
      _editing = null;
      fillModal();
      document.getElementById('supModalTitle').textContent = '🏢 Add Supplier';
      document.getElementById('supModal').classList.add('open');
    },

    edit(id) {
      _editing = _all.find(s=>s.id===id);
      if (!_editing) return;
      fillModal(_editing);
      document.getElementById('supModalTitle').textContent = '✏️ Edit Supplier';
      document.getElementById('supModal').classList.add('open');
    },

    closeModal() { document.getElementById('supModal').classList.remove('open'); },

    async save() {
      const body = {
        name:           document.getElementById('supName').value.trim(),
        contact_person: document.getElementById('supContact').value.trim(),
        phone:          document.getElementById('supPhone').value.trim(),
        email:          document.getElementById('supEmail').value.trim(),
        address:        document.getElementById('supAddress').value.trim(),
        category:       document.getElementById('supCategory').value,
        payment_terms:  document.getElementById('supPayTerms').value.trim(),
        notes:          document.getElementById('supNotes').value.trim(),
        status:         document.getElementById('supStatus').value,
      };
      if (!body.name) return toast('Supplier name is required','error');
      try {
        const result = _editing ? await DB.tables.suppliers.update(_editing.id, body) : await DB.tables.suppliers.insert(body);
        if (!result) throw new Error('Save failed');
        toast(_editing ? 'Supplier updated ✅' : 'Supplier added ✅','success');
        this.closeModal();
        this.render();
      } catch(e) { toast('Error: '+e.message,'error'); }
    },

    async del(id) {
      if (!confirm('Delete this supplier?')) return;
      await DB.tables.suppliers.delete(id);
      toast('Supplier deleted','success');
      this.render();
    }
  };
})();
