/* ═══════════════════════════════════════════════════════
   DentCare Pro — Modal Controllers
   ═══════════════════════════════════════════════════════ */

const Modals = {
  _active: null,

  open(id) {
    this._active = id;
    $('modalOverlay').classList.add('open');
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    $(id).style.display = 'block';
    $(id).style.animation = 'modalIn .3s cubic-bezier(.4,0,.2,1) both';
  },

  close(e) {
    if (e && e.target !== $('modalOverlay')) return;
    $('modalOverlay').classList.remove('open');
    this._active = null;
  },

  newPatient() {
    this._resetPatientModal();
    this.open('modalNewPatient');
  },

  _resetPatientModal() {
    ['np_name','np_phone','np_dob','np_email','np_occupation','np_insurance','np_address','np_conditions','np_allergies','np_concerns','np_xray_date','np_xray_notes']
      .forEach(id => $(id) && ($(id).value = ''));
    this._clearXray();
    this._npTab('info', document.querySelector('.np-tab'));
    const foot = document.querySelector('#modalNewPatient .modal-foot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.registerPatient()">✓ Register Patient</button>
      `;
    }
  },

  async editPatient(id) {
    try {
      const p = await DB.tables.patients.find(id);
      if (!p) return;
      this._resetPatientModal();

      $('np_name').value        = p.full_name || '';
      $('np_phone').value       = p.phone || '';
      $('np_dob').value         = p.date_of_birth || '';
      $('np_gender').value      = p.gender || '';
      $('np_email').value       = p.email || '';
      $('np_occupation').value  = p.occupation || '';
      $('np_blood').value       = p.blood_type || '';
      $('np_insurance').value   = p.insurance || '';
      $('np_ref').value         = p.referral_source || '';
      $('np_pay').value         = p.payment_method || '';
      $('np_conditions').value  = p.medical_conditions || '';
      $('np_allergies').value   = p.allergies || '';
      $('np_concerns').value    = p.dental_concerns || '';
      $('np_address').value     = p.address || '';
      $('np_xray_date').value   = p.xray_date || '';
      $('np_xray_notes').value  = p.xray_notes || '';

      if (p.xray_image) this._showXrayPreview(p.xray_image);

      const foot = document.querySelector('#modalNewPatient .modal-foot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updatePatient(${id})">✓ Update Patient</button>
        `;
      }
      this.open('modalNewPatient');
    } catch(e) {
      console.error(e);
      toast('Error loading patient for edit', 'error');
    }
  },

  _npTab(tab, btn) {
    ['Info','Xray'].forEach(t => {
      const panel = $(`npTab${t}`);
      if (panel) panel.style.display = 'none';
    });
    const active = $(`npTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (active) active.style.display = '';
    document.querySelectorAll('.np-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  },

  _xrayBase64: null,

  _handleXrayFile(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => this._uploadAndPreviewXray(e.target.result, input.files[0].name);
    reader.readAsDataURL(input.files[0]);
  },

  _handleXrayDrop(e) {
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => this._uploadAndPreviewXray(ev.target.result, file.name);
    reader.readAsDataURL(file);
  },

  async _uploadAndPreviewXray(dataUrl, filename) {
    try {
      // Show preview immediately
      this._showXrayPreview(dataUrl);
      // Upload to server → saves to database/images/xrays/
      // Static mode: base64 IS the URL (no server upload needed)
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ base64: dataUrl, folder: 'xrays', name: filename?.replace(/\.[^.]+$/, '') || 'xray' })
      });
      const data = await res.json();
      if (data.url) {
        // Store the URL path, not the base64
        this._xrayBase64 = null;
        this._xrayUrl    = data.url;
        // Update preview to use the server URL
        const img = $('xrayPreviewImg');
        if (img) img.src = data.url;
        toast('X-ray saved to database/images/xrays/ ✓', 'success');
      }
    } catch(e) {
      // Fallback: keep base64 in memory if upload fails
      console.warn('Image upload failed, keeping base64:', e);
    }
  },

  _showXrayPreview(dataUrl) {
    this._xrayBase64 = dataUrl;
    const img    = $('xrayPreviewImg');
    const wrap   = $('xrayPreviewWrap');
    const prompt = $('xrayUploadPrompt');
    if (img)    img.src = dataUrl;
    if (wrap)   wrap.style.display = '';
    if (prompt) prompt.style.display = 'none';
  },

  _clearXray() {
    this._xrayBase64 = null;
    this._xrayUrl    = null;
    const wrap   = $('xrayPreviewWrap');
    const prompt = $('xrayUploadPrompt');
    const inp    = $('xrayFileInp');
    if (wrap)   wrap.style.display = 'none';
    if (prompt) prompt.style.display = '';
    if (inp)    inp.value = '';
  },

  /* ── APPOINTMENTS ─────────────────────────────── */
  async newAppointment(patientId = null) {
    this._resetApptModal();
    const patients = await DB.tables.patients.all();
    $('ap_patient').innerHTML = '<option value="">Select patient…</option>' +
      patients.map(p => `<option value="${p.id}" ${patientId == p.id ? 'selected' : ''}>${p.full_name}</option>`).join('');

    const doctors = await DB.tables.doctors.all();
    $('ap_doctor').innerHTML = '<option value="">Select doctor…</option>' +
      doctors.map(d => `<option value="${d.id}">${d.full_name} — ${d.specialty}</option>`).join('');

    $('ap_date').value = today();
    $('ap_time').value = '09:00';
    this.open('modalNewAppt');
  },

  _resetApptModal() {
    ['ap_patient','ap_doctor','ap_date','ap_time','ap_dur','ap_priority','ap_type','ap_complaint','ap_notes','ap_pay_method','ap_discount_code']
      .forEach(id => $(id) && ($(id).value = ''));
    const foot = document.querySelector('#modalNewAppt .modal-foot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.scheduleAppt()">✓ Schedule</button>
      `;
    }
  },

  async editAppointment(id) {
    try {
      const a = await DB.tables.appointments.find(id);
      if (!a) return;
      this._resetApptModal();

      const patients = await DB.tables.patients.all();
      $('ap_patient').innerHTML = '<option value="">Select patient…</option>' +
        patients.map(p => `<option value="${p.id}" ${a.patient_id == p.id ? 'selected' : ''}>${p.full_name}</option>`).join('');

      const doctors = await DB.tables.doctors.all();
      $('ap_doctor').innerHTML = '<option value="">Select doctor…</option>' +
        doctors.map(d => `<option value="${d.id}" ${a.doctor_id == d.id ? 'selected' : ''}>${d.full_name} — ${d.specialty}</option>`).join('');

      $('ap_date').value          = a.date || '';
      $('ap_time').value          = a.time || '';
      $('ap_dur').value           = a.duration_min || '30';
      $('ap_priority').value      = a.priority || 'normal';
      $('ap_type').value          = a.treatment_type || '';
      $('ap_complaint').value     = a.chief_complaint || '';
      $('ap_notes').value         = a.notes || '';
      $('ap_pay_method').value    = a.payment_method || '';
      $('ap_discount_code').value = a.discount_code || '';

      const foot = document.querySelector('#modalNewAppt .modal-foot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateAppt(${id})">✓ Update Appointment</button>
        `;
      }
      this.open('modalNewAppt');
    } catch(e) {
      console.error(e);
      toast('Error loading appointment for edit', 'error');
    }
  },

  async viewAppointmentDetail(id) {
    try {
      const a = await DB.tables.appointments.find(id);
      if (!a) return;
      const [p, d] = await Promise.all([
        DB.tables.patients.find(a.patient_id),
        DB.tables.doctors.find(a.doctor_id)
      ]);

      $('apptDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Patient</label><span>${p?.full_name || 'Unknown'}</span></div>
          <div class="detail-info-item"><label>Doctor</label><span>${d?.full_name || 'Unknown'}</span></div>
          <div class="detail-info-item"><label>Date</label><span>${a.date}</span></div>
          <div class="detail-info-item"><label>Time</label><span>${a.time}</span></div>
          <div class="detail-info-item"><label>Duration</label><span>${a.duration_min} min</span></div>
          <div class="detail-info-item"><label>Priority</label><span>${UI.priorityBadge(a.priority)}</span></div>
          <div class="detail-info-item"><label>Status</label><span>${UI.statusBadge(a.status)}</span></div>
          <div class="detail-info-item"><label>Treatment</label><span>${a.treatment_type || '—'}</span></div>
          <div class="detail-info-item"><label>Payment Method</label><span>${a.payment_method || '—'}</span></div>
          <div class="detail-info-item"><label>Discount Code</label><span>${a.discount_code ? `<span class="badge badge-normal">🏷 ${a.discount_code}</span>` : '—'}</span></div>
          <div class="detail-info-item full"><label>Chief Complaint</label><span>${a.chief_complaint || '—'}</span></div>
          <div class="detail-info-item full"><label>Notes</label><span>${a.notes || '—'}</span></div>
        </div>
        ${a.status !== 'completed' ? `
        <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn-primary" onclick="Modals.close();Actions.confirmTreatment(${a.id})">
            ✓ Confirm Treatment & Add to Finance
          </button>
          ${p?.phone ? `<button class="btn-icon" onclick="Modals.sendWhatsAppReminder('${p.phone.replace(/\D/g,'')}','${(p?.full_name||'').replace(/'/g,"\\'")}','${a.date}','${a.time}','${d?.full_name||''}')">💬 WhatsApp Reminder</button>` : ''}
        </div>` : `
        <div style="margin-top:1rem">
          ${p?.phone ? `<button class="btn-icon" onclick="Modals.sendWhatsAppReminder('${p.phone.replace(/\D/g,'')}','${(p?.full_name||'').replace(/'/g,"\\'")}','${a.date}','${a.time}','${d?.full_name||''}')">💬 Send Follow-up Message</button>` : ''}
        </div>`}
      `;
      this.open('modalApptDetail');
    } catch(e) {
      console.error(e);
      toast('Error loading appointment details', 'error');
    }
  },

  /* ── DOCTORS ──────────────────────────────────── */
  addDoctor() {
    this._resetDrModal();
    this.open('modalAddDoctor');
  },

  _resetDrModal() {
    ['dr_name','dr_phone','dr_email','dr_lic','dr_room','dr_sched'].forEach(id => $(id) && ($(id).value = ''));
    $('dr_spec').value = 'General Dentist';
    $('drCredentialsPreview').style.display = 'none';
    const foot = document.querySelector('#modalAddDoctor .modal-foot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.addDoctor()">✓ Add Doctor</button>
      `;
    }
  },

  async editDoctor(id) {
    try {
      const d = await DB.tables.doctors.find(id);
      if (!d) return;
      this._resetDrModal();
      $('dr_name').value  = d.full_name.replace('Dr. ', '');
      $('dr_spec').value  = d.specialty;
      $('dr_phone').value = d.phone || '';
      $('dr_email').value = d.email || '';
      $('dr_lic').value   = d.license_no || '';
      $('dr_room').value  = d.room || '';
      $('dr_sched').value = d.schedule || '';

      const foot = document.querySelector('#modalAddDoctor .modal-foot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateDoctor(${id})">✓ Update Doctor</button>
        `;
      }
      this.open('modalAddDoctor');
    } catch(e) { toast('Error loading doctor', 'error'); }
  },

  async viewDoctor(id) {
    try {
      const d = await DB.tables.doctors.find(id);
      if (!d) return;
      $('docDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Full Name</label><span>${d.full_name}</span></div>
          <div class="detail-info-item"><label>Specialty</label><span>${d.specialty}</span></div>
          <div class="detail-info-item"><label>Phone</label><span>${d.phone || '—'}</span></div>
          <div class="detail-info-item"><label>Email</label><span>${d.email || '—'}</span></div>
          <div class="detail-info-item"><label>License</label><span>${d.license_no || '—'}</span></div>
          <div class="detail-info-item"><label>Room</label><span>${d.room || '—'}</span></div>
          <div class="detail-info-item"><label>Schedule</label><span>${d.schedule || '—'}</span></div>
        </div>
      `;
      this.open('modalDocDetail');
    } catch(e) { toast('Error loading doctor details', 'error'); }
  },

  /* ── FINANCE ──────────────────────────────────── */
  newTransaction() {
    this._resetTxModal();
    $('tx_date').value = today();
    this.open('modalNewTx');
  },

  _resetTxModal() {
    ['tx_desc','tx_amount','tx_date','tx_type','tx_cat'].forEach(id => $(id) && ($(id).value = ''));
    const foot = document.querySelector('#modalNewTx .modal-foot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.addTransaction()">✓ Add Transaction</button>
      `;
    }
  },

  async editTransaction(id) {
    try {
      const t = await DB.tables.transactions.find(id);
      if (!t) return;
      this._resetTxModal();

      $('tx_desc').value   = t.description || '';
      $('tx_type').value   = t.type || 'income';
      $('tx_cat').value    = t.category || '';
      $('tx_amount').value = t.amount || 0;
      $('tx_date').value   = t.date || '';

      const foot = document.querySelector('#modalNewTx .modal-foot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateTransaction(${id})">✓ Update Transaction</button>
        `;
      }
      this.open('modalNewTx');
    } catch(e) {
      console.error(e);
      toast('Error loading transaction for edit', 'error');
    }
  },

  async viewTransaction(id) {
    try {
      const t = await DB.tables.transactions.find(id);
      if (!t) return;
      $('txDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Description</label><span>${t.description}</span></div>
          <div class="detail-info-item"><label>Type</label><span>${UI.statusBadge(t.type === 'income' ? 'confirmed' : 'cancelled')}</span></div>
          <div class="detail-info-item"><label>Category</label><span>${t.category}</span></div>
          <div class="detail-info-item"><label>Amount</label><span style="color:${t.type === 'income' ? 'var(--green)' : 'var(--red)'}">${fmt(t.amount)}</span></div>
          <div class="detail-info-item"><label>Date</label><span>${t.date}</span></div>
        </div>
      `;
      this.open('modalTxDetail');
    } catch(e) {
      console.error(e);
      toast('Error loading transaction details', 'error');
    }
  },

  /* ── INVENTORY ────────────────────────────────── */
  addInventory() {
    this._resetInvModal();
    this.open('modalAddInv');
  },

  _resetInvModal() {
    ['inv_name','inv_qty','inv_min','inv_price','inv_supplier'].forEach(id => $(id) && ($(id).value = ''));
    $('inv_cat').value = 'consumable';
    const foot = document.querySelector('#modalAddInv .modal-foot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.addInventoryItem()">✓ Add Item</button>
      `;
    }
  },

  async editInventory(id) {
    try {
      const i = await DB.tables.inventory.find(id);
      if (!i) return;
      this._resetInvModal();
      $('inv_name').value     = i.item_name;
      $('inv_cat').value      = i.category;
      $('inv_qty').value      = i.quantity;
      $('inv_min').value      = i.min_stock;
      $('inv_price').value    = i.unit_price;
      $('inv_supplier').value = i.supplier || '';

      const foot = document.querySelector('#modalAddInv .modal-foot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateInventory(${id})">✓ Update Item</button>
        `;
      }
      this.open('modalAddInv');
    } catch(e) { toast('Error loading item', 'error'); }
  },

  async viewInventory(id) {
    try {
      const i = await DB.tables.inventory.find(id);
      if (!i) return;
      $('invDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Item Name</label><span>${i.item_name}</span></div>
          <div class="detail-info-item"><label>Category</label><span>${i.category}</span></div>
          <div class="detail-info-item"><label>Quantity</label><span>${i.quantity}</span></div>
          <div class="detail-info-item"><label>Min Stock</label><span>${i.min_stock}</span></div>
          <div class="detail-info-item"><label>Unit Price</label><span>${fmt(i.unit_price)}</span></div>
          <div class="detail-info-item"><label>Supplier</label><span>${i.supplier || '—'}</span></div>
        </div>
      `;
      this.open('modalInvDetail');
    } catch(e) { toast('Error loading item details', 'error'); }
  },

  /* ── PATIENT DETAIL ───────────────────────────── */
  async viewPatient(id) {
    try {
      const p = await DB.tables.patients.find(id);
      if (!p) return;
      $('detailPatientName').textContent = `🦷 ${p.full_name}`;

      $('detailOverview').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Patient No.</label><span style="color:var(--accent)">${p.patient_no}</span></div>
          <div class="detail-info-item"><label>Phone</label><span>${p.phone}</span></div>
          <div class="detail-info-item"><label>Date of Birth</label><span>${p.date_of_birth || '—'}</span></div>
          <div class="detail-info-item"><label>Age</label><span>${p.age || '—'}</span></div>
          <div class="detail-info-item"><label>Gender</label><span>${p.gender || '—'}</span></div>
          <div class="detail-info-item"><label>Blood Type</label><span>${p.blood_type || '—'}</span></div>
          <div class="detail-info-item"><label>Email</label><span>${p.email || '—'}</span></div>
          <div class="detail-info-item"><label>Insurance</label><span>${p.insurance || 'None'}</span></div>
          <div class="detail-info-item"><label>Payment</label><span>${p.payment_method || '—'}</span></div>
        </div>
        <div class="form-grid">
          ${p.medical_conditions ? `<div class="detail-info-item full" style="grid-column:1/-1"><label>Medical Conditions</label><span style="color:var(--orange)">${p.medical_conditions}</span></div>` : ''}
          ${p.allergies ? `<div class="detail-info-item" style="grid-column:1/-1"><label>Allergies</label><span style="color:var(--red)">${p.allergies}</span></div>` : ''}
          ${p.dental_concerns ? `<div class="detail-info-item" style="grid-column:1/-1"><label>Dental Concerns</label><span>${p.dental_concerns}</span></div>` : ''}
        </div>
        <div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn-primary" onclick="Modals.newAppointment(${p.id})">📅 Book Appointment</button>
          <button class="btn-icon" onclick="WaitingPage.addToQueue(${p.id},'${p.full_name.replace(/'/g,"\\'").replace(/"/g,'&quot;')}').then(()=>UI.updateBadges());Modals.close()">⏳ Add to Waiting Room</button>
          <button class="btn-icon" onclick="Modals.printPatientFile(${p.id})">📋 Print Medical File</button>
          <button class="btn-icon" onclick="Modals.xrayGallery(${p.id})">🩻 X-Ray Gallery</button>
          <button class="btn-icon" onclick="InstallmentsPage.openNew()">💰 Payment Plan</button>
        </div>
      `;

      const docs  = await DB.tables.doctors.all();
      const dcMap = Object.fromEntries(docs.map(d => [d.id, d]));

      const allTx = await DB.tables.treatments.all();
      const txs   = allTx.filter(t => String(t.patient_id) === String(id));
      $('detailTreatments').innerHTML = txs.length === 0
        ? '<div class="empty-state"><div>🦷</div><p>No treatments recorded</p></div>'
        : '<table class="data-table"><thead><tr><th>Date</th><th>Tooth</th><th>Treatment</th><th>Cost</th><th>Doctor</th><th>Notes</th><th>Actions</th></tr></thead><tbody>'
          + txs.map(t => `<tr><td>${t.date}</td><td>${t.tooth_number || '—'}</td><td>${t.treatment_type}</td><td style="color:var(--green)">${fmt(t.cost)}</td><td>${dcMap[t.doctor_id]?.full_name || 'Unknown'}</td><td style="color:var(--text2);font-size:.8rem">${t.procedure_notes || '—'}</td>
          <td><div class="actions">
            <button class="action-btn" onclick="Modals.printReceipt(${t.id})" title="Print Receipt">🧾</button>
            ${t.prescription ? `<button class="action-btn" onclick="Modals.printPrescription(${t.id})" title="Print Prescription">℞</button>` : ''}
          </div></td>
          </tr>`).join('')
          + '</tbody></table>';

      const allApts = await DB.tables.appointments.all();
      const apts    = allApts.filter(a => String(a.patient_id) === String(id));
      $('detailAppointments').innerHTML = apts.length === 0
        ? '<div class="empty-state"><div>📅</div><p>No appointments</p></div>'
        : '<table class="data-table"><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Treatment</th><th>Status</th><th>Priority</th><th>Discount</th></tr></thead><tbody>'
          + apts.sort((a, b) => a.date > b.date ? -1 : 1).map(a =>
              `<tr><td>${a.date}</td><td>${a.time}</td><td>${dcMap[a.doctor_id]?.full_name || 'Unknown'}</td><td>${a.treatment_type || '—'}</td><td>${UI.statusBadge(a.status)}</td><td>${UI.priorityBadge(a.priority)}</td><td>${a.discount_code ? `<span class="badge badge-normal">🏷 ${a.discount_code}</span>` : '—'}</td></tr>`
            ).join('')
          + '</tbody></table>';

      const total = txs.reduce((s, t) => s + Number(t.cost), 0);
      const plans = await DB.installments.byPatient(id).catch(() => []);
      const activePlan = plans.find(pl => pl.status === 'active');
      $('detailBilling').innerHTML = `
        <div class="finance-summary" style="margin-bottom:1rem">
          <div class="fin-card"><div class="fin-label">Total Charged</div><div class="fin-value income">${fmt(total)}</div></div>
          <div class="fin-card"><div class="fin-label">Payment Method</div><div class="fin-value net" style="font-size:1.1rem">${p.payment_method || '—'}</div></div>
          <div class="fin-card"><div class="fin-label">Insurance</div><div class="fin-value net" style="font-size:1.1rem">${p.insurance || 'None'}</div></div>
        </div>
        ${activePlan ? `<div style="padding:.75rem;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:1rem;border-left:3px solid var(--accent)">
          <strong>💰 Active Payment Plan</strong> — ${fmt(activePlan.total_amount)} in ${activePlan.num_installments} installments
          <br><span style="font-size:.8rem;color:var(--text2)">
            Paid: ${(activePlan.payments||[]).filter(p=>p.status==='paid').length}/${activePlan.num_installments}
            ${activePlan.payments?.find(p=>p.status==='pending') ? ' · Next due: '+activePlan.payments.find(p=>p.status==='pending').due_date : ''}
          </span>
          <button class="action-btn" style="margin-left:.75rem;font-size:.75rem" onclick="InstallmentsPage._showPlan(${activePlan.id})">View Plan</button>
        </div>` : `<button class="btn-icon" style="margin-bottom:1rem" onclick="InstallmentsPage.openNew()">💰 Create Payment Plan</button>`}
        <table class="data-table"><thead><tr><th>Date</th><th>Treatment</th><th>Amount</th><th>Receipt</th></tr></thead><tbody>
          ${txs.map(b => `<tr><td>${b.date}</td><td>${b.treatment_type}</td><td style="color:var(--green)">${fmt(b.cost)}</td>
            <td><button class="action-btn" onclick="Modals.printReceipt(${b.id})">🧾 Print</button></td></tr>`).join('')}
        </tbody></table>
      `;

      // Load xray gallery count
      const xrays = await DB.xrays.byPatient(id).catch(() => []);
      const legacyXray = p.xray_image && !p.xray_image.startsWith('/images/') ? p.xray_image : null;
      const allXrayCount = xrays.length + (legacyXray ? 1 : 0);

      $('detailXray').innerHTML = `
        <div style="text-align:center;padding:1.5rem">
          <div style="font-size:3rem;margin-bottom:.5rem">🩻</div>
          <div style="font-size:1.1rem;font-weight:600;margin-bottom:.5rem">${allXrayCount} X-ray${allXrayCount !== 1 ? 's' : ''} on file</div>
          <button class="btn-primary" onclick="Modals.xrayGallery(${id})" style="margin:.5rem">📂 Open X-Ray Gallery</button>
          ${legacyXray ? `<div style="margin-top:1.5rem"><div style="font-size:.8rem;color:var(--text2);margin-bottom:.5rem">Legacy X-ray (${p.xray_date || 'no date'})</div>
            <img src="${legacyXray}" style="max-width:100%;max-height:300px;border-radius:8px;object-fit:contain"></div>` : ''}
        </div>`;

      // Dental Chart tab - inline mini chart view
      $('detailChart').innerHTML = `
        <div style="text-align:center;padding:1.5rem">
          <div style="font-size:3rem;margin-bottom:.5rem">🦷</div>
          <p style="color:var(--text2);margin-bottom:1rem">View full treatment history overlaid on a dental chart. Treated teeth are highlighted.</p>
          <button class="btn-primary" onclick="DentalChart.open(${id})">🗺 Open Interactive Dental Chart</button>
          <div style="margin-top:1.5rem">
            ${txs.length ? `<p style="font-size:.85rem;color:var(--text2)">Teeth with recorded treatments:</p>
            <div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.5rem">
              ${[...new Set(txs.flatMap(t => t.tooth_number ? t.tooth_number.split(',').map(s=>s.trim()).filter(Boolean) : []))].map(n =>
                `<span style="background:var(--accent);color:#fff;padding:.2rem .5rem;border-radius:999px;font-size:.8rem">#${n}</span>`
              ).join('')}
            </div>` : '<p style="font-size:.85rem;color:var(--text2)">No tooth-specific treatments recorded yet.</p>'}
          </div>
        </div>`;

      this.open('modalPatientDetail');
    } catch(e) {
      console.error(e);
      toast('Failed to load patient details', 'error');
    }
  },

  /* ── USERS / PASSWORDS ────────────────────────── */
  newUser() {
    this._resetUserModal();
    this.open('modalNewUser');
  },

  _resetUserModal() {
    ['nu_user','nu_pass'].forEach(id => $(id) && ($(id).value = ''));
    if ($('nu_role')) $('nu_role').value = 'receptionist';
    const foot = $('userModalFoot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.addUser()">✓ Create User</button>
      `;
    }
  },

  async editUser(id) {
    try {
      const u = await DB.tables.users.find(id);
      if (!u) return;
      this._resetUserModal();
      $('nu_user').value = u.username;
      $('nu_pass').value = u.password || '';
      if ($('nu_role')) $('nu_role').value = u.role;

      const foot = $('userModalFoot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateUser(${id})">✓ Update User</button>
        `;
      }
      this.open('modalNewUser');
    } catch(e) { toast('Error loading user', 'error'); }
  },

  async viewUser(id) {
    try {
      const u = await DB.tables.users.find(id);
      if (!u) return;
      const session = DB.auth.current();
      const isAdmin = session?.role === 'admin';
      $('userDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Username</label><span><strong>${u.username}</strong></span></div>
          <div class="detail-info-item"><label>Role</label><span><span class="badge ${u.role === 'admin' ? 'badge-urgent' : 'badge-info'}">${u.role}</span></span></div>
          <div class="detail-info-item"><label>Password</label><span>
            ${isAdmin && u.password
              ? `<code style="letter-spacing:2px;user-select:all">${u.password}</code>`
              : `<span style="letter-spacing:3px">••••••</span>`}
          </span></div>
          <div class="detail-info-item"><label>Doctor ID</label><span>${u.doctor_id || '—'}</span></div>
          <div class="detail-info-item"><label>Last Login</label><span>${u.last_login ? u.last_login.split('T')[0] : '—'}</span></div>
        </div>
        ${isAdmin ? `
        <div style="margin-top:1rem;display:flex;gap:.5rem">
          <button class="btn-primary" onclick="Modals.close();Modals.editUser(${id})">✏ Edit</button>
          <button class="btn-ghost danger" onclick="Modals.close();Actions.deleteUser(${id})">🗑 Delete</button>
        </div>` : ''}
      `;
      this.open('modalUserDetail');
    } catch(e) { toast('Error loading user details', 'error'); }
  },

  /* ── DISCOUNT CODES ───────────────────────────── */
  newDiscountCode() {
    this._resetDiscountModal();
    this.open('modalNewDiscountCode');
  },

  _resetDiscountModal() {
    ['dc_code','dc_value','dc_desc'].forEach(id => $(id) && ($(id).value = ''));
    if ($('dc_type'))   $('dc_type').value   = 'percent';
    if ($('dc_active')) $('dc_active').value = '1';
    const foot = $('discountModalFoot');
    if (foot) {
      foot.innerHTML = `
        <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
        <button class="btn-primary" onclick="Actions.addDiscountCode()">✓ Save Code</button>
      `;
    }
  },

  async editDiscountCode(id) {
    try {
      const dc = await DB.tables.discount_codes.find(id);
      if (!dc) return;
      this._resetDiscountModal();
      $('dc_code').value  = dc.code;
      $('dc_type').value  = dc.discount_type;
      $('dc_value').value = dc.value;
      $('dc_desc').value  = dc.description || '';
      if ($('dc_active')) $('dc_active').value = dc.is_active ? '1' : '0';

      const foot = $('discountModalFoot');
      if (foot) {
        foot.innerHTML = `
          <button class="btn-ghost" onclick="Modals.close()">Cancel</button>
          <button class="btn-primary" onclick="Actions.updateDiscountCode(${id})">✓ Update Code</button>
        `;
      }
      this.open('modalNewDiscountCode');
    } catch(e) { toast('Error loading discount code', 'error'); }
  },

  async viewDiscountCode(id) {
    try {
      const dc = await DB.tables.discount_codes.find(id);
      if (!dc) return;
      $('discountDetailBody').innerHTML = `
        <div class="detail-info-grid">
          <div class="detail-info-item"><label>Code</label><span><code style="font-size:1.1rem;letter-spacing:2px;color:var(--accent)">${dc.code}</code></span></div>
          <div class="detail-info-item"><label>Type</label><span>${dc.discount_type === 'percent' ? 'Percentage (%)' : 'Fixed Amount (E£)'}</span></div>
          <div class="detail-info-item"><label>Value</label><span style="color:var(--green);font-weight:700">${dc.discount_type === 'percent' ? dc.value + '%' : 'E£' + Number(dc.value).toLocaleString()}</span></div>
          <div class="detail-info-item"><label>Status</label><span><span class="badge ${dc.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${dc.is_active ? 'Active' : 'Inactive'}</span></span></div>
          <div class="detail-info-item full"><label>Description</label><span>${dc.description || '—'}</span></div>
          <div class="detail-info-item"><label>Created</label><span>${dc.created_at ? dc.created_at.split('T')[0] : '—'}</span></div>
        </div>
        <div style="margin-top:1rem;display:flex;gap:.5rem">
          <button class="btn-primary" onclick="Modals.close();Modals.editDiscountCode(${dc.id})">✏ Edit</button>
          <button class="btn-ghost danger" onclick="Modals.close();Actions.deleteDiscountCode(${dc.id})">🗑 Delete</button>
        </div>
      `;
      this.open('modalDiscountDetail');
    } catch(e) { toast('Error loading discount code', 'error'); }
  },

  /* ── ADD PATIENT TO WAITING QUEUE ────────────────── */
  async addPatientToQueue() {
    try {
      const patients = await DB.tables.patients.all();
      const queue    = await DB.waiting.all().catch(() => []);
      const inQueueIds = new Set(queue.map(q => String(q.patient_id)));

      $('queue_patient').innerHTML = '<option value="">Select patient…</option>' +
        patients
          .filter(p => !inQueueIds.has(String(p.id)))
          .map(p => `<option value="${p.id}">${p.full_name}${p.phone ? ' — ' + p.phone : ''}</option>`)
          .join('');

      if ($('queue_notes')) $('queue_notes').value = '';
      this.open('modalAddToQueue');
    } catch(e) { toast('Error loading patients', 'error'); console.error(e); }
  },

  /* ── CONFIRM TREATMENT MODAL ──────────────────────── */
  async confirmTreatment(apptId) {
    try {
      const appt = await DB.tables.appointments.find(apptId);
      if (!appt) { toast('Appointment not found', 'error'); return; }

      const patient = await DB.tables.patients.find(appt.patient_id).catch(() => null);
      const doctor  = await DB.tables.doctors.find(appt.doctor_id).catch(() => null);
      const patName = patient?.full_name || `Patient #${appt.patient_id}`;
      const drName  = doctor?.full_name  || `Doctor #${appt.doctor_id}`;

      // Store appt id for actions
      $('modalConfirmTreatment').dataset.apptId = apptId;

      $('confirmTxInfo').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          <div><span style="color:var(--text2);font-size:.8rem">Patient</span><br><strong>${patName}</strong></div>
          <div><span style="color:var(--text2);font-size:.8rem">Doctor</span><br><strong>${drName}</strong></div>
          <div><span style="color:var(--text2);font-size:.8rem">Treatment</span><br>${appt.treatment_type || '—'}</div>
          <div><span style="color:var(--text2);font-size:.8rem">Date</span><br>${appt.date}</div>
          ${appt.payment_method ? `<div><span style="color:var(--text2);font-size:.8rem">Payment</span><br>${appt.payment_method}</div>` : ''}
          ${appt.discount_code ? `<div><span style="color:var(--text2);font-size:.8rem">Discount Code</span><br><span class="badge badge-normal">🏷 ${appt.discount_code}</span></div>` : ''}
        </div>
      `;

      // Pre-fill discount code from appointment
      if ($('ct_discount_code')) $('ct_discount_code').value = appt.discount_code || '';
      if ($('ct_cost'))          $('ct_cost').value = '';
      if ($('ct_discount_info')) { $('ct_discount_info').style.display = 'none'; $('ct_discount_info').textContent = ''; }
      if ($('ct_final_amount'))  $('ct_final_amount').textContent = 'E£ 0.00';

      // Store validated discount data
      $('modalConfirmTreatment').dataset.discountPct   = '';
      $('modalConfirmTreatment').dataset.discountFixed = '';

      // Live cost update
      const costInput = $('ct_cost');
      if (costInput) {
        costInput.oninput = () => Actions._updateFinalAmount();
      }

      // If appointment already has a discount code, auto-validate
      if (appt.discount_code) {
        await Actions.validateDiscountCode(true);
      }

      this.open('modalConfirmTreatment');
    } catch(e) { toast('Error loading appointment', 'error'); console.error(e); }
  },

  /* ── PATIENT RECEIPT / INVOICE ────────────────────────── */
  async printReceipt(treatmentId) {
    try {
      const t = await DB.tables.treatments.find(treatmentId);
      const p = await DB.tables.patients.find(t.patient_id);
      const d = t.doctor_id ? await DB.tables.doctors.find(t.doctor_id).catch(() => null) : null;
      const settings = await DB.settings.get().catch(() => ({}));
      const clinicName  = settings?.clinic_name  || settings?.clinic?.name  || 'DentCare Pro';
      const clinicPhone = settings?.clinic_phone || settings?.clinic?.phone || '';
      const clinicAddr  = settings?.clinic_address || settings?.clinic?.address || '';
      const currency    = settings?.clinic?.currency || settings?.currency || 'EGP';

      // Generate a sequential receipt number (stored in DB to be consistent)
      let receiptNo;
      try {
        const existing = await DB.fetch(`/receipts/number/${treatmentId}`);
        receiptNo = existing.receipt_no;
      } catch(e) {
        receiptNo = `RX-${new Date().getFullYear()}-${String(treatmentId).padStart(5,'0')}`;
      }

      const isAr = document.body.classList.contains('lang-ar');

      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}"><head>
        <meta charset="UTF-8">
        <title>Receipt — ${p?.full_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:${isAr?"'Cairo'":'\'DM Sans\''}, sans-serif;max-width:420px;margin:0 auto;padding:1.5rem;color:#1a1a1a;direction:${isAr?'rtl':'ltr'}}
          .clinic-name{font-size:1.4rem;font-weight:700;color:#7c3aed;margin-bottom:.2rem}
          .clinic-info{font-size:.8rem;color:#666;margin-bottom:1rem}
          .divider{border:none;border-top:2px dashed #ddd;margin:1rem 0}
          .receipt-title{text-align:center;font-size:1rem;font-weight:700;letter-spacing:2px;margin-bottom:.5rem}
          .receipt-no{font-size:.75rem;color:#999;text-align:${isAr?'left':'right'};margin-bottom:.5rem}
          .row{display:flex;justify-content:space-between;margin:.35rem 0;font-size:.9rem;gap:.5rem}
          .row .lbl{color:#666}
          .row .val{font-weight:500;text-align:${isAr?'left':'right'}}
          .row.total{font-weight:700;font-size:1.1rem;margin-top:.5rem;padding:.5rem 0}
          .badge{display:inline-block;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:600}
          .badge-completed{background:#dcfce7;color:#15803d}
          .badge-pending{background:#fef9c3;color:#854d0e}
          .footer{margin-top:1.5rem;text-align:center;font-size:.75rem;color:#999;border-top:1px dashed #ddd;padding-top:1rem}
          .stamp{width:80px;height:80px;border:3px solid #7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:1rem auto;color:#7c3aed;font-weight:700;font-size:.8rem;text-align:center;opacity:.6}
          @media print{button{display:none}@page{margin:.5cm;size:A5}}
        </style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <div class="clinic-name">🦷 ${clinicName}</div>
            <div class="clinic-info">${clinicPhone ? '📞 '+clinicPhone+'<br>' : ''}${clinicAddr}</div>
          </div>
          <div class="stamp">PAID<br>مدفوع</div>
        </div>
        <hr class="divider">
        <div class="receipt-title">RECEIPT / إيصال دفع</div>
        <div class="receipt-no">No: ${receiptNo}</div>
        <hr class="divider">
        <div class="row"><span class="lbl">Date / التاريخ</span><span class="val">${t.date}</span></div>
        <div class="row"><span class="lbl">Patient / المريض</span><span class="val"><strong>${p?.full_name || '—'}</strong></span></div>
        <div class="row"><span class="lbl">Patient No. / رقم المريض</span><span class="val">${p?.patient_no || '—'}</span></div>
        ${p?.phone ? `<div class="row"><span class="lbl">Phone / الهاتف</span><span class="val">${p.phone}</span></div>` : ''}
        ${d ? `<div class="row"><span class="lbl">Doctor / الطبيب</span><span class="val">${d.full_name}</span></div>` : ''}
        <hr class="divider">
        <div class="row"><span class="lbl">Treatment / العلاج</span><span class="val">${t.treatment_type}</span></div>
        ${t.tooth_number ? `<div class="row"><span class="lbl">Tooth(s) / الأسنان</span><span class="val">${t.tooth_number}</span></div>` : ''}
        ${t.diagnosis ? `<div class="row"><span class="lbl">Diagnosis / التشخيص</span><span class="val">${t.diagnosis}</span></div>` : ''}
        ${p?.insurance ? `<div class="row"><span class="lbl">Insurance / التأمين</span><span class="val">${p.insurance}</span></div>` : ''}
        <hr class="divider">
        <div class="row total">
          <span>Total / الإجمالي</span>
          <span style="color:#7c3aed">${Number(t.cost).toLocaleString()} ${currency}</span>
        </div>
        <div class="row"><span class="lbl">Payment / الدفع</span><span class="val">${p?.payment_method || t.payment_method || 'Cash'}</span></div>
        <div class="row"><span class="lbl">Status / الحالة</span><span class="val"><span class="badge badge-completed">Paid ✓</span></span></div>
        <hr class="divider">
        <div class="footer">
          <p>Thank you for choosing ${clinicName}</p>
          <p>شكراً لاختيارك ${clinicName}</p>
          <p style="margin-top:.5rem;font-size:.65rem;color:#bbb">Generated ${new Date().toLocaleString()} · ${receiptNo}</p>
        </div>
        <div style="margin-top:1rem;display:flex;justify-content:flex-end">
          <button onclick="window.print()" style="padding:.5rem 1.5rem;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">🖨️ Print</button>
        </div>
        <script>
          // Auto-print after fonts load
          document.fonts.ready.then(() => window.print());
        </script>
      </body></html>`);
      win.document.close();
    } catch(e) { toast('Error generating receipt', 'error'); console.error(e); }
  },

  /* ── PRINT PRESCRIPTION ───────────────────────────────── */
  async printPrescription(treatmentId) {
    try {
      const t = await DB.tables.treatments.find(treatmentId);
      if (!t.prescription) { toast('No prescription on this treatment', 'warning'); return; }
      const p = await DB.tables.patients.find(t.patient_id);
      const d = t.doctor_id ? await DB.tables.doctors.find(t.doctor_id).catch(() => null) : null;
      const settings = await DB.settings.get().catch(() => ({}));
      const clinicName = settings?.clinic_name || settings?.clinic?.name || 'DentCare Pro';

      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head>
        <title>Prescription</title>
        <style>
          body{font-family:'Arial',sans-serif;max-width:520px;margin:40px auto;padding:2rem;border:2px solid #7c3aed;border-radius:12px;color:#1a1a1a}
          .header{display:flex;justify-content:space-between;align-items:start;margin-bottom:1.5rem}
          .clinic-name{font-size:1.4rem;font-weight:700;color:#7c3aed}
          .rx-symbol{font-size:2.5rem;color:#7c3aed;font-style:italic;font-weight:700}
          .label{font-size:.75rem;color:#888;margin-bottom:.15rem}
          .val{font-size:.9rem;font-weight:600;margin-bottom:.75rem}
          .prescription-box{margin:1.5rem 0;padding:1rem;border:1px solid #ddd;border-radius:8px;min-height:100px;background:#fafafa}
          .divider{border:none;border-top:1px solid #eee;margin:1rem 0}
          .sig{margin-top:3rem;display:flex;justify-content:flex-end}
          .sig-line{border-top:1px solid #333;width:180px;text-align:center;padding-top:.25rem;font-size:.8rem;color:#666}
          @media print{@page{margin:.5cm}}
        </style></head><body>
        <div class="header">
          <div><div class="clinic-name">🦷 ${clinicName}</div><div style="font-size:.8rem;color:#666">Dental Prescription</div></div>
          <div class="rx-symbol">℞</div>
        </div>
        <hr>
        <div><span class="label">Patient Name:</span><div class="val">${p?.full_name || '—'}</div></div>
        <div><span class="label">Age:</span><div class="val">${p?.age || '—'} years</div></div>
        <div><span class="label">Date:</span><div class="val">${t.date}</div></div>
        <div><span class="label">Diagnosis:</span><div class="val">${t.diagnosis || t.treatment_type}</div></div>
        <div class="label">Prescription:</div>
        <div class="prescription-box">${t.prescription.replace(/\n/g,'<br>')}</div>
        ${t.follow_up_date ? `<div><span class="label">Follow-up:</span><div class="val">${t.follow_up_date}</div></div>` : ''}
        <div class="sig">
          <div class="sig-line">${d ? d.full_name : 'Doctor Signature'}<br>${d?.license_no ? 'Lic: '+d.license_no : ''}</div>
        </div>
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
      win.document.close();
    } catch(e) { toast('Error generating prescription', 'error'); console.error(e); }
  },

  /* ── PATIENT FULL MEDICAL FILE ────────────────────────── */
  async printPatientFile(patientId) {
    try {
      toast('Generating medical file…', 'info');
      const [patient, treatments, appointments, xrays] = await Promise.all([
        DB.tables.patients.find(patientId),
        DB.fetch(`/treatments?patient_id=${patientId}`),
        DB.fetch(`/appointments?patient_id=${patientId}`),
        DB.xrays.byPatient(patientId).catch(() => [])
      ]);
      const doctors = await DB.tables.doctors.all();
      const dcMap = Object.fromEntries(doctors.map(d => [d.id, d.full_name]));

      const txRows = treatments.map(t => `
        <tr><td>${t.date}</td><td>${dcMap[t.doctor_id]||'—'}</td><td>${t.treatment_type}</td>
        <td>${t.tooth_number||'—'}</td><td>${fmt(t.cost)}</td><td>${t.diagnosis||'—'}</td>
        <td>${t.prescription||'—'}</td></tr>`).join('') || '<tr><td colspan="7">No treatments</td></tr>';

      const apptRows = appointments.map(a => `
        <tr><td>${a.date}</td><td>${a.time}</td><td>${dcMap[a.doctor_id]||'—'}</td>
        <td>${a.treatment_type||'—'}</td><td>${a.status}</td></tr>`).join('') || '<tr><td colspan="5">No appointments</td></tr>';

      const settings = await DB.settings.get().catch(() => ({}));
      const clinicName = settings?.clinic_name || 'DentCare Pro';

      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head>
        <title>Medical File — ${patient.full_name}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:2rem;color:#1a1a1a;font-size:.9rem}
          h1{color:#7c3aed}h2{color:#7c3aed;margin-top:2rem;border-bottom:2px solid #7c3aed;padding-bottom:.25rem}
          table{width:100%;border-collapse:collapse;margin:.75rem 0}
          th{background:#7c3aed;color:#fff;padding:.4rem;text-align:left;font-size:.8rem}
          td{padding:.35rem;border-bottom:1px solid #eee;font-size:.8rem}
          .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin:.75rem 0}
          .info-item label{font-size:.72rem;color:#888;display:block}
          .info-item span{font-weight:600}
          @media print{@page{margin:1cm}}
        </style></head><body>
        <h1>🦷 ${clinicName} — Patient Medical File</h1>
        <p>Generated: ${new Date().toLocaleString()} · Patient #${patient.patient_no}</p>
        <h2>Personal Information</h2>
        <div class="info-grid">
          <div class="info-item"><label>Full Name</label><span>${patient.full_name}</span></div>
          <div class="info-item"><label>Phone</label><span>${patient.phone||'—'}</span></div>
          <div class="info-item"><label>Date of Birth</label><span>${patient.date_of_birth||'—'}</span></div>
          <div class="info-item"><label>Age</label><span>${patient.age||'—'}</span></div>
          <div class="info-item"><label>Gender</label><span>${patient.gender||'—'}</span></div>
          <div class="info-item"><label>Blood Type</label><span>${patient.blood_type||'—'}</span></div>
          <div class="info-item"><label>Insurance</label><span>${patient.insurance||'—'}</span></div>
          <div class="info-item"><label>Email</label><span>${patient.email||'—'}</span></div>
          <div class="info-item"><label>Address</label><span>${patient.address||'—'}</span></div>
          <div class="info-item"><label>Medical Conditions</label><span>${patient.medical_conditions||'None'}</span></div>
          <div class="info-item"><label>Allergies</label><span>${patient.allergies||'None'}</span></div>
          <div class="info-item"><label>Dental Concerns</label><span>${patient.dental_concerns||'—'}</span></div>
        </div>
        <h2>Treatment History (${treatments.length})</h2>
        <table><thead><tr><th>Date</th><th>Doctor</th><th>Treatment</th><th>Teeth</th><th>Cost</th><th>Diagnosis</th><th>Prescription</th></tr></thead>
        <tbody>${txRows}</tbody></table>
        <h2>Appointment History (${appointments.length})</h2>
        <table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Treatment</th><th>Status</th></tr></thead>
        <tbody>${apptRows}</tbody></table>
        ${xrays.length ? `<h2>X-Ray Gallery (${xrays.length})</h2>
          <div style="display:flex;flex-wrap:wrap;gap:1rem">
          ${xrays.map(x=>`<div style="text-align:center;width:150px"><img src="${x.url}" style="width:150px;height:120px;object-fit:cover;border-radius:6px"><div style="font-size:.7rem;color:#666">${x.xray_date}</div></div>`).join('')}
          </div>` : ''}
        <script>window.onload=()=>window.print()</script>
      </body></html>`);
      win.document.close();
    } catch(e) { toast('Error generating medical file', 'error'); console.error(e); }
  },

  /* ── XRAY GALLERY ─────────────────────────────────────── */
  async xrayGallery(patientId) {
    let xrays = await DB.xrays.byPatient(patientId).catch(() => []);
    const patient = await DB.tables.patients.find(patientId).catch(() => null);

    const render = (list) => {
      const container = $('xrayGalleryGrid');
      if (!container) return;
      container.innerHTML = list.length === 0
        ? `<p style="color:var(--text2);text-align:center;padding:2rem">No X-rays uploaded yet</p>`
        : list.map(x => `
          <div style="position:relative">
            <img src="${x.url}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;cursor:pointer"
                 onclick="window.open('${x.url}','_blank')">
            <div style="font-size:.75rem;color:var(--text2);margin-top:.25rem">${x.xray_date}${x.notes?'<br>'+x.notes:''}</div>
            <button style="position:absolute;top:4px;right:4px;background:var(--red);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:.7rem;line-height:1"
                    onclick="XrayGallery._delete(${x.id},${patientId})">✕</button>
          </div>`).join('');
    };

    // Make XrayGallery actions accessible
    window.XrayGallery = {
      async _delete(xrayId, pid) {
        if (!confirm('Delete this X-ray?')) return;
        try {
          await DB.xrays.delete(xrayId);
          xrays = await DB.xrays.byPatient(pid);
          render(xrays);
          toast('X-ray deleted', 'info');
        } catch(e) { toast('Delete failed', 'error'); }
      },
      async _upload(pid) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const url = ev.target.result; // Static mode: base64 IS the URL
              const xrayDate = $('xrayGalleryDate')?.value || today();
              const notes    = $('xrayGalleryNotes')?.value || '';
              await DB.xrays.add({ patient_id: pid, url, xray_date: xrayDate, notes });
              xrays = await DB.xrays.byPatient(pid);
              render(xrays);
              toast('X-ray uploaded ✓', 'success');
            };
            reader.readAsDataURL(file);
          } catch(err) { toast('Upload failed: '+err.message, 'error'); }
        };
        input.click();
      }
    };

    const html = `
    <div id="xrayGalleryModal" class="modal-overlay open" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:700px;max-height:90vh;overflow-y:auto">
        <div class="modal-head">
          <h3>🩻 X-Ray Gallery — ${patient?.full_name || ''}</h3>
          <button class="close-btn" onclick="$('xrayGalleryModal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:.75rem;margin-bottom:1rem;align-items:flex-end;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:130px"><label>X-ray Date</label><input id="xrayGalleryDate" type="date" value="${today()}"></div>
            <div class="form-group" style="flex:2;min-width:160px"><label>Notes</label><input id="xrayGalleryNotes" placeholder="Optional notes…"></div>
            <button class="btn-primary" onclick="XrayGallery._upload(${patientId})">📤 Upload X-ray</button>
          </div>
          <div id="xrayGalleryGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem"></div>
        </div>
        <div class="modal-foot"><button class="btn-ghost" onclick="$('xrayGalleryModal').remove()">Close</button></div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    render(xrays);
  },

  /* ── FOLLOW-UP ALERTS CHECK ───────────────────────────── */
  async checkFollowUps() {
    try {
      // Use reminders API for follow-ups (faster, server-filtered)
      const [due, overduePayments] = await Promise.all([
        DB.reminders.followups(3).catch(() => null),
        DB.reminders.overdueInstallments().catch(() => [])
      ]);

      // Fallback: query locally if API fails
      let followUps = due;
      if (!followUps) {
        const treatments = await DB.tables.treatments.all();
        const today_str  = today();
        const soon       = new Date();
        soon.setDate(soon.getDate() + 3);
        const soonStr    = soon.toISOString().split('T')[0];
        const patients   = await DB.tables.patients.all();
        const ptMap      = Object.fromEntries(patients.map(p => [p.id, p.full_name]));
        followUps = treatments
          .filter(t => t.follow_up === 1 && t.follow_up_date && t.follow_up_date >= today_str && t.follow_up_date <= soonStr)
          .map(t => ({ ...t, patient_name: ptMap[t.patient_id] || 'Patient #' + t.patient_id }));
      }

      if (!followUps.length && !overduePayments.length) {
        toast('No follow-ups or overdue payments due', 'info');
        return;
      }

      const today_str = today();

      const followUpHtml = followUps.length ? `
        <div style="font-size:.85rem;font-weight:600;color:var(--text2);margin-bottom:.5rem">🔄 Follow-up Reminders</div>
        ${followUps.map(t => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem;border-bottom:1px solid var(--border)">
            <div>
              <strong>${t.patient_name}</strong>
              <span style="color:var(--text2);font-size:.85rem"> · ${t.treatment_type}</span>
              ${t.patient_phone ? `<br><span style="font-size:.75rem;color:var(--text2)">${t.patient_phone}</span>` : ''}
            </div>
            <div style="text-align:right">
              <span style="color:${t.follow_up_date === today_str ? 'var(--red)' : 'var(--orange)'};font-weight:600">
                ${t.follow_up_date === today_str ? 'TODAY' : t.follow_up_date}
              </span>
              ${t.patient_phone ? `<br><button class="action-btn" style="font-size:.7rem;margin-top:.2rem"
                onclick="Modals.sendWhatsAppReminder('${t.patient_phone}','${(t.patient_name||'').replace(/'/g,"\\'")}','${t.follow_up_date}','—','${(t.doctor_name||'').replace(/'/g,"\\'")}')">💬 WA</button>` : ''}
            </div>
          </div>`).join('')}
      ` : '';

      const overdueHtml = overduePayments.length ? `
        <div style="font-size:.85rem;font-weight:600;color:var(--text2);margin:1rem 0 .5rem">💰 Overdue Installments</div>
        ${overduePayments.slice(0, 5).map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem;border-bottom:1px solid var(--border)">
            <div>
              <strong>${p.patient_name || '—'}</strong>
              <span style="color:var(--text2);font-size:.85rem"> · Installment #${p.installment_no}</span>
            </div>
            <span style="color:var(--red);font-weight:600">${fmt(p.amount)} — due ${p.due_date}</span>
          </div>`).join('')}
        ${overduePayments.length > 5 ? `<div style="font-size:.8rem;color:var(--text2);padding:.5rem">+${overduePayments.length-5} more…</div>` : ''}
      ` : '';

      const html = `
      <div id="followUpAlert" class="modal-overlay open" onclick="if(event.target===this)this.remove()">
        <div class="modal modal-sm">
          <div class="modal-head"><h3>🔔 Alerts & Reminders</h3><button class="close-btn" onclick="$('followUpAlert').remove()">✕</button></div>
          <div class="modal-body" style="max-height:60vh;overflow-y:auto">
            ${followUpHtml}${overdueHtml}
          </div>
          <div class="modal-foot">
            <button class="btn-ghost" onclick="$('followUpAlert').remove()">Dismiss</button>
            ${followUps.length ? `<button class="btn-primary" onclick="App.page('treatments');$('followUpAlert').remove()">View Treatments</button>` : ''}
          </div>
        </div>
      </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } catch(e) { console.error('checkFollowUps error:', e); }
  },

  /* ── WHATSAPP / SMS APPOINTMENT REMINDER ─────────────── */
  sendWhatsAppReminder(phone, patientName, date, time, doctorName) {
    const clinicName = document.querySelector('.brand-name')?.textContent || 'DentCare Pro';
    // Normalize phone — add Egypt country code if needed
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '20' + cleanPhone.slice(1);
    if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;

    const msgEn = `Hello ${patientName},\n\nThis is a reminder from ${clinicName}.\n\nYour appointment is scheduled for:\n📅 Date: ${date}\n🕐 Time: ${time}\n👨‍⚕️ Doctor: ${doctorName}\n\nPlease arrive 10 minutes early. Call us if you need to reschedule.\n\nThank you!`;
    const msgAr = `مرحباً ${patientName},\n\nتذكير من ${clinicName}\n\nموعدك:\n📅 التاريخ: ${date}\n🕐 الوقت: ${time}\n👨‍⚕️ الدكتور: ${doctorName}\n\nيرجى الحضور قبل 10 دقائق. شكراً لك!`;
    const isAr  = document.body.classList.contains('lang-ar');
    const msg   = encodeURIComponent(isAr ? msgAr : msgEn);
    const url   = `https://wa.me/${cleanPhone}?text=${msg}`;
    window.open(url, '_blank');
  },

  /* ── ARABIC / LANGUAGE TOGGLE (handled by CSS class on body) */
  /* Keep toggleArabic as an alias for backward compatibility */
  toggleArabic() { this.toggleLanguage(); },

  /* ── BILINGUAL TOGGLE: cycles EN ↔ AR ─────────────────────────── */
  toggleLanguage() {
    const body  = document.body;
    const wasAr = body.classList.contains('lang-ar');

    // Toggle: EN → AR → EN
    const nextLang = wasAr ? 'en' : 'ar';

    // Remove all lang classes (also cleans up any legacy lang-fr)
    body.classList.remove('lang-ar', 'lang-fr');

    // Apply new lang class
    if (nextLang === 'ar') body.classList.add('lang-ar');

    // Persist choice
    localStorage.setItem('dentcare_lang', nextLang);

    // Toast notification
    const toastMsgs = {
      ar: 'تم التبديل إلى العربية 🌐',
      en: 'Switched to English 🌐'
    };
    toast(toastMsgs[nextLang] || toastMsgs.en, 'success');

    // Update all translatable elements (data-en / data-ar)
    document.querySelectorAll('[data-en]').forEach(el => {
      el.textContent = (nextLang === 'ar')
        ? (el.dataset.ar || el.dataset.en)
        : el.dataset.en;
    });

    // Update lang toggle button label: show the NEXT language the button will switch to
    const btn = document.getElementById('langToggleBtn');
    if (btn) {
      btn.textContent = (nextLang === 'ar') ? '🌐 EN' : '🌐 AR';
    }

    // Update RTL direction for Arabic only
    document.documentElement.dir = (nextLang === 'ar') ? 'rtl' : 'ltr';

    // Update page title for current page
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) {
      const pageTitles = {
        en: {
          dashboard: 'Dashboard', patients: 'Patients', appointments: 'Appointments',
          treatments: 'Treatments', doctors: 'Doctors', finance: 'Finance',
          inventory: 'Inventory', analytics: 'Analytics', settings: 'Settings',
          waiting: 'Waiting Room', calendar: 'Calendar', commissions: 'Commissions',
          installments: 'Payment Plans', passwords: 'Passwords', messages: 'Messages',
          backup: 'Backup & Restore', discount_codes: 'Discount Codes'
        },
        ar: {
          dashboard: 'لوحة التحكم', patients: 'المرضى', appointments: 'المواعيد',
          treatments: 'العلاجات', doctors: 'الأطباء', finance: 'المالية',
          inventory: 'المخزون', analytics: 'التحليلات', settings: 'الإعدادات',
          waiting: 'غرفة الانتظار', calendar: 'التقويم', commissions: 'العمولات',
          installments: 'خطط الدفع', passwords: 'كلمات المرور', messages: 'الرسائل',
          backup: 'النسخ الاحتياطي', discount_codes: 'أكواد الخصم'
        }
      };
      const cur    = typeof App !== 'undefined' ? App.currentPage : 'dashboard';
      const titles = pageTitles[nextLang] || pageTitles.en;
      if (titles[cur]) pageTitleEl.textContent = titles[cur];
    }
  }
};
