/* ═══════════════════════════════════════════════════════
   DentCare Pro — Services Page
   Dental service catalog with pricing.
   Uses document.body modal injection (same pattern as treatments.js)
   ═══════════════════════════════════════════════════════ */

const ServicesPage = {
  _services: [],

  async render() {
    this._services = await DB.tables.services.all();
    this._renderStats();
    this._renderTable(this._services);
  },

  _renderStats() {
    const active   = this._services.filter(s => s.is_active);
    const total    = active.reduce((sum, s) => sum + (s.price || 0), 0);
    const avgPrice = active.length ? total / active.length : 0;
    const cats     = [...new Set(active.map(s => s.category))].length;

    const el = document.getElementById('svcStatsRow');
    if (!el) return;
    el.innerHTML = `
      <div class="svc-stat-card">
        <div class="svc-stat-icon">🦷</div>
        <div class="svc-stat-body">
          <div class="svc-stat-val">${active.length}</div>
          <div class="svc-stat-lbl">Active Services</div>
        </div>
      </div>
      <div class="svc-stat-card">
        <div class="svc-stat-icon">📋</div>
        <div class="svc-stat-body">
          <div class="svc-stat-val">${cats}</div>
          <div class="svc-stat-lbl">Categories</div>
        </div>
      </div>
      <div class="svc-stat-card accent">
        <div class="svc-stat-icon">💰</div>
        <div class="svc-stat-body">
          <div class="svc-stat-val">${fmt(avgPrice)}</div>
          <div class="svc-stat-lbl">Average Price</div>
        </div>
      </div>
      <div class="svc-stat-card">
        <div class="svc-stat-icon">📦</div>
        <div class="svc-stat-body">
          <div class="svc-stat-val">${this._services.filter(s => !s.is_active).length}</div>
          <div class="svc-stat-lbl">Inactive</div>
        </div>
      </div>`;
  },

  _renderTable(rows) {
    const tbody = document.getElementById('svcBody');
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div>🦷</div><p>No services found</p></div></td></tr>`;
      return;
    }
    const catColors = {
      implant: '#b388ff', filling: '#06d6a0', crown: '#ffd166',
      orthodontics: '#00d4ff', extraction: '#ff4466', root_canal: '#ff8c42',
      hygiene: '#5ce1e6', diagnostic: '#7b84a3', cosmetic: '#f72585', other: '#adb5bd'
    };
    tbody.innerHTML = rows.map(s => {
      const color  = catColors[s.category] || catColors.other;
      const active = s.is_active
        ? '<span class="badge badge-confirmed">Active</span>'
        : '<span class="badge badge-cancelled">Inactive</span>';
      const dur = s.duration_min ? `${s.duration_min} min` : '—';
      return `<tr class="svc-row${s.is_active ? '' : ' svc-inactive'}">
        <td><strong>${s.service_name}</strong></td>
        <td><span class="svc-cat-badge" style="--cat-clr:${color}">${s.category}</span></td>
        <td style="color:var(--text2);font-size:.82rem">${s.description || '—'}</td>
        <td class="svc-price-cell"><strong>${fmt(s.price)}</strong></td>
        <td style="color:var(--text2)">${dur}</td>
        <td>${active}</td>
        <td style="color:var(--text3);font-size:.78rem">${s.notes || '—'}</td>
        <td><div class="actions">
          <button class="action-btn" onclick="ServicesPage._editModal(${s.id})">Edit</button>
          <button class="action-btn danger" onclick="ServicesPage._delete(${s.id})">Del</button>
        </div></td>
      </tr>`;
    }).join('');
  },

  search(q) {
    const lq = q.toLowerCase();
    const filtered = this._services.filter(s =>
      (s.service_name || '').toLowerCase().includes(lq) ||
      (s.category || '').toLowerCase().includes(lq) ||
      (s.description || '').toLowerCase().includes(lq)
    );
    this._renderTable(filtered);
  },

  filterCategory(cat) {
    document.querySelectorAll('.svc-filter-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active');
    if (!cat || cat === 'all') return this._renderTable(this._services);
    this._renderTable(this._services.filter(s => s.category === cat));
  },

  /* ── Close modal ── */
  _closeModal() {
    const m = document.getElementById('svcModal');
    if (m) m.remove();
  },

  /* ── Add Modal ── */
  _addModal() {
    this._closeModal(); // remove any previous
    const html = `
    <div id="svcModal" class="modal-overlay open" onclick="if(event.target===this)ServicesPage._closeModal()">
      <div class="modal" style="max-width:520px">
        <div class="modal-head">
          <h3>🦷 Add New Service</h3>
          <button class="close-btn" onclick="ServicesPage._closeModal()">✕</button>
        </div>
        <div class="modal-body">
          ${ServicesPage._formFields()}
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" onclick="ServicesPage._closeModal()">Cancel</button>
          <button class="btn-primary" onclick="ServicesPage._saveNew()">✓ Add Service</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  /* ── Edit Modal ── */
  async _editModal(id) {
    const s = this._services.find(x => x.id === id)
           || await DB.tables.services.find(id);
    if (!s) return;
    this._closeModal();
    const html = `
    <div id="svcModal" class="modal-overlay open" onclick="if(event.target===this)ServicesPage._closeModal()">
      <div class="modal" style="max-width:520px">
        <div class="modal-head">
          <h3>✏️ Edit Service</h3>
          <button class="close-btn" onclick="ServicesPage._closeModal()">✕</button>
        </div>
        <div class="modal-body">
          ${ServicesPage._formFields(s)}
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" onclick="ServicesPage._closeModal()">Cancel</button>
          <button class="btn-primary" onclick="ServicesPage._saveEdit(${id})">✓ Update Service</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  _formFields(s = {}) {
    const cats = ['implant','filling','crown','orthodontics','extraction','root_canal','hygiene','diagnostic','cosmetic','other'];
    const catOpts = cats.map(c =>
      `<option value="${c}" ${s.category === c ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</option>`
    ).join('');
    return `
    <div class="form-grid-2">
      <div class="form-group" style="grid-column:1/-1">
        <label>Service Name *</label>
        <input id="svc_name" type="text" class="form-control"
               value="${(s.service_name || '').replace(/"/g, '&quot;')}"
               placeholder="e.g. General Implant Filling">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="svc_cat" class="form-control">${catOpts}</select>
      </div>
      <div class="form-group">
        <label>Price (EGP) *</label>
        <input id="svc_price" type="number" min="0" step="0.01" class="form-control"
               value="${s.price || 0}" placeholder="0.00">
      </div>
      <div class="form-group">
        <label>Duration (minutes)</label>
        <input id="svc_dur" type="number" min="0" class="form-control"
               value="${s.duration_min || 30}" placeholder="30">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="svc_active" class="form-control">
          <option value="1" ${(s.is_active === undefined || s.is_active) ? 'selected' : ''}>Active</option>
          <option value="0" ${s.is_active === 0 ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>Description</label>
        <input id="svc_desc" type="text" class="form-control"
               value="${(s.description || '').replace(/"/g, '&quot;')}"
               placeholder="Brief service description">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>Notes</label>
        <textarea id="svc_notes" class="form-control" rows="2"
                  placeholder="Internal notes…">${s.notes || ''}</textarea>
      </div>
    </div>`;
  },

  async _saveNew() {
    const name  = document.getElementById('svc_name')?.value.trim();
    const price = parseFloat(document.getElementById('svc_price')?.value) || 0;
    if (!name) { toast('Service name is required', 'error'); return; }
    try {
      await DB.tables.services.insert({
        service_name: name,
        category:     document.getElementById('svc_cat')?.value,
        price,
        duration_min: parseInt(document.getElementById('svc_dur')?.value) || 30,
        is_active:    parseInt(document.getElementById('svc_active')?.value),
        description:  document.getElementById('svc_desc')?.value.trim(),
        notes:        document.getElementById('svc_notes')?.value.trim()
      });
      this._closeModal();
      toast(`Service "${name}" added!`, 'success');
      await this.render();
    } catch(e) { toast('Failed to add service: ' + e.message, 'error'); }
  },

  async _saveEdit(id) {
    const name  = document.getElementById('svc_name')?.value.trim();
    const price = parseFloat(document.getElementById('svc_price')?.value) || 0;
    if (!name) { toast('Service name is required', 'error'); return; }
    try {
      await DB.tables.services.update(id, {
        service_name: name,
        category:     document.getElementById('svc_cat')?.value,
        price,
        duration_min: parseInt(document.getElementById('svc_dur')?.value) || 30,
        is_active:    parseInt(document.getElementById('svc_active')?.value),
        description:  document.getElementById('svc_desc')?.value.trim(),
        notes:        document.getElementById('svc_notes')?.value.trim()
      });
      this._closeModal();
      toast('Service updated!', 'success');
      await this.render();
    } catch(e) { toast('Failed to update service: ' + e.message, 'error'); }
  },

  async _delete(id) {
    const s = this._services.find(x => x.id === id);
    if (!confirm(`Delete service "${s?.service_name}"? This cannot be undone.`)) return;
    try {
      await DB.tables.services.delete(id);
      toast('Service deleted', 'info');
      await this.render();
    } catch(e) { toast('Failed to delete: ' + e.message, 'error'); }
  },

  exportExcel() { DB.tables.services.all().then(rows => UI.exportExcel(rows, 'services')); },
  exportJson()  { DB.tables.services.all().then(rows => UI.exportJson(rows, 'services')); },
  importFile() {
    UI.importFile(async rows => {
      const res = await DB.tables.services.bulk(rows);
      toast(`Imported ${res.inserted} services`, 'success');
      this.render();
    });
  },

  /* ── Price Calculator ── */
  async openCalculator() {
    const services = await DB.tables.services.all();
    const active   = services.filter(s => s.is_active);
    const opts     = active.map(s =>
      `<option value="${s.price}" data-name="${(s.service_name||'').replace(/"/g,'&quot;')}">${s.service_name} — ${fmt(s.price)}</option>`
    ).join('');

    // Remove old calculator if open
    const old = document.getElementById('svcCalcModal');
    if (old) old.remove();

    const html = `
    <div id="svcCalcModal" class="modal-overlay open" onclick="if(event.target===this)document.getElementById('svcCalcModal').remove()">
      <div class="modal" style="max-width:480px">
        <div class="modal-head">
          <h3>💰 Service Price Calculator</h3>
          <button class="close-btn" onclick="document.getElementById('svcCalcModal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text2);font-size:.85rem;margin-bottom:1rem">
            Select services to calculate the total treatment cost.
          </p>
          <div class="form-group">
            <label>Add Service</label>
            <div style="display:flex;gap:.5rem">
              <select id="calcSvcSel" class="form-control" style="flex:1">
                <option value="">— Select a service —</option>
                ${opts}
              </select>
              <button class="btn-icon" onclick="ServicesPage._calcAdd()">+ Add</button>
            </div>
          </div>
          <div id="calcItems" class="svc-calc-items"></div>
          <div class="svc-calc-total">
            <span>Total:</span>
            <span id="calcTotal" class="svc-calc-total-val">0.00 EGP</span>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" onclick="ServicesPage._calcClear()">🗑 Clear</button>
          <button class="btn-primary" onclick="document.getElementById('svcCalcModal').remove()">✓ Done</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    ServicesPage._calcItems = [];
    ServicesPage._calcRefresh();
  },

  _calcItems: [],

  _calcAdd() {
    const sel   = document.getElementById('calcSvcSel');
    const price = parseFloat(sel?.value);
    const name  = sel?.options[sel.selectedIndex]?.dataset?.name;
    if (!price || !name) return;
    this._calcItems.push({ name, price });
    this._calcRefresh();
  },

  _calcRemove(i) {
    this._calcItems.splice(i, 1);
    this._calcRefresh();
  },

  _calcClear() {
    this._calcItems = [];
    this._calcRefresh();
  },

  _calcRefresh() {
    const container = document.getElementById('calcItems');
    const totalEl   = document.getElementById('calcTotal');
    if (!container) return;
    container.innerHTML = this._calcItems.length
      ? this._calcItems.map((item, i) => `
          <div class="svc-calc-item">
            <span>${item.name}</span>
            <span>${fmt(item.price)}</span>
            <button class="svc-calc-remove" onclick="ServicesPage._calcRemove(${i})">✕</button>
          </div>`).join('')
      : '<div style="color:var(--text3);font-size:.83rem;text-align:center;padding:.75rem 0">No services added yet</div>';
    const total = this._calcItems.reduce((sum, i) => sum + i.price, 0);
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} EGP`;
  }
};
