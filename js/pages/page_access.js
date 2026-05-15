/* ═══════════════════════════════════════════════════════
   DentCare Pro — Page Access Control (Settings Tab)
   Admin-only. Reads users + pages config, renders
   a full matrix table with checkboxes per action.
   Saves to pages.json + SQLite via /api/pages
   ═══════════════════════════════════════════════════════ */

const PageAccessPage = {
  _pagesConfig: null,   // { pages:[], actions:[], users:[] }
  _users:       [],     // from DB.tables.users
  _dirty:       {},     // { userId: { pageId: { actionId: bool } } }

  /* ── Called by SettingsPage to inject into its tab ── */
  async render(container) {
    if (!container) return;
    container.innerHTML = `<div class="pax-loading">⏳ Loading page access data…</div>`;

    try {
      [this._pagesConfig, this._users] = await Promise.all([
        DB.pages.getAll(),
        DB.tables.users.all()
      ]);
    } catch(e) {
      container.innerHTML = `<div class="pax-error">Failed to load: ${e.message}</div>`;
      return;
    }

    // Merge saved perms into a fast lookup: _dirty[uid][page][action]
    this._dirty = {};
    for (const saved of (this._pagesConfig.users || [])) {
      this._dirty[saved.userId] = JSON.parse(JSON.stringify(saved.permissions || {}));
    }

    this._renderTable(container);
  },

  _renderTable(container) {
    const pages   = this._pagesConfig.pages   || [];
    const actions = this._pagesConfig.actions || [];
    const users   = this._users;

    // Group pages
    const groups = {};
    for (const pg of pages) {
      if (!groups[pg.group]) groups[pg.group] = [];
      groups[pg.group].push(pg);
    }
    const groupLabels = { main:'Main', clinical:'Clinical', finance:'Finance & Billing', reports:'Reports', admin:'Admin' };

    /* ── Build column headers (User per column) ─────── */
    const userHeaders = users.map(u => `
      <th class="pax-user-th">
        <div class="pax-user-badge role-${u.role}">
          <span class="pax-uavatar">${u.username.charAt(0).toUpperCase()}</span>
          <span class="pax-uname">${u.username}</span>
          <span class="pax-urole">${u.role}</span>
        </div>
      </th>`).join('');

    /* ── Build rows (one per page, sub-rows per action) */
    let rows = '';
    for (const [grpKey, grpPages] of Object.entries(groups)) {
      rows += `<tr class="pax-group-row"><td colspan="${1 + users.length * actions.length}" class="pax-group-label">${groupLabels[grpKey] || grpKey}</td></tr>`;
      for (const pg of grpPages) {
        rows += `<tr class="pax-page-row" data-page="${pg.id}">
          <td class="pax-page-cell">
            <span class="pax-page-icon">${pg.icon}</span>
            <span class="pax-page-name">${pg.label}</span>
          </td>`;
        for (const u of users) {
          const uid   = u.id;
          const perms = (this._dirty[uid] || {})[pg.id] || {};
          rows += `<td class="pax-user-cell">`;
          rows += `<div class="pax-action-grid">`;
          for (const act of actions) {
            const checked = perms[act.id] ? 'checked' : '';
            rows += `<label class="pax-cb-wrap" title="${act.label}">
              <input type="checkbox" class="pax-cb"
                data-uid="${uid}" data-page="${pg.id}" data-action="${act.id}"
                ${checked}
                onchange="PageAccessPage._onChange(this)">
              <span class="pax-cb-label">${act.label.substring(0,3)}</span>
            </label>`;
          }
          rows += `</div></td>`;
        }
        rows += `</tr>`;
      }
    }

    /* ── Action column headers (repeated per user) ──── */
    const actionSubHeaders = users.map(u =>
      `<th class="pax-actions-th" colspan="${actions.length}">
        <div class="pax-action-names">${actions.map(a => `<span>${a.label.substring(0,3)}</span>`).join('')}</div>
        <div class="pax-bulk-btns">
          <button class="pax-bulk-btn" onclick="PageAccessPage._grantAll(${u.id})" title="Grant all">✓ All</button>
          <button class="pax-bulk-btn danger" onclick="PageAccessPage._revokeAll(${u.id})" title="Revoke all">✕ None</button>
        </div>
      </th>`
    ).join('');

    container.innerHTML = `
    <div class="pax-wrap">
      <div class="pax-toolbar">
        <div>
          <h3 class="pax-title">🔐 Page Access Control</h3>
          <p class="pax-subtitle">Set which pages and actions each user can access. Admin always has full access.</p>
        </div>
        <div class="pax-toolbar-btns">
          <button class="btn-icon" onclick="PageAccessPage._save()">💾 Save Access</button>
          <button class="btn-icon" onclick="PageAccessPage._manualBackup()">🗄 Backup Now</button>
        </div>
      </div>
      <div class="pax-table-wrap">
        <table class="pax-table">
          <thead>
            <tr class="pax-header-row1">
              <th class="pax-page-header">Page / Action</th>
              ${userHeaders}
            </tr>
            <tr class="pax-header-row2">
              <th></th>
              ${actionSubHeaders}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <div class="pax-footer">
        <small style="color:var(--text2)">💡 Changes are applied immediately when the user next logs in. Data is auto-backed up every 6 hours.</small>
        <button class="btn-icon accent pax-save-fixed" onclick="PageAccessPage._save()">💾 Save All Changes</button>
      </div>
    </div>`;
  },

  _onChange(cb) {
    const uid    = parseInt(cb.dataset.uid);
    const page   = cb.dataset.page;
    const action = cb.dataset.action;
    if (!this._dirty[uid])        this._dirty[uid]        = {};
    if (!this._dirty[uid][page])  this._dirty[uid][page]  = {};
    this._dirty[uid][page][action] = cb.checked;
  },

  _grantAll(uid) {
    const pages   = this._pagesConfig.pages   || [];
    const actions = this._pagesConfig.actions || [];
    if (!this._dirty[uid]) this._dirty[uid] = {};
    for (const pg of pages) {
      if (!this._dirty[uid][pg.id]) this._dirty[uid][pg.id] = {};
      for (const act of actions) {
        this._dirty[uid][pg.id][act.id] = true;
      }
    }
    // Update DOM checkboxes
    document.querySelectorAll(`.pax-cb[data-uid="${uid}"]`).forEach(cb => cb.checked = true);
    toast(`Granted all access for user #${uid}`, 'info');
  },

  _revokeAll(uid) {
    this._dirty[uid] = {};
    document.querySelectorAll(`.pax-cb[data-uid="${uid}"]`).forEach(cb => cb.checked = false);
    toast(`Revoked all access for user #${uid}`, 'info');
  },

  async _save() {
    const users = this._users.map(u => ({
      userId:      u.id,
      username:    u.username,
      role:        u.role,
      permissions: this._dirty[u.id] || {}
    }));

    try {
      const data = await DB.pages.saveBulk(users);
      if (data.success) {
        toast(`✓ Page access saved for ${data.count} users`, 'success');
        this._pagesConfig.users = users;
      } else {
        toast('Save failed', 'error');
      }
    } catch(e) {
      toast('Save failed: ' + e.message, 'error');
    }
  },

  async _manualBackup() {
    try {
      const d = await DB.pages.backup();
      toast(d.message || 'Backup done (in memory)', 'success');
    } catch(e) {
      toast('Backup failed: ' + e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════
   PageAccessEnforcer — enforces saved permissions on login
   Call: PageAccessEnforcer.apply(session)
   ═══════════════════════════════════════════════════════ */
const PageAccessEnforcer = {
  _permissions: null,  // the loaded pages.json data

  async load() {
    try {
      const data = await DB.pages.getAll();
      this._permissions = data;
    } catch(e) {
      this._permissions = null;
    }
  },

  /**
   * Returns the permission map for a user: { pageId: { actionId: bool } }
   */
  getPerms(userId) {
    if (!this._permissions) return null;
    const entry = (this._permissions.users || []).find(u => u.userId === userId);
    return entry ? entry.permissions : null;
  },

  /**
   * Check if a user can perform an action on a page.
   * Admins always return true.
   */
  can(userId, role, pageId, actionId) {
    if (role === 'admin') return true;
    const perms = this.getPerms(userId);
    if (!perms) return false;  // no saved entry = no access
    return !!(perms[pageId] && perms[pageId][actionId]);
  },

  /**
   * Apply page-level visibility based on saved permissions.
   * Called after login, works alongside _applyRoleRestrictions.
   */
  applyNavVisibility(session) {
    if (!session || session.role === 'admin') return;
    const perms = this.getPerms(session.id);
    if (!perms) return;  // no custom perms, fall through to role defaults

    const pages = this._permissions?.pages || [];
    for (const pg of pages) {
      const el = document.querySelector(`[data-page="${pg.id}"]`);
      if (!el) continue;
      const hasView = perms[pg.id] && perms[pg.id]['view'];
      el.style.display = hasView ? '' : 'none';
    }
  }
};
