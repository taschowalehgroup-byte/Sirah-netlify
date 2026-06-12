/* ═══════════════════════════════════════════════════════
   DentCare Pro — Lab Order Management
   ═══════════════════════════════════════════════════════ */
const LabOrdersPage = (() => {
  let _all = [], _doctors = [], _patients = [], _suppliers = [];
  let _editing = null;

  const STATUS_FLOW  = ['pending','sent','received','completed','cancelled'];
  const STATUS_BADGE = {
    pending:   'badge-urgent',
    sent:      'badge-scheduled',
    received:  'badge-normal',
    completed: 'badge-confirmed',
    cancelled: 'badge-no-show'
  };
  const STATUS_ICON = { pending:'⏳', sent:'📤', received:'📥', completed:'✅', cancelled:'❌' };
  const LAB_TYPES = ['Crown','Bridge','Denture','Implant Abutment','Veneer','Inlay/Onlay',
                     'Night Guard','Retainer','Bleaching Tray','Model/Study Cast','Other'];
  const PRIORITIES = ['low','normal','urgent','emergency'];
  const PRIORITY_COLOR = { low:'var(--text2)', normal:'var(--accent)', urgent:'var(--orange)', emergency:'var(--red)' };

  function fmt(n) { return n != null ? Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'; }
  function daysLeft(due) {
    if (!due) return '';
    const diff = Math.ceil((new Date(due) - new Date()) / 86400000);
    if (diff < 0) return `<span style="color:var(--red);font-size:.7rem">⚠️ ${Math.abs(diff)}d overdue</span>`;
    if (diff === 0) return `<span style="color:var(--orange);font-size:.7rem">Due today!</span>`;
    return `<span style="color:var(--text3);font-size:.7rem">${diff}d left</span>`;
  }

  function kpiHtml(stats) {
    return [
      {icon:'🧪', label:'Total Orders',    val:stats.total||0,             c:'var(--accent)'},
      {icon:'⏳', label:'Pending',          val:stats.pending||0,           c:'var(--orange)'},
      {icon:'📤', label:'Sent to Lab',      val:stats.sent||0,              c:'var(--teal)'},
      {icon:'📥', label:'Received',         val:stats.received||0,          c:'var(--accent2)'},
      {icon:'💰', label:'Total Cost',       val:fmt(stats.total_cost||0),   c:'var(--green)'},
      {icon:'⏱️', label:'Avg Turnaround',   val:stats.avg_turnaround ? stats.avg_turnaround+'d' : '—', c:'var(--pink)'},
    ].map((k,i)=>`
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  function renderTable(list) {
    const el = document.getElementById('labTableBody');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div>🧪</div><p>No lab orders found</p></div></td></tr>`;
      return;
    }
    el.innerHTML = list.map(o => {
      const priCol = PRIORITY_COLOR[o.priority]||'var(--accent)';
      return `
        <tr>
          <td>
            <div style="font-weight:600;color:var(--text)">${o.lab_type}</div>
            <div style="font-size:.75rem;color:var(--text2)">${o.description||''}</div>
          </td>
          <td>${o.patient_name||'<span style="color:var(--text3)">—</span>'}</td>
          <td>${o.doctor_name||'—'}</td>
          <td>${o.supplier_name||'<span style="color:var(--text3)">—</span>'}</td>
          <td>
            <span style="color:${priCol};font-weight:600;font-size:.75rem;text-transform:uppercase">
              ${STATUS_ICON[o.priority]||''} ${o.priority||'normal'}
            </span>
          </td>
          <td>
            <span class="badge ${STATUS_BADGE[o.status]||'badge-normal'}">
              ${STATUS_ICON[o.status]||''} ${o.status}
            </span>
          </td>
          <td>
            ${o.due_date ? `<div style="font-size:.82rem">${o.due_date}</div>${daysLeft(o.due_date)}` : '—'}
          </td>
          <td style="color:var(--accent);font-weight:600">${o.cost ? fmt(o.cost) : '—'}</td>
          <td>
            <div style="display:flex;gap:.3rem;flex-wrap:wrap">
              ${STATUS_FLOW.filter(s=>s!==o.status&&s!=='cancelled').slice(0,2).map(ns=>`
                <button class="action-btn" onclick="LabOrdersPage.updateStatus(${o.id},'${ns}')" title="Mark as ${ns}" style="font-size:.7rem">
                  ${STATUS_ICON[ns]} ${ns}
                </button>`).join('')}
              <button class="action-btn" onclick="LabOrdersPage.edit(${o.id})">✏️</button>
              <button class="action-btn danger" onclick="LabOrdersPage.del(${o.id})">🗑</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  async function loadDropdowns() {
    const [dr, pt, su] = await Promise.all([
      DB.tables.doctors.all(),
      DB.tables.patients.all(),
      DB.tables.suppliers.all(),
    ]);
    _doctors   = Array.isArray(dr) ? dr : [];
    _patients  = Array.isArray(pt) ? pt : [];
    _suppliers = Array.isArray(su) ? su.filter(s=>s.status==='active') : [];
  }

  function fillModal(o={}) {
    // Lab type select
    const lt = document.getElementById('labType');
    lt.innerHTML = LAB_TYPES.map(t=>`<option value="${t}" ${o.lab_type===t?'selected':''}>${t}</option>`).join('');
    // Doctor select
    const ds = document.getElementById('labDoctor');
    ds.innerHTML = `<option value="">Select doctor…</option>` +
      _doctors.map(d=>`<option value="${d.id}" ${o.doctor_id===d.id?'selected':''}>${d.full_name}</option>`).join('');
    // Patient select
    const ps = document.getElementById('labPatient');
    ps.innerHTML = `<option value="">— No patient linked —</option>` +
      _patients.map(p=>`<option value="${p.id}" ${o.patient_id===p.id?'selected':''}>${p.full_name}</option>`).join('');
    // Supplier select
    const ss = document.getElementById('labSupplier');
    ss.innerHTML = `<option value="">— No supplier —</option>` +
      _suppliers.map(s=>`<option value="${s.id}" ${o.supplier_id===s.id?'selected':''}>${s.name}</option>`).join('');
    // Priority
    document.getElementById('labPriority').innerHTML =
      PRIORITIES.map(p=>`<option value="${p}" ${o.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('');
    // Status
    document.getElementById('labStatus').innerHTML =
      STATUS_FLOW.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${STATUS_ICON[s]} ${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('');
    document.getElementById('labDescription').value = o.description||'';
    document.getElementById('labShade').value        = o.shade||'';
    document.getElementById('labCost').value         = o.cost||'';
    document.getElementById('labDueDate').value      = o.due_date||'';
    document.getElementById('labSentDate').value     = o.sent_date||'';
    document.getElementById('labReceivedDate').value = o.received_date||'';
    document.getElementById('labNotes').value        = o.notes||'';
  }

  return {
    async render() {
      try {
        const [ordRes, statsRes] = await Promise.all([
          DB.tables.laborders.all(),
          DB.fetch('/laborders/stats'),
        ]);
        _all = Array.isArray(ordRes) ? ordRes : [];
        document.getElementById('labKpis').innerHTML = kpiHtml(statsRes||{});
        renderTable(_all);
        // populate status filter
        const sf = document.getElementById('labStatusFilter');
        if (sf && sf.options.length <= 1) {
          STATUS_FLOW.forEach(s => {
            const o = document.createElement('option');
            o.value = s; o.textContent = STATUS_ICON[s]+' '+s.charAt(0).toUpperCase()+s.slice(1);
            sf.appendChild(o);
          });
        }
      } catch(e) { toast('Failed to load lab orders','error'); }
    },

    filter() {
      const q   = (document.getElementById('labSearch')?.value||'').toLowerCase();
      const sta = document.getElementById('labStatusFilter')?.value||'';
      const pri = document.getElementById('labPriorityFilter')?.value||'';
      renderTable(_all.filter(o=>{
        const mq  = !q   || (o.lab_type||'').toLowerCase().includes(q) || (o.patient_name||'').toLowerCase().includes(q) || (o.doctor_name||'').toLowerCase().includes(q);
        const ms  = !sta || o.status===sta;
        const mp  = !pri || o.priority===pri;
        return mq && ms && mp;
      }));
    },

    async openAdd() {
      _editing = null;
      await loadDropdowns();
      fillModal({ priority:'normal', status:'pending' });
      document.getElementById('labModalTitle').textContent = '🧪 New Lab Order';
      document.getElementById('labModal').classList.add('open');
    },

    async edit(id) {
      _editing = _all.find(o=>o.id===id);
      if (!_editing) return;
      await loadDropdowns();
      fillModal(_editing);
      document.getElementById('labModalTitle').textContent = '✏️ Edit Lab Order';
      document.getElementById('labModal').classList.add('open');
    },

    closeModal() { document.getElementById('labModal').classList.remove('open'); },

    async save() {
      const body = {
        patient_id:    document.getElementById('labPatient').value||null,
        doctor_id:     document.getElementById('labDoctor').value,
        supplier_id:   document.getElementById('labSupplier').value||null,
        lab_type:      document.getElementById('labType').value,
        description:   document.getElementById('labDescription').value.trim()||null,
        priority:      document.getElementById('labPriority').value,
        status:        document.getElementById('labStatus').value,
        shade:         document.getElementById('labShade').value.trim()||null,
        cost:          document.getElementById('labCost').value||null,
        due_date:      document.getElementById('labDueDate').value||null,
        sent_date:     document.getElementById('labSentDate').value||null,
        received_date: document.getElementById('labReceivedDate').value||null,
        notes:         document.getElementById('labNotes').value.trim()||null,
      };
      if (!body.doctor_id) return toast('Please select a doctor','error');
      try {
        const result = _editing ? await DB.tables.laborders.update(_editing.id, body) : await DB.tables.laborders.insert(body);
        if (!result) throw new Error('Save failed');
        toast(_editing ? 'Lab order updated ✅' : 'Lab order created ✅','success');
        this.closeModal();
        this.render();
      } catch(e) { toast('Error: '+e.message,'error'); }
    },

    async updateStatus(id, status) {
      try {
        const extra = {};
        if (status === 'sent')     extra.sent_date     = new Date().toISOString().split('T')[0];
        if (status === 'received') extra.received_date = new Date().toISOString().split('T')[0];
        await DB.tables.laborders.update(id, { status, ...extra });
        toast(`Marked as ${status} ${STATUS_ICON[status]}`,'success');
        this.render();
      } catch(e) { toast('Error','error'); }
    },

    async del(id) {
      if (!confirm('Delete this lab order?')) return;
      await DB.tables.laborders.delete(id);
      toast('Deleted','success');
      this.render();
    }
  };
})();
