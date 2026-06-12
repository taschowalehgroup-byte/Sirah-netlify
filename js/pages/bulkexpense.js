/* ═══════════════════════════════════════════════════════
   DentCare Pro — Bulk Expense  (rebuilt from scratch)
   API target: POST /api/expenses/bulk
   ═══════════════════════════════════════════════════════ */
const BulkExpensePage = (() => {

  /* ── constants ─────────────────────────────────────── */
  const CATS = [
    { label: '🏠 Rent',               value: 'rent' },
    { label: '💡 Utilities',           value: 'utilities' },
    { label: '💊 Supplies',            value: 'supplies' },
    { label: '👥 Salaries',            value: 'salaries' },
    { label: '🔧 Maintenance',         value: 'maintenance' },
    { label: '🧪 Lab Fees',            value: 'lab fees' },
    { label: '📦 Inventory',           value: 'inventory' },
    { label: '📋 Insurance',           value: 'insurance' },
    { label: '📣 Marketing',           value: 'marketing' },
    { label: '💻 Software / IT',       value: 'software' },
    { label: '🚗 Transport',           value: 'transport' },
    { label: '🏥 Medical Equipment',   value: 'equipment' },
    { label: '🧹 Cleaning',            value: 'cleaning' },
    { label: '📞 Communication',       value: 'communication' },
    { label: '🏦 Bank Fees',           value: 'bank fees' },
    { label: '🔑 Miscellaneous',       value: 'miscellaneous' },
  ];

  const PAY_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Credit Card', 'Online', 'Other'];

  /* ── state ─────────────────────────────────────────── */
  let _rows    = [];
  let _history = [];
  let _rowId   = 0;
  let _view    = 'builder';

  /* ── helpers ───────────────────────────────────────── */
  const today   = () => new Date().toISOString().split('T')[0];
  const fmt     = n  => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const curr    = () => { try { return window._settings?.clinic?.currency || 'EGP'; } catch { return 'EGP'; } };
  const catLabel = v => CATS.find(c => c.value === v)?.label || v || '—';
  const toast   = (msg, type = 'success') => {
    if (window.showToast) return window.showToast(msg, type);
    if (window.toast)     return window.toast(msg, type);
    alert(msg);
  };
  const $ = id => document.getElementById(id);

  /* ── KPIs ──────────────────────────────────────────── */
  function renderKpis() {
    const el = $('beKpis');
    if (!el) return;
    const pendingTotal = _rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const catCount     = new Set(_rows.map(r => r.category).filter(Boolean)).size;
    const sessionPaid  = _history.reduce((s, b) => s + b.total, 0);
    el.innerHTML = [
      { icon: '📋', label: 'Pending Items',      val: _rows.length,                              c: 'var(--accent)' },
      { icon: '💰', label: 'Pending Total',       val: `${curr()} ${fmt(pendingTotal)}`,          c: 'var(--orange)' },
      { icon: '📦', label: 'Categories',          val: catCount,                                  c: 'var(--teal)' },
      { icon: '✅', label: 'Batches Submitted',   val: _history.length,                           c: 'var(--green)' },
      { icon: '💸', label: 'Paid This Session',   val: `${curr()} ${fmt(sessionPaid)}`,           c: 'var(--pink)' },
    ].map((k, i) => `
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  /* ── row HTML ──────────────────────────────────────── */
  function rowHtml(row) {
    const catOpts = CATS.map(c =>
      `<option value="${c.value}"${row.category === c.value ? ' selected' : ''}>${c.label}</option>`
    ).join('');
    const pmOpts = PAY_METHODS.map(m =>
      `<option value="${m}"${row.payment_method === m ? ' selected' : ''}>${m}</option>`
    ).join('');
    return `
      <tr class="be-row" data-id="${row.id}">
        <td>
          <input class="be-input" type="text" placeholder="e.g. January Rent"
            value="${row.description || ''}"
            onchange="BulkExpensePage.setField(${row.id},'description',this.value)">
        </td>
        <td>
          <select class="be-select" onchange="BulkExpensePage.setField(${row.id},'category',this.value)">
            <option value="">— Select —</option>${catOpts}
          </select>
        </td>
        <td>
          <input class="be-input be-amount" type="number" placeholder="0.00" min="0" step="0.01"
            value="${row.amount || ''}"
            oninput="BulkExpensePage.setField(${row.id},'amount',this.value)">
        </td>
        <td>
          <input class="be-input" type="date" value="${row.date || today()}"
            onchange="BulkExpensePage.setField(${row.id},'date',this.value)">
        </td>
        <td>
          <select class="be-select" onchange="BulkExpensePage.setField(${row.id},'payment_method',this.value)">
            ${pmOpts}
          </select>
        </td>
        <td>
          <input class="be-input" type="text" placeholder="Optional note…"
            value="${row.notes || ''}"
            onchange="BulkExpensePage.setField(${row.id},'notes',this.value)"
            style="min-width:140px">
        </td>
        <td>
          <button class="action-btn danger" onclick="BulkExpensePage.removeRow(${row.id})" title="Remove">🗑</button>
        </td>
      </tr>`;
  }

  /* ── totals footer ─────────────────────────────────── */
  function refreshTotals() {
    const total = _rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    const elAmt = $('beTotalAmount');
    if (elAmt) elAmt.textContent = `${curr()} ${fmt(total)}`;

    const elCnt = $('beTotalCount');
    if (elCnt) elCnt.textContent = `${_rows.length} item${_rows.length !== 1 ? 's' : ''}`;

    // category breakdown panel
    const bd = $('beBreakdown');
    if (bd) {
      const breakdown = {};
      _rows.forEach(r => {
        if (!r.category) return;
        breakdown[r.category] = (breakdown[r.category] || 0) + (parseFloat(r.amount) || 0);
      });
      const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
      bd.innerHTML = entries.length
        ? entries.map(([cat, amt]) => `
            <div class="be-breakdown-row">
              <span>${catLabel(cat)}</span>
              <span style="font-weight:700;color:var(--accent)">${curr()} ${fmt(amt)}</span>
            </div>`).join('')
        : '<div style="color:var(--text3);font-size:.8rem">No categories yet</div>';
    }

    renderKpis();
  }

  /* ── render builder table ──────────────────────────── */
  function renderBuilder() {
    const tbody = $('beTableBody');
    if (!tbody) return;
    tbody.innerHTML = _rows.length
      ? _rows.map(rowHtml).join('')
      : `<tr><td colspan="7">
           <div class="empty-state sm"><div>💳</div>
           <p>No rows yet. Click <strong>＋ Add Row</strong> to start.</p></div>
         </td></tr>`;
    refreshTotals();
  }

  /* ── render history ────────────────────────────────── */
  function renderHistory() {
    const el = $('beHistory');
    if (!el) return;
    if (!_history.length) {
      el.innerHTML = `<div class="empty-state"><div>📋</div><p>No batches submitted yet this session</p></div>`;
      return;
    }
    el.innerHTML = [..._history].reverse().map((b, i) => `
      <div class="be-batch-card">
        <div class="be-batch-head">
          <div>
            <div class="be-batch-title">Batch #${_history.length - i} — ${b.date}</div>
            <div class="be-batch-sub">${b.items.length} expenses · <strong style="color:var(--green)">${curr()} ${fmt(b.total)}</strong></div>
          </div>
          <span class="badge badge-confirmed">✅ Submitted</span>
        </div>
        <div class="be-batch-items">
          ${b.items.map(it => `
            <div class="be-batch-item">
              <span>${catLabel(it.category)}</span>
              <span style="color:var(--text2);flex:1;padding:0 .5rem">${it.description}</span>
              <span style="color:var(--red);font-weight:600">−${curr()} ${fmt(it.amount)}</span>
            </div>`).join('')}
        </div>
      </div>`).join('');
  }

  /* ── switch tabs ───────────────────────────────────── */
  function switchView(v) {
    _view = v;
    ['builder', 'history'].forEach(tab => {
      $(`beTab-${tab}`)?.classList.toggle('active', tab === v);
      const pane = $(`bePane-${tab}`);
      if (pane) pane.style.display = tab === v ? 'block' : 'none';
    });
    if (v === 'history') renderHistory();
  }

  /* ── PUBLIC API ────────────────────────────────────── */
  return {

    /* called by the page router when this page loads */
    render() {
      _rows = []; _rowId = 0; _history = [];
      this.addRow(); this.addRow(); this.addRow();
      switchView('builder');
    },

    switchView,
    refreshTotals,

    addRow(prefill = {}) {
      _rowId++;
      _rows.push({
        id:             _rowId,
        description:    prefill.description    || '',
        category:       prefill.category       || '',
        amount:         prefill.amount         || '',
        date:           prefill.date           || today(),
        payment_method: prefill.payment_method || 'Cash',
        notes:          prefill.notes          || '',
      });
      renderBuilder();
    },

    removeRow(id) {
      _rows = _rows.filter(r => r.id !== id);
      renderBuilder();
    },

    setField(id, field, value) {
      const row = _rows.find(r => r.id === id);
      if (row) row[field] = value;
      refreshTotals();
    },

    /* legacy alias so any old inline handlers still work */
    updateRow(id, field, value) { this.setField(id, field, value); },

    clearAll() {
      if (_rows.length && !confirm('Clear all rows?')) return;
      _rows = []; _rowId = 0;
      renderBuilder();
    },

    /* prefill from payroll salaries */
    fillFromSalaries() {
      DB.tables.employment.all()
        .then(r => r.json())
        .then(emps => {
          const active = (emps || []).filter(e => e.status === 'active' && e.salary > 0);
          if (!active.length) { toast('No active employees with salaries found', 'error'); return; }
          _rows = []; _rowId = 0;
          active.forEach(e => {
            _rowId++;
            _rows.push({
              id: _rowId,
              description:    `Salary — ${e.employee_name} (${e.role})`,
              category:       'salaries',
              amount:         e.salary || '',
              date:           today(),
              payment_method: 'Bank Transfer',
              notes:          e.department || '',
            });
          });
          renderBuilder();
          toast(`✅ Loaded ${active.length} salary rows`, 'success');
        })
        .catch(() => toast('Could not load employees', 'error'));
    },

    /* prefill from received lab orders */
    fillFromLabOrders() {
      DB.tables.laborders.all().then(l=>l.filter(x=>x.status==='received'))
        .then(r => r.json())
        .then(orders => {
          const unpaid = (orders || []).filter(o => o.cost > 0);
          if (!unpaid.length) { toast('No received lab orders with cost found', 'error'); return; }
          unpaid.forEach(o => {
            _rowId++;
            _rows.push({
              id: _rowId,
              description:    `Lab: ${o.lab_type}${o.patient_name ? ' — ' + o.patient_name : ''}`,
              category:       'lab fees',
              amount:         o.cost || '',
              date:           today(),
              payment_method: 'Bank Transfer',
              notes:          o.supplier_name || '',
            });
          });
          renderBuilder();
          toast(`✅ Loaded ${unpaid.length} lab order rows`, 'success');
        })
        .catch(() => toast('Could not load lab orders', 'error'));
    },

    /* ── submit all valid rows ─────────────────────── */
    async submitAll() {
      const valid   = _rows.filter(r => r.description && parseFloat(r.amount) > 0 && r.date);
      const invalid = _rows.filter(r => !r.description || !(parseFloat(r.amount) > 0) || !r.date);

      if (!valid.length) {
        toast('Add at least one valid expense (description + amount + date)', 'error');
        return;
      }
      if (invalid.length) {
        const ok = confirm(`${invalid.length} incomplete row(s) will be skipped.\nSubmit ${valid.length} valid row(s)?`);
        if (!ok) return;
      }

      const btn = $('beSubmitBtn');
      if (btn) { btn.textContent = '⏳ Submitting…'; btn.disabled = true; }

      try {
        /* build clean payload — only send known-safe fields */
        const payload = valid.map(r => ({
          description:    String(r.description).trim(),
          category:       r.category       || 'miscellaneous',
          amount:         parseFloat(r.amount),
          date:           r.date           || today(),
          payment_method: r.payment_method || 'Cash',
          notes:          r.notes          || null,
        }));

        const inserted = await Promise.all(payload.map(r => DB.tables.transactions.insert({ ...r, type: 'expense' })));
        const data = { inserted: inserted.length };

        const total = payload.reduce((s, r) => s + r.amount, 0);
        _history.push({ date: today(), items: payload, total });

        toast(`✅ ${data.inserted} expense${data.inserted !== 1 ? 's' : ''} saved — ${curr()} ${fmt(total)} total`, 'success');

        _rows = []; _rowId = 0;
        this.addRow(); this.addRow(); this.addRow();
        renderKpis();
        renderBuilder();

      } catch (e) {
        console.error('[BulkExpense] submitAll error:', e);
        toast('Error: ' + e.message, 'error');
      } finally {
        if (btn) { btn.textContent = '✅ Submit All Expenses'; btn.disabled = false; }
      }
    },

    /* download CSV template */
    importTemplate() {
      const csv =
        'Description,Category,Amount,Date,Payment Method,Notes\n' +
        `January Rent,rent,5000,${today()},Bank Transfer,\n` +
        `Electricity Bill,utilities,850,${today()},Cash,\n` +
        `Staff Salary - Ahmed,salaries,4500,${today()},Bank Transfer,\n`;
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'bulk_expense_template.csv';
      a.click();
    },

    /* import from CSV file */
    importCSV(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const lines = e.target.result.split('\n').slice(1).filter(l => l.trim());
        let added = 0;
        lines.forEach(line => {
          const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          const [desc, cat, amt, dt, pm, notes] = parts;
          if (!desc || !amt) return;
          _rowId++;
          _rows.push({
            id:             _rowId,
            description:    desc,
            category:       cat   || 'miscellaneous',
            amount:         parseFloat(amt) || 0,
            date:           dt    || today(),
            payment_method: pm    || 'Cash',
            notes:          notes || '',
          });
          added++;
        });
        renderBuilder();
        toast(`✅ Imported ${added} rows from CSV`, 'success');
      };
      reader.readAsText(file);
    },
  };
})();
