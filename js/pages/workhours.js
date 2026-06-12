/* ═══════════════════════════════════════════════════════
   DentCare Pro — Working Hours Tracking
   ═══════════════════════════════════════════════════════ */

const WorkHoursPage = (() => {
  let _employees = [];
  let _logs      = [];
  let _today     = [];
  let _curMonth  = new Date().getMonth() + 1;
  let _curYear   = new Date().getFullYear();
  let _view      = 'dashboard'; // dashboard | logs | summary

  /* ── helpers ─────────────────────────────────── */
  const pad  = n => String(n).padStart(2,'0');
  const fmtH = h => h == null ? '—' : `${Math.floor(h)}h ${Math.round((h%1)*60)}m`;
  const fmtTime = t => t ? t.slice(0,5) : '—';
  const monthName = m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1];

  function statusBadge(row) {
    if (row.status === 'clocked_in')  return `<span class="badge badge-confirmed" style="animation:badgePulse 1s infinite">● Live</span>`;
    if (row.is_overtime)              return `<span class="badge badge-urgent">OT</span>`;
    if (row.is_late)                  return `<span class="badge badge-emergency">Late</span>`;
    return `<span class="badge badge-completed">Done</span>`;
  }

  function hoursBar(h, max=10) {
    const pct = Math.min(100, (h/max)*100);
    const col = h >= 9 ? 'var(--orange)' : h >= 7 ? 'var(--green)' : 'var(--accent)';
    return `<div class="wh-bar-track"><div class="wh-bar-fill" style="width:${pct}%;background:${col}"></div></div>`;
  }

  /* ── render KPIs ──────────────────────────────── */
  function renderKpis() {
    const done      = _logs.filter(l => l.status === 'clocked_out');
    const totalH    = done.reduce((s,l) => s+(l.hours_worked||0), 0);
    const otH       = done.reduce((s,l) => s+(l.overtime_hours||0), 0);
    const lateCount = done.filter(l => l.is_late).length;
    const liveCount = _today.filter(l => l.status === 'clocked_in').length;

    const el = document.getElementById('whKpis');
    if (!el) return;
    el.innerHTML = [
      { icon:'🕐', label:'Total Hours',     val: fmtH(totalH),     c:'var(--accent)' },
      { icon:'⚡', label:'Overtime Hours',   val: fmtH(otH),        c:'var(--orange)' },
      { icon:'⚠️', label:'Late Arrivals',    val: lateCount,        c:'var(--red)' },
      { icon:'🟢', label:'Live Now',         val: liveCount,        c:'var(--green)' },
      { icon:'📅', label:'Days Logged',      val: done.length,      c:'var(--teal)' },
    ].map((k,i) => `
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  /* ── render Today panel ───────────────────────── */
  function renderToday() {
    const el = document.getElementById('whTodayBody');
    if (!el) return;
    if (!_today.length) {
      el.innerHTML = `<tr><td colspan="6"><div class="empty-state sm"><div>🕐</div><p>No one clocked in yet today</p></div></td></tr>`;
      return;
    }
    el.innerHTML = _today.map(r => `
      <tr>
        <td><strong>${r.employee_name}</strong><br><small style="color:var(--text2)">${r.role}</small></td>
        <td><span class="wh-dept-tag">${r.department||'—'}</span></td>
        <td style="color:var(--accent);font-weight:600">${fmtTime(r.clock_in)}</td>
        <td style="color:var(--text2)">${fmtTime(r.clock_out)}</td>
        <td>${r.hours_worked ? fmtH(r.hours_worked) : '<span style="color:var(--green)">Working…</span>'}</td>
        <td>${statusBadge(r)}</td>
      </tr>`).join('');
  }

  /* ── render Logs table ────────────────────────── */
  function renderLogs() {
    const el = document.getElementById('whLogsBody');
    if (!el) return;
    if (!_logs.length) {
      el.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div>📋</div><p>No records for this period</p></div></td></tr>`;
      return;
    }
    el.innerHTML = _logs.map(r => `
      <tr>
        <td><strong>${r.employee_name}</strong><br><small style="color:var(--text2)">${r.role}</small></td>
        <td><span class="wh-dept-tag">${r.department||'—'}</span></td>
        <td style="color:var(--text2)">${r.work_date}</td>
        <td style="color:var(--accent);font-weight:600">${fmtTime(r.clock_in)}</td>
        <td style="color:var(--text2)">${fmtTime(r.clock_out)}</td>
        <td>${r.hours_worked ? fmtH(r.hours_worked) : '—'} ${hoursBar(r.hours_worked||0)}</td>
        <td>${r.overtime_hours > 0 ? `<span style="color:var(--orange)">+${fmtH(r.overtime_hours)}</span>` : '—'}</td>
        <td style="display:flex;gap:.4rem;flex-wrap:wrap">
          ${statusBadge(r)}
          <button class="action-btn danger" onclick="WorkHoursPage.del(${r.id})">🗑</button>
        </td>
      </tr>`).join('');
  }

  /* ── render Summary table ─────────────────────── */
  async function renderSummary() {
    const el = document.getElementById('whSummaryBody');
    if (!el) return;
    try {
      const rows = { summary: [] };
      if (!rows.length) {
        el.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div>📊</div><p>No summary data</p></div></td></tr>`;
        return;
      }
      el.innerHTML = rows.map(r => `
        <tr>
          <td><strong>${r.employee_name}</strong><br><small style="color:var(--text2)">${r.role}</small></td>
          <td><span class="wh-dept-tag">${r.department||'—'}</span></td>
          <td style="font-weight:700;color:var(--accent)">${fmtH(r.total_hours||0)}</td>
          <td style="color:var(--text2)">${r.total_days||0} days</td>
          <td style="color:var(--orange)">${r.overtime_days||0} days / ${fmtH(r.total_overtime||0)}</td>
          <td>${r.late_days > 0 ? `<span style="color:var(--red)">⚠️ ${r.late_days}x</span>` : '<span style="color:var(--green)">✓ None</span>'}</td>
          <td style="color:var(--text2)">${r.last_seen||'—'}</td>
        </tr>`).join('');
    } catch(e) { console.error(e); }
  }

  /* ── populate employee dropdown ───────────────── */
  function populateSel(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">Select employee…</option>` +
      _employees.map(e => `<option value="${e.id}">${e.employee_name} — ${e.role}</option>`).join('');
  }

  /* ── switch view tabs ─────────────────────────── */
  function switchView(v) {
    _view = v;
    ['dashboard','logs','summary'].forEach(tab => {
      const btn  = document.getElementById(`whTab-${tab}`);
      const pane = document.getElementById(`whPane-${tab}`);
      if (btn)  btn.classList.toggle('active', tab === v);
      if (pane) pane.style.display = tab === v ? 'block' : 'none';
    });
    if (v === 'summary') renderSummary();
  }

  /* ── PUBLIC ───────────────────────────────────── */
  return {
    async render() {
      try {
        const now = new Date();
        _curMonth = now.getMonth() + 1;
        _curYear  = now.getFullYear();

        // set month picker
        const mp = document.getElementById('whMonthPick');
        if (mp) mp.value = `${_curYear}-${pad(_curMonth)}`;

        const [empRes, logsRes, todayRes] = await Promise.all([
          DB.tables.employment.all(),
          DB.fetch(`/workhours?month=${_curMonth}&year=${_curYear}`),
          DB.fetch('/workhours/today'),
        ]);
        _employees = Array.isArray(empRes)   ? empRes.filter(e=>e.status==='active') : [];
        _logs      = Array.isArray(logsRes)  ? logsRes  : [];
        _today     = Array.isArray(todayRes) ? todayRes : [];

        renderKpis();
        renderToday();
        renderLogs();
        populateSel('whClockEmpSel');
        populateSel('whManualEmpSel');

        // update period label
        const pl = document.getElementById('whPeriodLabel');
        if (pl) pl.textContent = `${monthName(_curMonth)} ${_curYear}`;

        switchView(_view);
      } catch(e) {
        console.error('WorkHours render error:', e);
        toast('Failed to load work hours', 'error');
      }
    },

    switchView,

    async changeMonth() {
      const mp = document.getElementById('whMonthPick');
      if (!mp || !mp.value) return;
      const [y, m] = mp.value.split('-').map(Number);
      _curYear = y; _curMonth = m;
      const [logsRes] = await Promise.all([
        DB.tables.workhours.all().then(wh=>wh.filter(w=>{ const d=new Date(w.work_date||w.created_at||''); return d.getMonth()===_curMonth-1&&d.getFullYear()===_curYear; }))
      ]);
      _logs = Array.isArray(logsRes) ? logsRes : [];
      renderKpis();
      renderLogs();
      if (_view === 'summary') renderSummary();
      const pl = document.getElementById('whPeriodLabel');
      if (pl) pl.textContent = `${monthName(_curMonth)} ${_curYear}`;
    },

    async clockIn() {
      const empId = document.getElementById('whClockEmpSel')?.value;
      const notes = document.getElementById('whClockNotes')?.value?.trim();
      const shift = document.getElementById('whClockShift')?.value || 'morning';
      if (!empId) return toast('Please select an employee', 'error');
      try {
        const data = await DB.tables.workhours.insert({
          employee_id: empId, notes, shift_type: shift,
          work_date: new Date().toISOString().split('T')[0],
          clock_in: new Date().toTimeString().slice(0,5)
        });
        if (!data) return toast('Clock-in failed', 'error');
        toast(`✅ Clocked in at ${data.clock_in || '--:--'}`, 'success');
        document.getElementById('whClockNotes').value = '';
        this.render();
      } catch(e) { toast('Error: '+e.message, 'error'); }
    },

    async clockOut() {
      const empId = document.getElementById('whClockEmpSel')?.value;
      if (!empId) return toast('Please select an employee', 'error');
      try {
        const _allWh = DB._store.workhours;
        const _openIdx = [..._allWh].reverse().findIndex(w => String(w.employee_id)===String(empId) && !w.clock_out);
        if (_openIdx !== -1) {
          _allWh[_allWh.length - 1 - _openIdx].clock_out = new Date().toTimeString().slice(0,5);
        }
        toast(`✅ Clocked out`, 'success');
        this.render();
      } catch(e) { toast('Error: '+e.message, 'error'); }
    },

    openManual() {
      document.getElementById('whManualDate').value = new Date().toISOString().split('T')[0];
      document.getElementById('whManualIn').value   = '09:00';
      document.getElementById('whManualOut').value  = '17:00';
      document.getElementById('whManualNotes').value = '';
      populateSel('whManualEmpSel');
      document.getElementById('whManualModal').classList.add('open');
    },
    closeManual() { document.getElementById('whManualModal').classList.remove('open'); },

    async submitManual() {
      const empId = document.getElementById('whManualEmpSel')?.value;
      const date  = document.getElementById('whManualDate')?.value;
      const ci    = document.getElementById('whManualIn')?.value;
      const co    = document.getElementById('whManualOut')?.value;
      const notes = document.getElementById('whManualNotes')?.value;
      const shift = document.getElementById('whManualShift')?.value || 'morning';
      if (!empId || !date || !ci || !co) return toast('All fields required', 'error');
      if (ci >= co) return toast('Clock-out must be after clock-in', 'error');
      try {
        const data = await DB.tables.workhours.insert({ employee_id:empId, work_date:date, clock_in:ci+':00', clock_out:co+':00', notes, shift_type:shift });
        if (!data) return toast('Failed', 'error');
        toast('✅ Entry added', 'success');
        this.closeManual();
        this.render();
      } catch(e) { toast('Error: '+e.message, 'error'); }
    },

    async del(id) {
      if (!confirm('Delete this record?')) return;
      await DB.tables.workhours.delete(id);
      toast('Deleted', 'success');
      this.render();
    },

    search(q) {
      const filtered = q
        ? _logs.filter(l => l.employee_name.toLowerCase().includes(q.toLowerCase()) || (l.department||'').toLowerCase().includes(q.toLowerCase()))
        : _logs;
      // re-render logs with filtered set
      const el = document.getElementById('whLogsBody');
      if (!el) return;
      if (!filtered.length) { el.innerHTML = `<tr><td colspan="8"><div class="empty-state sm"><div>🔍</div><p>No results</p></div></td></tr>`; return; }
      el.innerHTML = filtered.map(r => `
        <tr>
          <td><strong>${r.employee_name}</strong><br><small style="color:var(--text2)">${r.role}</small></td>
          <td><span class="wh-dept-tag">${r.department||'—'}</span></td>
          <td style="color:var(--text2)">${r.work_date}</td>
          <td style="color:var(--accent);font-weight:600">${fmtTime(r.clock_in)}</td>
          <td style="color:var(--text2)">${fmtTime(r.clock_out)}</td>
          <td>${r.hours_worked ? fmtH(r.hours_worked) : '—'} ${hoursBar(r.hours_worked||0)}</td>
          <td>${r.overtime_hours > 0 ? `<span style="color:var(--orange)">+${fmtH(r.overtime_hours)}</span>` : '—'}</td>
          <td style="display:flex;gap:.4rem">
            ${statusBadge(r)}
            <button class="action-btn danger" onclick="WorkHoursPage.del(${r.id})">🗑</button>
          </td>
        </tr>`).join('');
    }
  };
})();
