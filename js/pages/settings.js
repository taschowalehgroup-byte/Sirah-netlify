/* ═══════════════════════════════════════════════════════
   DentCare Pro — Settings Page (v2)
   • Clinic info + logo saved to settings.json
   • Doctor photos saved to settings.json doctors[]
   • Accent color applied live
   ═══════════════════════════════════════════════════════ */

const SettingsPage = {
  _settings: null,
  _doctors:  [],

  async render() {
    try {
      [this._settings, this._doctors] = await Promise.all([
        DB.settings.get(),
        DB.tables.doctors.all()
      ]);
    } catch(e) {
      this._settings = {};
      this._doctors  = [];
    }
    this._renderForm();
    // Default to general tab; hide page-access tab for non-admins
    this.switchTab('general');
    const session = DB.auth.current();
    const isAdmin = session?.role === 'admin';
    document.querySelectorAll('.settings-tab.admin-only').forEach(el => {
      el.style.display = isAdmin ? '' : 'none';
    });
  },

  _renderForm() {
    const s   = this._settings  || {};
    const c   = s.clinic        || {};
    const a   = s.appearance    || {};
    const n   = s.notifications || {};
    const sys = s.system        || {};
    const savedPhotos = s.doctors || [];     // [{id, photo}]
    const photoMap = Object.fromEntries(savedPhotos.map(d => [d.id, d.photo]));

    const wrap = $('settingsWrap');
    if (!wrap) return;

    /* ── Doctor photo cards ─────────────────────── */
    const doctorCards = this._doctors.map(d => {
      const photo = photoMap[d.id] || '';
      return `
        <div class="dr-photo-card">
          <div class="dr-photo-frame" onclick="document.getElementById('drPhotoInp_${d.id}').click()">
            ${photo
              ? `<img src="${photo}" alt="${d.full_name}">`
              : `<div class="dr-photo-placeholder">📷<br><small>Click to upload</small></div>`}
            <div class="dr-photo-overlay">Change Photo</div>
          </div>
          <input type="file" id="drPhotoInp_${d.id}" accept="image/*" style="display:none"
                 onchange="SettingsPage._previewDrPhoto(${d.id}, this)">
          <div class="dr-photo-name">${d.full_name}</div>
          <div class="dr-photo-spec">${d.specialty}</div>
          ${photo ? `<button class="dr-photo-remove" onclick="SettingsPage._removeDrPhoto(${d.id})">✕ Remove</button>` : ''}
        </div>`;
    }).join('');

    wrap.innerHTML = `
    <div class="settings-grid">

      <!-- ① Clinic Info -->
      <div class="card settings-card" style="grid-column:span 2">
        <div class="card-head"><h3>🏥 Clinic Information</h3></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding-top:.5rem">

          <!-- Logo Upload -->
          <div style="grid-column:span 2;display:flex;align-items:center;gap:1.5rem">
            <div id="logoPreview" class="logo-preview-box" onclick="document.getElementById('logoFileInp').click()">
              ${c.logo
                ? `<img id="logoImg" src="${c.logo}" style="max-width:120px;max-height:80px;object-fit:contain">`
                : `<div style="text-align:center;color:var(--text2)">🏥<br><small>Upload clinic logo</small></div>`}
              <div class="dr-photo-overlay">Change</div>
            </div>
            <input type="file" id="logoFileInp" accept="image/*" style="display:none" onchange="SettingsPage._previewLogo(this)">
            <div>
              <div style="font-weight:600;color:var(--text);margin-bottom:.3rem" id="clinicNameDisplay">${c.name||'DentCare Pro'}</div>
              <small style="color:var(--text2)">The clinic name is shown throughout the app and saved to settings.json</small>
            </div>
          </div>

          <div class="form-group">
            <label>Clinic Name *</label>
            <input type="text" id="sClinicName" value="${c.name||'DentCare Pro'}"
                   oninput="document.getElementById('clinicNameDisplay').textContent=this.value||'DentCare Pro'">
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" id="sAddress" value="${c.address||''}" placeholder="Full address">
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" id="sPhone" value="${c.phone||''}" placeholder="+20 ...">
          </div>
          <div class="form-group">
            <label>WhatsApp Sender Number <span style="color:var(--accent);font-size:.75rem">for reminders</span></label>
            <input type="text" id="sWhatsApp" value="${c.whatsapp||''}" placeholder="+20 10XXXXXXXX">
            <small style="color:var(--text2);font-size:.72rem">Patients receive reminders from this number via WhatsApp 2h before their appointment</small>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="sEmail" value="${c.email||''}" placeholder="clinic@email.com">
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="sCurrency">
              ${['EGP','USD','EUR','SAR','AED'].map(cur=>`<option ${(c.currency||'EGP')===cur?'selected':''}>${cur}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Timezone</label>
            <select id="sTimezone">
              ${['Africa/Cairo','UTC','Europe/London','America/New_York','Asia/Dubai'].map(tz=>`<option ${(c.timezone||'Africa/Cairo')===tz?'selected':''}>${tz}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- ② Appearance -->
      <div class="card settings-card">
        <div class="card-head"><h3>🎨 Appearance</h3></div>
        <div class="settings-fields">
          <div class="form-group">
            <label>Theme</label>
            <select id="sTheme">
              <option value="dark"  ${(a.theme||'dark')==='dark'?'selected':''}>Dark</option>
              <option value="light" ${a.theme==='light'?'selected':''}>Light</option>
            </select>
          </div>
          <div class="form-group">
            <label>Accent Color</label>
            <input type="color" id="sAccent" value="${a.accentColor||'#00d4ff'}"
                   style="height:38px;padding:2px 4px;cursor:pointer"
                   oninput="document.documentElement.style.setProperty('--accent',this.value)">
          </div>
          <div class="form-group">
            <label>Language</label>
            <select id="sLang">
              <option value="en" ${(a.language||'en')==='en'?'selected':''}>English</option>
              <option value="ar" ${a.language==='ar'?'selected':''}>Arabic</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date Format</label>
            <select id="sDateFmt">
              ${['YYYY-MM-DD','DD/MM/YYYY','MM/DD/YYYY'].map(f=>`<option ${(a.dateFormat||'YYYY-MM-DD')===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Time Format</label>
            <select id="sTimeFmt">
              <option value="24h" ${(a.timeFormat||'24h')==='24h'?'selected':''}>24h</option>
              <option value="12h" ${a.timeFormat==='12h'?'selected':''}>12h (AM/PM)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ③ Notifications + System -->
      <div class="card settings-card">
        <div class="card-head"><h3>🔔 Notifications</h3></div>
        <div class="settings-fields">
          ${this._toggle('sApptRemind','Appointment Reminders', n.appointmentReminders!==false)}
          ${this._toggle('sLowStock',  'Low Stock Alerts',      n.lowStockAlerts!==false)}
          ${this._toggle('sPwReq',     'Password Requests',     n.passwordRequests!==false)}
        </div>
        <div class="card-head" style="margin-top:1.2rem"><h3>⚙️ System</h3></div>
        <div class="settings-fields">
          ${this._toggle('sAutoBackup','Auto-Backup to JSON', sys.autoBackup!==false)}
          <div class="form-group">
            <label>Backup Format</label>
            <select id="sBackupFmt">
              <option value="json"  ${(sys.backupFormat||'json')==='json'?'selected':''}>JSON</option>
              <option value="excel" ${sys.backupFormat==='excel'?'selected':''}>Excel (.xlsx)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Session Timeout (minutes)</label>
            <input type="number" id="sSession" min="5" max="480" value="${sys.sessionTimeout||60}">
          </div>
          <div class="form-group">
            <label>Manual Backup</label>
            <button class="btn-icon" onclick="SettingsPage._manualBackup()" style="width:100%">⬇ Download Full Backup</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ④ Doctor Photos -->
    <div class="card" style="margin-top:1rem">
      <div class="card-head"><h3>👨‍⚕️ Doctor Photos</h3><small style="color:var(--text2)">Photos are saved to settings.json</small></div>
      <div class="dr-photos-grid">
        ${doctorCards || '<p style="color:var(--text2);padding:.5rem">No doctors found. Add doctors first.</p>'}
      </div>
    </div>

    <!-- Action Bar -->
    <div class="settings-actions" style="margin-top:1rem">
      <button class="btn-icon danger" onclick="SettingsPage._reset()">↺ Reset Defaults</button>
      <button class="btn-icon accent" onclick="SettingsPage._save()">💾 Save All Settings</button>
    </div>

    <!-- ── Danger Zone ── -->
    <div class="danger-zone-card" style="margin-top:2rem">
      <div class="dz-header">
        <span class="dz-icon">☠️</span>
        <div>
          <div class="dz-title">Danger Zone</div>
          <div class="dz-sub">These actions are irreversible. Proceed with extreme caution.</div>
        </div>
      </div>
      <div class="dz-body">
        <div class="dz-row">
          <div>
            <div class="dz-action-title">💀 Kill The System</div>
            <div class="dz-action-desc">Permanently deletes ALL clinic data — patients, appointments, treatments, finance records, doctors, inventory, feedback, work hours and resets all settings to factory defaults. This cannot be undone.</div>
          </div>
          <button class="dz-kill-btn" onclick="SettingsPage._killSystem()">☠ Kill The System</button>
        </div>
      </div>
    </div>`;

    // Store pending photo changes in memory
    this._pendingPhotos = { ...photoMap };
    this._pendingLogo   = c.logo || '';
  },

  _pendingPhotos: {},
  _pendingLogo:   '',

  _previewLogo(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this._pendingLogo = e.target.result;
      const box = $('logoPreview');
      box.innerHTML = `<img src="${e.target.result}" style="max-width:120px;max-height:80px;object-fit:contain"><div class="dr-photo-overlay">Change</div>`;
    };
    reader.readAsDataURL(input.files[0]);
  },

  _previewDrPhoto(doctorId, input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this._pendingPhotos[doctorId] = e.target.result;
      const frame = input.previousElementSibling;  // .dr-photo-frame
      frame.innerHTML = `<img src="${e.target.result}" alt="Doctor"><div class="dr-photo-overlay">Change Photo</div>`;
      // Show remove button
      const removeBtn = input.nextElementSibling?.nextElementSibling;
      if (removeBtn && removeBtn.classList.contains('dr-photo-remove')) {
        removeBtn.style.display = '';
      } else {
        const card = input.closest('.dr-photo-card');
        if (card && !card.querySelector('.dr-photo-remove')) {
          const btn = document.createElement('button');
          btn.className = 'dr-photo-remove';
          btn.textContent = '✕ Remove';
          btn.onclick = () => SettingsPage._removeDrPhoto(doctorId);
          card.appendChild(btn);
        }
      }
      toast('Photo ready — click Save to apply', 'info');
    };
    reader.readAsDataURL(input.files[0]);
  },

  _removeDrPhoto(doctorId) {
    this._pendingPhotos[doctorId] = '';
    const frame = document.querySelector(`#drPhotoInp_${doctorId}`)?.previousElementSibling;
    if (frame) {
      frame.innerHTML = `<div class="dr-photo-placeholder">📷<br><small>Click to upload</small></div><div class="dr-photo-overlay">Change Photo</div>`;
    }
    const btn = document.querySelector(`#drPhotoInp_${doctorId}`)?.nextElementSibling?.nextElementSibling;
    if (btn) btn.remove();
  },

  _toggle(id, label, checked) {
    return `
      <div class="settings-toggle">
        <span>${label}</span>
        <label class="toggle-switch">
          <input type="checkbox" id="${id}" ${checked?'checked':''}>
          <span class="toggle-slider"></span>
        </label>
      </div>`;
  },

  async _save() {
    const clinicName = $('sClinicName')?.value.trim() || 'DentCare Pro';

    const data = {
      clinic: {
        name:     clinicName,
        address:  $('sAddress')?.value  || '',
        phone:    $('sPhone')?.value    || '',
        whatsapp: $('sWhatsApp')?.value || '',
        email:    $('sEmail')?.value    || '',
        logo:     this._pendingLogo,
        currency: $('sCurrency')?.value || 'EGP',
        timezone: $('sTimezone')?.value || 'Africa/Cairo'
      },
      appearance: {
        theme:       $('sTheme')?.value   || 'dark',
        accentColor: $('sAccent')?.value  || '#00d4ff',
        language:    $('sLang')?.value    || 'en',
        dateFormat:  $('sDateFmt')?.value || 'YYYY-MM-DD',
        timeFormat:  $('sTimeFmt')?.value || '24h'
      },
      notifications: {
        appointmentReminders: $('sApptRemind')?.checked ?? true,
        lowStockAlerts:       $('sLowStock')?.checked   ?? true,
        passwordRequests:     $('sPwReq')?.checked      ?? true
      },
      system: {
        autoBackup:     $('sAutoBackup')?.checked ?? true,
        backupFormat:   $('sBackupFmt')?.value    || 'json',
        sessionTimeout: parseInt($('sSession')?.value) || 60
      },
      // Save all doctor photos as [{id, photo}]
      doctors: Object.entries(this._pendingPhotos)
        .map(([id, photo]) => ({ id: parseInt(id), photo }))
        .filter(d => d.photo)
    };

    try {
      this._settings = await DB.settings.save(data);
      // Apply branding everywhere (name + logo) live
      if (typeof App !== 'undefined') App.applyBranding(data.clinic);
      // Apply accent
      document.documentElement.style.setProperty('--accent', data.appearance.accentColor);
      // Apply theme
      if (typeof Theme !== 'undefined') Theme.apply(data.appearance.theme || 'dark');
      toast('Settings saved to settings.json ✓', 'success');
    } catch(e) {
      toast('Failed to save: ' + e.message, 'error');
    }
  },

  async _reset() {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      this._settings = await DB.settings.reset();
      this._pendingPhotos = {};
      this._pendingLogo   = '';
      this._renderForm();
      toast('Settings reset to defaults', 'info');
    } catch(e) {
      toast('Reset failed: ' + e.message, 'error');
    }
  },

  async _manualBackup() {
    try {
      const [patients, doctors, appointments, treatments, transactions, inventory] = await Promise.all([
        DB.tables.patients.all(), DB.tables.doctors.all(),
        DB.tables.appointments.all(), DB.tables.treatments.all(),
        DB.tables.transactions.all(), DB.tables.inventory.all()
      ]);
      const backup = {
        _meta: { app: 'DentCare Pro', exported: new Date().toISOString() },
        patients, doctors, appointments, treatments, transactions, inventory
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dentcare_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast('Full backup downloaded', 'success');
    } catch(e) { toast('Backup failed: ' + e.message, 'error'); }
  },

  /* ── Tab switching (General / Page Access) ─────────────────── */
  switchTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    if (tab === 'general') {
      $('settingsWrap')?.classList.add('active');
    } else if (tab === 'page-access') {
      const pane = $('settingsPageAccess');
      if (pane) {
        pane.classList.add('active');
        if (!pane.innerHTML.trim()) {
          PageAccessPage.render(pane);
        }
      }
    }
  },

  /* ── Kill System ────────────────────────────────────────────── */
  _killSystem() {
    // Build and inject modal if not already there
    if (!document.getElementById('killModal')) {
      const m = document.createElement('div');
      m.id = 'killModal';
      m.className = 'modal-overlay';
      m.innerHTML = `
        <div class="modal modal-sm" style="border-top:4px solid var(--red)">
          <div class="modal-head">
            <h3 style="color:var(--red)">☠️ Kill The System</h3>
            <button class="close-btn" onclick="document.getElementById('killModal').classList.remove('open')">✕</button>
          </div>
          <div class="modal-body">
            <div class="kill-warning-box">
              <div class="kill-warning-icon">⚠️</div>
              <div class="kill-warning-text">
                <strong>This will permanently delete:</strong>
                <ul class="kill-list">
                  <li>All patients &amp; their medical records</li>
                  <li>All appointments &amp; treatments</li>
                  <li>All finance &amp; transaction records</li>
                  <li>All doctors &amp; staff data</li>
                  <li>All inventory, feedback &amp; work hours</li>
                  <li>All settings reset to factory defaults</li>
                </ul>
                <strong style="color:var(--red)">This action CANNOT be undone.</strong>
              </div>
            </div>
            <div class="form-group" style="margin-top:1.25rem">
              <label style="color:var(--red)">Type <strong>KILL THE SYSTEM</strong> to confirm</label>
              <input type="text" id="killConfirmInput" placeholder="KILL THE SYSTEM" autocomplete="off"
                style="border-color:rgba(240,92,110,0.45);letter-spacing:.05em"
                oninput="document.getElementById('killConfirmBtn').disabled = this.value !== 'KILL THE SYSTEM'">
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn-ghost" onclick="document.getElementById('killModal').classList.remove('open')">Cancel</button>
            <button id="killConfirmBtn" class="dz-kill-btn" disabled onclick="SettingsPage._executeKill()">
              ☠ Confirm — Kill Everything
            </button>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    document.getElementById('killConfirmInput').value = '';
    document.getElementById('killConfirmBtn').disabled = true;
    document.getElementById('killModal').classList.add('open');
  },

  async _executeKill() {
    const btn = document.getElementById('killConfirmBtn');
    btn.textContent = '⏳ Destroying…';
    btn.disabled = true;
    try {
      // Static mode: wipe all in-memory tables
      const _s = DB._store;
      Object.keys(_s).forEach(k => { if (Array.isArray(_s[k])) _s[k] = []; });
      const data = { success: true };
      document.getElementById('killModal').classList.remove('open');
      // ── eDEX-UI destruction sequence ──
      const overlay = document.createElement('div');
      overlay.id = 'killOverlay';
      overlay.innerHTML = `
        <canvas id="killMatrix"></canvas>
        <div id="killHex"></div>
        <div id="killScanline"></div>
        <div id="killHudTL">SYS::TERMINATE<br>VER 4.7.1<br><span id="killClock">00:00:00</span></div>
        <div id="killHudTR">DENT CARE PRO<br>NODE::ALPHA<br>STATUS::PURGING</div>
        <div id="killHudBL">CPU: <span id="killCpu">0</span>%</div>
        <div id="killHudBR">MEM: <span id="killMem">0</span>MB</div>
        <div id="killTerminal"></div>
        <div id="killLogoWrap">
          <div id="killLogoBox">
            <div class="kl-corner kl-tl"></div>
            <div class="kl-corner kl-tr"></div>
            <div class="kl-corner kl-bl"></div>
            <div class="kl-corner kl-br"></div>
            <div id="killLogoText">SYSTEM DESTROYED</div>
          </div>
          <div id="killLogoSub">ALL DATA PERMANENTLY WIPED — RESTARTING</div>
          <div id="killProgressWrap">
            <div id="killProgressLabel"><span>PURGING DATABASE</span><span id="killPct">0%</span></div>
            <div id="killProgressTrack"><div id="killProgressFill"></div></div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('active'));
      _runKillSequence();
      setTimeout(() => { window.location.reload(); }, 9000);
    } catch(e) {
      btn.textContent = '☠ Confirm — Kill Everything';
      btn.disabled = false;
      toast('Kill failed: ' + e.message, 'error');
    }
  }
};

/* ═══════════════════════════════════════════════════════
   eDEX-UI Kill Sequence — runs after system wipe
   ═══════════════════════════════════════════════════════ */
function _runKillSequence() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let actx;
  try { actx = new AudioCtx(); } catch(e) {}

  function playBeep(freq, dur, vol=0.10) {
    if (!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    o.frequency.value = freq; o.type = 'sawtooth';
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
    o.start(); o.stop(actx.currentTime + dur);
  }
  function playKey() {
    if (!actx) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    o.frequency.value = 200 + Math.random() * 200; o.type = 'sawtooth';
    g.gain.setValueAtTime(0.04, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.06);
    o.start(); o.stop(actx.currentTime + 0.06);
  }
  // Alarm sweep
  function playAlarm() {
    if (!actx) return;
    [880, 660, 880, 440, 880, 220].forEach((f,i) => setTimeout(() => playBeep(f, 0.25, 0.12), i * 120));
  }
  playAlarm();

  // Matrix rain
  const cv = document.getElementById('killMatrix');
  if (cv) {
    const cx = cv.getContext('2d');
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const cols = Math.floor(cv.width / 14);
    const drops = Array(cols).fill(1);
    const chars = 'アイウエオカキクケコ0123456789ABCDEF☠✕▓▒░'.split('');
    setInterval(() => {
      cx.fillStyle = 'rgba(0,0,0,0.07)';
      cx.fillRect(0, 0, cv.width, cv.height);
      cx.fillStyle = '#ff2244';
      cx.font = '13px Courier New';
      drops.forEach((y, i) => {
        cx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y * 14 > cv.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
    }, 40);
  }

  // Hex noise
  const hexEl = document.getElementById('killHex');
  if (hexEl) setInterval(() => {
    let s = '';
    for (let i = 0; i < 800; i++) s += Math.floor(Math.random()*16).toString(16).toUpperCase();
    hexEl.textContent = s;
  }, 100);

  // HUD clock
  let sec = 0;
  setInterval(() => {
    sec++;
    const h=String(Math.floor(sec/3600)).padStart(2,'0');
    const m=String(Math.floor((sec%3600)/60)).padStart(2,'0');
    const s=String(sec%60).padStart(2,'0');
    const cl = document.getElementById('killClock');
    const cp = document.getElementById('killCpu');
    const mm = document.getElementById('killMem');
    if (cl) cl.textContent = `${h}:${m}:${s}`;
    if (cp) cp.textContent = Math.floor(60 + Math.random() * 39);
    if (mm) mm.textContent = Math.floor(512 + Math.random() * 512);
  }, 1000);

  // Terminal lines
  const lines = [
    { t:'err', text:'TERMINATION SIGNAL RECEIVED — PID 0xDEAD' },
    { t:'warn',text:'WARNING: All data will be permanently destroyed' },
    { t:'err', text:'Revoking user sessions .................. DONE' },
    { t:'err', text:'Dropping table: patients ................ WIPED' },
    { t:'err', text:'Dropping table: appointments ............ WIPED' },
    { t:'err', text:'Dropping table: treatments .............. WIPED' },
    { t:'err', text:'Dropping table: transactions ............ WIPED' },
    { t:'err', text:'Dropping table: doctors ................. WIPED' },
    { t:'err', text:'Dropping table: inventory ............... WIPED' },
    { t:'err', text:'Dropping table: feedback ................ WIPED' },
    { t:'err', text:'Dropping table: work_hours .............. WIPED' },
    { t:'err', text:'Dropping table: installments ............ WIPED' },
    { t:'warn',text:'Resetting settings to factory defaults' },
    { t:'err', text:'Purging image cache ..................... DONE' },
    { t:'err', text:'Overwriting memory sectors .............. DONE' },
    { t:'warn',text:'Zeroing disk blocks [████████████] 100%' },
    { t:'err', text:'Destroying encryption keys .............. DONE' },
    { t:'err', text:'Flushing all buffers .................... DONE' },
    { t:'warn',text:'SYSTEM INTEGRITY: COMPROMISED' },
    { t:'err', text:'KERNEL PANIC — FORCED SHUTDOWN INITIATED' },
    { t:'err', text:'☠ ALL DATA PERMANENTLY DESTROYED ☠' },
  ];

  const term = document.getElementById('killTerminal');
  let lineIdx = 0;
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function typeLines() {
    await sleep(400);
    for (const l of lines) {
      if (!term) break;
      const div = document.createElement('div');
      div.className = 'kl-line kl-' + l.t;
      const tagMap = { err:'ERR', warn:'WARN', ok:'OK', inf:'INF' };
      const tagCls = l.t === 'err' ? 'kl-tag-err' : l.t === 'warn' ? 'kl-tag-warn' : 'kl-tag-ok';
      div.innerHTML = `<span class="kl-tag ${tagCls}">${tagMap[l.t]||'INF'}</span>${l.text}`;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
      await sleep(10);
      div.classList.add('show');
      playKey();
      await sleep(l.t === 'err' ? 160 : l.t === 'warn' ? 220 : 130);
      lineIdx++;
    }

    await sleep(500);
    if (term) { term.style.transition = 'opacity 1.2s ease'; term.style.opacity = '0'; }
    await sleep(1300);

    // Show logo
    const logo = document.getElementById('killLogoWrap');
    if (logo) { logo.style.opacity = '1'; logo.style.transform = 'translateY(0)'; }
    playAlarm();
    setTimeout(() => playAlarm(), 800);

    // Progress bar
    let p = 0;
    const fill = document.getElementById('killProgressFill');
    const pct  = document.getElementById('killPct');
    const pInt = setInterval(() => {
      p += Math.random() * 5 + 1;
      if (p >= 100) { p = 100; clearInterval(pInt); }
      if (fill) fill.style.width = p + '%';
      if (pct)  pct.textContent  = Math.floor(p) + '%';
      playKey();
    }, 45);
  }

  typeLines();
}
