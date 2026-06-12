/* ═══════════════════════════════════════════════════════
   DentCare Pro — Feedback Page
   ═══════════════════════════════════════════════════════ */

const FeedbackPage = (() => {
  let _all = [];

  /* ── Stars helper ─────────────────────────────────── */
  function starsHtml(val, max=5) {
    let s = '';
    for (let i=1; i<=max; i++) {
      s += `<span style="color:${i<=val?'#f5c842':'rgba(160,180,220,0.4)'};font-size:1.1rem">★</span>`;
    }
    return s;
  }

  function buildStarPickers() {
    document.querySelectorAll('.star-picker').forEach(wrap => {
      const field = wrap.dataset.field;
      wrap.innerHTML = '';
      for (let i=1; i<=5; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = '★';
        btn.className = 'fb-star-btn';
        btn.dataset.val = i;
        btn.dataset.field = field;
        btn.onclick = () => setStars(field, i);
        wrap.appendChild(btn);
      }
      setStars(field, 0, true);
    });
  }

  function setStars(field, val, init=false) {
    if (!init) document.getElementById(field).value = val;
    document.querySelectorAll(`.fb-star-btn[data-field="${field}"]`).forEach(btn => {
      btn.style.color = parseInt(btn.dataset.val) <= val ? '#f5c842' : 'rgba(160,180,220,0.4)';
    });
  }

  /* ── KPI row ──────────────────────────────────────── */
  function renderKpis(data) {
    const o = data.overall || {};
    const kpis = [
      { icon:'⭐', label:'Avg Overall',      val: o.avg_overall     ? o.avg_overall.toFixed(1)+' / 5'     : '—', c:'var(--yellow)' },
      { icon:'⏱️', label:'Avg Wait Time',    val: o.avg_wait        ? o.avg_wait.toFixed(1)+' / 5'        : '—', c:'var(--accent)' },
      { icon:'🩺', label:"Doctor's Time",    val: o.avg_doctor_time ? o.avg_doctor_time.toFixed(1)+' / 5' : '—', c:'var(--accent2)' },
      { icon:'✨', label:'Cleanliness',       val: o.avg_clean       ? o.avg_clean.toFixed(1)+' / 5'      : '—', c:'var(--teal)' },
      { icon:'💬', label:'Total Reviews',    val: o.total || 0,                                              c:'var(--pink)' },
    ];
    const el = document.getElementById('fbKpiRow');
    if (!el) return;
    el.innerHTML = kpis.map((k,i) => `
      <div class="an-kpi-card" style="--i:${i};--c:${k.c}">
        <div class="ankpi-icon">${k.icon}</div>
        <div class="ankpi-val" style="color:${k.c}">${k.val}</div>
        <div class="ankpi-label">${k.label}</div>
      </div>
    `).join('');
  }

  /* ── Feedback cards ───────────────────────────────── */
  function renderCards(list) {
    const grid = document.getElementById('fbGrid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state"><div>💬</div><p>No feedback yet. Add the first one!</p></div>`;
      return;
    }
    grid.innerHTML = list.map((f, idx) => {
      const stars = (v, max=5) => Array.from({length:max},(_,i)=>
        `<span style="color:${i<v?'#f5c842':'rgba(160,180,220,0.4)'};font-size:1rem">★</span>`
      ).join('');
      const date = f.visit_date ? new Date(f.visit_date).toLocaleDateString() : new Date(f.created_at).toLocaleDateString();
      const overall = f.rating_overall || 0;
      const sentiment = overall >= 4 ? '#38c9a0' : overall >= 3 ? '#f5c842' : '#f05c6e';
      return `
        <div class="fb-card" style="--sent:${sentiment};--i:${idx}">
          <div class="fb-card-top">
            <div class="fb-card-who">
              <div class="fb-avatar" style="background:${sentiment}22;border:2px solid ${sentiment}44;color:${sentiment}">
                ${(f.patient_name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div class="fb-patient-name">${f.patient_name||'Anonymous'}</div>
                <div class="fb-doctor-name">→ Dr. ${f.doctor_name||'Unknown'}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <div style="font-size:1.35rem">${stars(overall)}</div>
              <div style="font-size:.72rem;color:var(--text3)">${date}</div>
            </div>
          </div>
          <div class="fb-ratings-row">
            ${f.rating_wait_time ? `<div class="fb-sub-rating"><span>⏱️ Wait</span>${stars(f.rating_wait_time)}</div>` : ''}
            ${f.rating_doctor_time ? `<div class="fb-sub-rating"><span>🩺 Doctor</span>${stars(f.rating_doctor_time)}</div>` : ''}
            ${f.rating_cleanliness ? `<div class="fb-sub-rating"><span>✨ Clean</span>${stars(f.rating_cleanliness)}</div>` : ''}
          </div>
          ${f.comment ? `<div class="fb-comment">"${f.comment}"</div>` : ''}
          <div class="fb-card-foot">
            <span class="badge ${overall>=4?'badge-confirmed':overall>=3?'badge-urgent':'badge-emergency'}">
              ${overall>=4?'Positive':overall>=3?'Neutral':'Negative'}
            </span>
            <button class="action-btn danger" onclick="FeedbackPage.del(${f.id})">🗑 Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ── Public API ───────────────────────────────────── */
  return {
    async render() {
      try {
        const [feedbacks, analytics] = await Promise.all([
          DB.tables.feedback.all(),
          Promise.resolve({ average_rating: 0, total: 0 })
        ]);
        _all = Array.isArray(feedbacks) ? feedbacks : [];
        renderKpis(analytics);
        renderCards(_all);

        // populate doctor filter
        const doctors = [...new Set(_all.map(f=>f.doctor_name).filter(Boolean))];
        const sel = document.getElementById('fbDoctorFilter');
        if (sel) {
          const existing = [...sel.options].map(o=>o.value);
          doctors.forEach(d => {
            if (!existing.includes(d)) {
              const opt = document.createElement('option');
              opt.value = d; opt.textContent = d;
              sel.appendChild(opt);
            }
          });
        }
      } catch(e) {
        console.error('Feedback render error:', e);
        toast('Failed to load feedback', 'error');
      }
    },

    filter() {
      const q   = (document.getElementById('fbSearch')?.value||'').toLowerCase();
      const doc = document.getElementById('fbDoctorFilter')?.value||'';
      const rat = document.getElementById('fbRatingFilter')?.value||'';
      const filtered = _all.filter(f => {
        const matchQ   = !q   || (f.patient_name||'').toLowerCase().includes(q) || (f.doctor_name||'').toLowerCase().includes(q) || (f.comment||'').toLowerCase().includes(q);
        const matchDoc = !doc || f.doctor_name === doc;
        const matchRat = !rat || f.rating_overall == rat;
        return matchQ && matchDoc && matchRat;
      });
      renderCards(filtered);
    },

    async openAdd() {
      try {
        const [patients, doctors] = await Promise.all([
          DB.tables.patients.all(),
          DB.tables.doctors.all()
        ]);
        const pSel = document.getElementById('fbPatientSel');
        const dSel = document.getElementById('fbDoctorSel');
        pSel.innerHTML = '<option value="">— Anonymous —</option>' +
          (patients||[]).map(p=>`<option value="${p.id}">${p.full_name}</option>`).join('');
        dSel.innerHTML = '<option value="">Select doctor...</option>' +
          (doctors||[]).map(d=>`<option value="${d.id}">${d.full_name}</option>`).join('');
        document.getElementById('fbVisitDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('fbComment').value = '';
        buildStarPickers();
        document.getElementById('fbModal').classList.add('open');
      } catch(e) { toast('Could not load form data','error'); }
    },

    closeAdd() {
      document.getElementById('fbModal').classList.remove('open');
    },

    async submit() {
      const overall = parseInt(document.getElementById('fbOverall').value||0);
      const doctor  = document.getElementById('fbDoctorSel').value;
      if (!doctor)  return toast('Please select a doctor', 'error');
      if (!overall) return toast('Please set an overall rating', 'error');
      try {
        const body = {
          patient_id:          document.getElementById('fbPatientSel').value || null,
          doctor_id:           doctor,
          rating_overall:      overall,
          rating_wait_time:    parseInt(document.getElementById('fbWait').value)||null,
          rating_doctor_time:  parseInt(document.getElementById('fbDrTime').value)||null,
          rating_cleanliness:  parseInt(document.getElementById('fbClean').value)||null,
          comment:             document.getElementById('fbComment').value.trim()||null,
          visit_date:          document.getElementById('fbVisitDate').value||null,
        };
        await DB.tables.feedback.insert(body);
      } catch(e) { toast('Error saving feedback: '+e.message,'error'); }
    },

    async del(id) {
      if (!confirm('Delete this feedback?')) return;
      try {
        await DB.tables.feedback.delete(id);
        toast('Feedback deleted','success');
        this.render();
      } catch(e) { toast('Error deleting','error'); }
    }
  };
})();
