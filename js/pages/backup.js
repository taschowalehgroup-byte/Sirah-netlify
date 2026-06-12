/* ═══════════════════════════════════════════════════════
   DentCare Pro — Backup Page (Static / Netlify Mode)
   Exports all in-memory data as a downloadable JSON file.
   Restore = import a JSON file back into memory.
   ═══════════════════════════════════════════════════════ */

const BackupPage = {

  async render() {
    await Promise.all([this._renderStats(), this._renderList()]);
  },

  async _renderStats() {
    const el = $('backupStats');
    if (!el) return;
    el.innerHTML = `
      <div class="fin-card">
        <div class="fin-label">Mode</div>
        <div style="font-size:.9rem;font-weight:600;color:var(--accent);margin-top:.25rem">Static / In-Memory</div>
        <div style="font-size:.75rem;color:var(--text2)">Data resets on refresh</div>
      </div>
      <div class="fin-card">
        <div class="fin-label">How to Backup</div>
        <div style="font-size:.85rem;color:var(--text);margin-top:.25rem">Click "Export JSON" to download all current session data</div>
      </div>
      <div class="fin-card">
        <div class="fin-label">How to Restore</div>
        <div style="font-size:.85rem;color:var(--text);margin-top:.25rem">Click "Import JSON" and select a backup file</div>
      </div>
    `;
  },

  async _renderList() {
    const body = $('backupBody');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div>☁️</div>
      <p>Running in static mode — backups are JSON file downloads.<br>
      Use the buttons above to export or import data.</p></div></td></tr>`;
  },

  async createNow() {
    const store = DB._store;
    const payload = {
      exported_at: new Date().toISOString(),
      patients: store.patients, appointments: store.appointments,
      treatments: store.treatments, transactions: store.transactions,
      inventory: store.inventory, doctors: store.doctors,
      services: store.services, employment: store.employment,
      discount_codes: store.discount_codes, settings: store.settings,
      users: store.users.map(u => ({ ...u, password: '••••' })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `dentcare-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast('✅ Backup downloaded as JSON', 'success');
  },

  download(name) { this.createNow(); },

  restore(name) {
    toast('Use "Import JSON" below to restore from a backup file', 'info', 4000);
  },

  importBackup() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const store = DB._store;
        const tables = ['patients','appointments','treatments','transactions',
                        'inventory','doctors','services','employment','discount_codes'];
        tables.forEach(t => { if (Array.isArray(data[t])) store[t] = data[t]; });
        if (data.settings) store.settings = data.settings;
        toast('✅ Backup imported! Data restored for this session.', 'success', 5000);
        await this.render();
      } catch(e) { toast('Import failed: ' + e.message, 'error'); }
    };
    document.body.appendChild(input); input.click(); document.body.removeChild(input);
  },

  async delete(name) { toast('Nothing to delete in static mode', 'info'); },

  async _fetch(url, opts = {}) {
    // Stub — all backup ops are in-memory in static mode
    return { count: 0, backups: [] };
  }
};
