/* ═══════════════════════════════════════════════════════
   DentCare Pro — Diagnostic Imaging System
   ═══════════════════════════════════════════════════════ */
const ImagingPage = (() => {

  let _images   = [];
  let _patients = [];
  let _editing  = null;
  let _view     = 'gallery';  // 'gallery' | 'list' | 'upload'
  let _viewer   = null;       // currently viewed image object

  const MODALITIES = [
    { id:'X-Ray',      icon:'🦷', color:'#5b6cf9', desc:'Standard dental X-ray' },
    { id:'OPG',        icon:'🖼️', color:'#38c9a0', desc:'Orthopantomogram (full mouth panoramic)' },
    { id:'CBCT',       icon:'🧊', color:'#f59344', desc:'Cone Beam CT (3D volumetric)' },
    { id:'Periapical', icon:'🔬', color:'#e06bb0', desc:'Periapical (single tooth root)' },
    { id:'Bitewing',   icon:'📐', color:'#2dcfc8', desc:'Bitewing (crown & bone)' },
    { id:'Intraoral',  icon:'📷', color:'#f5c842', desc:'Intraoral photo' },
    { id:'Other',      icon:'📎', color:'#8a96b5', desc:'Other imaging' },
  ];

  const today = () => new Date().toISOString().split('T')[0];
  const fmt   = n  => Number(n||0).toLocaleString();
  const mod   = id => MODALITIES.find(m=>m.id===id) || MODALITIES[MODALITIES.length-1];

  /* ── KPIs ─────────────────────────────────────────── */
  function renderKpis(stats) {
    const el = document.getElementById('imgKpis');
    if (!el) return;
    el.innerHTML = [
      { icon:'🖼️', label:'Total Images',    val:stats.total||0,      c:'var(--accent)' },
      { icon:'👤', label:'Patients Imaged', val:stats.patients||0,   c:'var(--teal)' },
      { icon:'📅', label:'Today',           val:stats.today||0,      c:'var(--green)' },
      { icon:'🦷', label:'X-Rays',          val:stats.xray||0,       c:'#5b6cf9' },
      { icon:'🖼️', label:'OPG',             val:stats.opg||0,        c:'#38c9a0' },
      { icon:'🧊', label:'CBCT',            val:stats.cbct||0,       c:'#f59344' },
    ].map((k,i)=>`
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>`).join('');
  }

  /* ── Modality filter tabs ─────────────────────────── */
  function renderModalityTabs() {
    const el = document.getElementById('imgModalityTabs');
    if (!el) return;
    el.innerHTML = `<button class="ftab active" onclick="ImagingPage.filterModality('')" id="imgModAll">All</button>` +
      MODALITIES.map(m=>`
        <button class="ftab" onclick="ImagingPage.filterModality('${m.id}')" id="imgMod-${m.id.replace('/','')}"
          style="border-color:${m.color}22">
          ${m.icon} ${m.id}
        </button>`).join('');
  }

  /* ── Gallery grid ─────────────────────────────────── */
  function renderGallery(list) {
    const el = document.getElementById('imgGallery');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div>🖼️</div><p>No images found. Upload the first scan!</p></div>`;
      return;
    }
    el.innerHTML = list.map((img, i) => {
      const m = mod(img.modality);
      const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(img.url);
      const thumb = isImg ? img.url : null;
      return `
        <div class="img-card" style="--mod-col:${m.color};--i:${i}" onclick="ImagingPage.openViewer(${img.id})">
          <div class="img-thumb" style="${thumb?`background-image:url('${thumb}')`:`background:${m.color}18`}">
            ${!thumb ? `<span style="font-size:2.5rem">${m.icon}</span>` : ''}
            <div class="img-modality-badge" style="background:${m.color};color:#fff">${m.icon} ${img.modality||'X-Ray'}</div>
          </div>
          <div class="img-card-body">
            <div class="img-patient">${img.patient_name||'Unknown'}</div>
            <div class="img-meta">
              <span>${img.xray_date||'—'}</span>
              ${img.tooth_number?`<span>Tooth ${img.tooth_number}</span>`:''}
            </div>
            ${img.diagnosis?`<div class="img-diag">${img.diagnosis}</div>`:''}
            ${img.notes?`<div class="img-notes">${img.notes}</div>`:''}
            <div class="img-card-foot">
              <button class="action-btn" onclick="event.stopPropagation();ImagingPage.editImage(${img.id})">✏️</button>
              <button class="action-btn danger" onclick="event.stopPropagation();ImagingPage.delImage(${img.id})">🗑</button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* ── List view ────────────────────────────────────── */
  function renderList(list) {
    const el = document.getElementById('imgListBody');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<tr><td colspan="8"><div class="empty-state sm"><div>🖼️</div><p>No images found</p></div></td></tr>`;
      return;
    }
    el.innerHTML = list.map(img => {
      const m = mod(img.modality);
      const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(img.url);
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem">
            <div class="img-list-thumb" style="${isImg?`background-image:url('${img.url}')`:''};border-color:${m.color}44">
              ${!isImg?`<span>${m.icon}</span>`:''}
            </div>
            <div>
              <div style="font-weight:600;font-size:.85rem;color:var(--text)">${img.patient_name||'—'}</div>
              <div style="font-size:.72rem;color:var(--text3)">${img.xray_date||'—'}</div>
            </div>
          </div>
        </td>
        <td><span class="badge" style="background:${m.color}18;border:1px solid ${m.color}44;color:${m.color}">${m.icon} ${img.modality||'X-Ray'}</span></td>
        <td style="font-size:.82rem">${img.tooth_number||'—'}</td>
        <td style="font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${img.diagnosis||'—'}</td>
        <td style="font-size:.82rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${img.notes||'—'}</td>
        <td>
          ${img.tags ? img.tags.split(',').map(t=>`<span class="img-tag">${t.trim()}</span>`).join('') : '—'}
        </td>
        <td><button class="btn-ghost" style="font-size:.72rem;padding:.28rem .7rem" onclick="ImagingPage.openViewer(${img.id})">🔍 View</button></td>
        <td style="display:flex;gap:.3rem">
          <button class="action-btn" onclick="ImagingPage.editImage(${img.id})">✏️</button>
          <button class="action-btn danger" onclick="ImagingPage.delImage(${img.id})">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  /* ── Switch view ──────────────────────────────────── */
  function switchView(v) {
    _view = v;
    ['gallery','list','upload'].forEach(tab=>{
      document.getElementById(`imgTab-${tab}`)?.classList.toggle('active', tab===v);
      document.getElementById(`imgPane-${tab}`)?.style.setProperty('display', tab===v?'block':'none');
    });
  }

  /* ── Viewer ───────────────────────────────────────── */
  function openViewer(img) {
    _viewer = img;
    const m = mod(img.modality);
    const overlay = document.getElementById('imgViewerOverlay');
    if (!overlay) return;
    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(img.url);
    document.getElementById('imgViewerTitle').textContent = `${m.icon} ${img.modality||'X-Ray'} — ${img.patient_name||'Patient'}`;
    const frame = document.getElementById('imgViewerFrame');
    if (isImg) {
      frame.innerHTML = `
        <div class="img-viewer-tools">
          <button onclick="ImagingPage.zoomIn()" title="Zoom In">🔍＋</button>
          <button onclick="ImagingPage.zoomOut()" title="Zoom Out">🔍－</button>
          <button onclick="ImagingPage.rotate()" title="Rotate">🔄</button>
          <button onclick="ImagingPage.resetView()" title="Reset">↺</button>
          <button onclick="ImagingPage.invertImg()" title="Invert">◑</button>
          <button onclick="ImagingPage.brightenImg(1)" title="Brighter">☀️</button>
          <button onclick="ImagingPage.brightenImg(-1)" title="Darker">🌑</button>
          <a href="${img.url}" download target="_blank"><button>⬇ Download</button></a>
        </div>
        <div class="img-viewer-canvas" id="imgViewCanvas">
          <img id="imgViewImg" src="${img.url}" alt="Diagnostic Image"
            style="max-width:100%;max-height:65vh;object-fit:contain;cursor:zoom-in;
            transition:transform .3s ease,filter .3s ease;border-radius:8px">
        </div>`;
      document.getElementById('imgViewImg').addEventListener('click', () => ImagingPage.zoomIn());
    } else {
      frame.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text2)">
        <div style="font-size:4rem;margin-bottom:1rem">${m.icon}</div>
        <div style="font-size:1rem;margin-bottom:1rem">${img.modality} file — preview not available</div>
        <a href="${img.url}" target="_blank" class="btn-primary" style="text-decoration:none;padding:.7rem 1.5rem;border-radius:999px">⬇ Open / Download</a>
      </div>`;
    }
    document.getElementById('imgViewerPatient').textContent  = img.patient_name||'—';
    document.getElementById('imgViewerDate').textContent     = img.xray_date||'—';
    document.getElementById('imgViewerTooth').textContent    = img.tooth_number||'—';
    document.getElementById('imgViewerDiag').textContent     = img.diagnosis||'—';
    document.getElementById('imgViewerNotes').textContent    = img.notes||'—';
    document.getElementById('imgViewerTags').innerHTML       = img.tags
      ? img.tags.split(',').map(t=>`<span class="img-tag">${t.trim()}</span>`).join('')  : '—';
    overlay.classList.add('open');
  }

  let _zoom = 1, _rot = 0, _bright = 100, _invert = 0;
  function applyImgFilter() {
    const img = document.getElementById('imgViewImg');
    if (!img) return;
    img.style.transform = `scale(${_zoom}) rotate(${_rot}deg)`;
    img.style.filter = `brightness(${_bright}%) invert(${_invert}%)`;
  }

  /* ── Fill upload/edit form ────────────────────────── */
  function fillModalityOptions(selected) {
    const sel = document.getElementById('imgModalModality');
    if (!sel) return;
    sel.innerHTML = MODALITIES.map(m =>
      `<option value="${m.id}" ${selected===m.id?'selected':''}>${m.icon} ${m.id} — ${m.desc}</option>`
    ).join('');
  }

  function fillPatientOptions(selected) {
    const sel = document.getElementById('imgModalPatient');
    if (!sel) return;
    sel.innerHTML = `<option value="">— Select patient —</option>` +
      _patients.map(p=>`<option value="${p.id}" ${p.id==selected?'selected':''}>${p.full_name}</option>`).join('');
  }

  /* ── PUBLIC ───────────────────────────────────────── */
  return {
    async render() {
      try {
        const [imgs, pts, stats] = await Promise.all([
          DB.xrays.gallery(),
          DB.tables.patients.all(),
          DB.xrays.stats(),
        ]);
        _images   = Array.isArray(imgs) ? imgs : [];
        _patients = Array.isArray(pts)  ? pts  : [];
        renderKpis(stats||{});
        renderModalityTabs();
        renderGallery(_images);
        renderList(_images);
        fillPatientOptions('');
        fillModalityOptions('X-Ray');
        switchView(_view);
      } catch(e) { console.error(e); toast('Failed to load imaging data','error'); }
    },

    switchView,

    filterModality(mod) {
      // update active tab
      document.querySelectorAll('#imgModalityTabs .ftab').forEach(b=>b.classList.remove('active'));
      const activeBtn = mod ? document.getElementById(`imgMod-${mod.replace('/','')}`): document.getElementById('imgModAll');
      if (activeBtn) activeBtn.classList.add('active');
      const list = mod ? _images.filter(i=>i.modality===mod) : _images;
      renderGallery(list);
      renderList(list);
    },

    searchImages() {
      const q = (document.getElementById('imgSearch')?.value||'').toLowerCase();
      const list = !q ? _images : _images.filter(i=>
        (i.patient_name||'').toLowerCase().includes(q) ||
        (i.diagnosis||'').toLowerCase().includes(q) ||
        (i.notes||'').toLowerCase().includes(q) ||
        (i.tooth_number||'').toLowerCase().includes(q) ||
        (i.tags||'').toLowerCase().includes(q)
      );
      renderGallery(list);
      renderList(list);
    },

    openViewer(id) {
      const img = _images.find(i=>i.id===id);
      if (!img) return;
      _zoom = 1; _rot = 0; _bright = 100; _invert = 0;
      openViewer(img);
    },
    closeViewer() { document.getElementById('imgViewerOverlay').classList.remove('open'); },
    zoomIn()   { _zoom = Math.min(_zoom + 0.25, 5);   applyImgFilter(); },
    zoomOut()  { _zoom = Math.max(_zoom - 0.25, 0.25); applyImgFilter(); },
    rotate()   { _rot = (_rot + 90) % 360;             applyImgFilter(); },
    resetView(){ _zoom=1; _rot=0; _bright=100; _invert=0; applyImgFilter(); },
    invertImg(){ _invert = _invert===0?100:0;           applyImgFilter(); },
    brightenImg(d){ _bright = Math.min(200,Math.max(20,_bright+d*15)); applyImgFilter(); },

    openUpload() {
      _editing = null;
      fillPatientOptions('');
      fillModalityOptions('X-Ray');
      document.getElementById('imgModalTitle').textContent   = '📤 Upload Diagnostic Image';
      ['imgModalNotes','imgModalDiag','imgModalTooth','imgModalTags','imgModalUrl','imgModalBodyPart'].forEach(id=>{
        const e=document.getElementById(id); if(e) e.value='';
      });
      document.getElementById('imgModalDate').value = today();
      document.getElementById('imgUploadModal').classList.add('open');
    },

    editImage(id) {
      _editing = _images.find(i=>i.id===id);
      if (!_editing) return;
      const e = _editing;
      fillPatientOptions(e.patient_id);
      fillModalityOptions(e.modality||'X-Ray');
      document.getElementById('imgModalTitle').textContent = '✏️ Edit Image Record';
      document.getElementById('imgModalDate').value      = e.xray_date||'';
      document.getElementById('imgModalUrl').value       = e.url||'';
      document.getElementById('imgModalNotes').value     = e.notes||'';
      document.getElementById('imgModalDiag').value      = e.diagnosis||'';
      document.getElementById('imgModalTooth').value     = e.tooth_number||'';
      document.getElementById('imgModalTags').value      = e.tags||'';
      document.getElementById('imgModalBodyPart').value  = e.body_part||'';
      document.getElementById('imgUploadModal').classList.add('open');
    },

    closeUploadModal() { document.getElementById('imgUploadModal').classList.remove('open'); },

    /* File → base64 then save as URL */
    handleFile(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        // Show preview
        const prev = document.getElementById('imgFilePreview');
        if (prev) {
          if (file.type.startsWith('image/')) {
            prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:140px;border-radius:8px;object-fit:contain">`;
          } else {
            prev.innerHTML = `<div style="padding:1rem;color:var(--text2);font-size:.82rem">📎 ${file.name}</div>`;
          }
        }
        // Store as data URL in the url field
        document.getElementById('imgModalUrl').value = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    async saveImage() {
      const patient_id = document.getElementById('imgModalPatient')?.value;
      const url        = document.getElementById('imgModalUrl')?.value?.trim();
      const xray_date  = document.getElementById('imgModalDate')?.value;
      const modality   = document.getElementById('imgModalModality')?.value || 'X-Ray';
      const body_part  = document.getElementById('imgModalBodyPart')?.value?.trim()||null;
      const tooth_number=document.getElementById('imgModalTooth')?.value?.trim()||null;
      const diagnosis  = document.getElementById('imgModalDiag')?.value?.trim()||null;
      const notes      = document.getElementById('imgModalNotes')?.value?.trim()||null;
      const tags       = document.getElementById('imgModalTags')?.value?.trim()||null;

      if (!patient_id) return toast('Please select a patient','error');
      if (!url && !_editing) return toast('Please upload a file or enter a URL','error');

      try {
        const body = { patient_id, xray_date:xray_date||today(), modality, body_part, tooth_number, diagnosis, notes, tags };
        if (url) body.url = url;

        let res;
        if (_editing) {
          res = { ok: true, json: async () => await DB.xrays.update(_editing.id, body) };
        } else {
          if (!body.url) return toast('File required','error');
          res = { ok: true, json: async () => await DB.xrays.add(body) };
        }
        if (!res.ok) throw new Error((await res.json()).error||'Failed');
        toast(_editing ? '✅ Image updated' : '✅ Image uploaded', 'success');
        this.closeUploadModal();
        this.render();
      } catch(e) { toast('Error: '+e.message,'error'); }
    },

    async delImage(id) {
      if (!confirm('Delete this image permanently?')) return;
      await DB.xrays.delete(id);
      toast('Image deleted','success');
      this.render();
    },
  };
})();
