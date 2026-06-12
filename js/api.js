/**
 * DentCare Pro — API Client (Netlify Static Edition)
 * ════════════════════════════════════════════════════
 * All data is seeded from the inlined SEED_DATA object (seed-data.js).
 * No GitHub fetch required — works completely offline / on any host.
 *
 * Auth is handled by Netlify Functions (/.netlify/functions/auth)
 * which use Netlify Blobs for persistent user storage.
 */

const DB = (() => {

  // ── In-memory store ────────────────────────────────────────────────────────
  const store = {
    patients: [], appointments: [], treatments: [],
    transactions: [], inventory: [], doctors: [],
    users: [], services: [], employment: [],
    discount_codes: [], waiting: [],
    installments: [], installment_payments: [],
    xrays: [], workhours: [],
    suppliers: [], laborders: [],
    insurance_companies: [], insurance_policies: [], insurance_claims: [],
    feedback: [], notifications: [], messages: [],
    settings: {}, pages: null, abilities: {},
  };

  // ── Auto-increment IDs ─────────────────────────────────────────────────────
  const _nextId = {};
  function nextId(table) {
    if (!_nextId[table]) {
      const rows = Array.isArray(store[table]) ? store[table] : [];
      _nextId[table] = rows.length ? rows.reduce(function(m,r){ return Math.max(m, Number(r.id)||0); }, 0) + 1 : 1;
    }
    return _nextId[table]++;
  }

  // ── Seed from inlined SEED_DATA (defined in seed-data.js) ─────────────────
  const _ready = (async () => {
    try {
      const S = (typeof SEED_DATA !== 'undefined') ? SEED_DATA : {};

      // db.json has top-level arrays
      const db = S.db || {};
      if (Array.isArray(db.doctors))      store.doctors      = db.doctors;
      if (Array.isArray(db.patients))     store.patients     = db.patients;
      if (Array.isArray(db.appointments)) store.appointments = db.appointments;
      if (Array.isArray(db.treatments))   store.treatments   = db.treatments;
      if (Array.isArray(db.transactions)) store.transactions = db.transactions;
      if (Array.isArray(db.inventory))    store.inventory    = db.inventory;

      // Supplemental files override if they have data arrays
      const load = (key, storeKey, dataKey) => {
        const d = S[key];
        if (!d) return;
        const arr = Array.isArray(d) ? d : (d.data || d[dataKey] || []);
        if (arr.length) store[storeKey] = arr;
      };

      load('patients',     'patients',     'patients');
      load('appointments', 'appointments', 'appointments');
      load('treatments',   'treatments',   'treatments');
      load('transactions', 'transactions', 'transactions');
      load('inventory',    'inventory',    'inventory');
      load('doctors',      'doctors',      'doctors');
      load('employment',   'employment',   'employment');
      load('services',     'services',     'services');
      load('waiting_room', 'waiting',      'waiting');

      if (S.settings) store.settings = S.settings;
      if (S.pages)    store.pages    = S.pages;

      // Users from passwords.json
      if (S.passwords && S.passwords.users && S.passwords.users.length) {
        store.users = S.passwords.users.map((u, i) => ({
          id: u.id || i + 1,
          username: u.username,
          password: u.password,
          role: u.role || 'admin',
          doctor_id: u.doctor_id || null,
        }));
      }

      // Recalculate auto-increment starting points
      Object.keys(store).forEach(k => {
        if (Array.isArray(store[k]) && store[k].length) {
          _nextId[k] = Math.max(...store[k].map(r => Number(r.id) || 0)) + 1;
        }
      });

    } catch(e) {
      console.error('[DB] Seed load error:', e);
    }
  })();

  // ── Translation — load from SEED_DATA ─────────────────────────────────────
  const translation = {
    _data: null,
    async load() {
      if (this._data) return this._data;
      try {
        if (typeof SEED_DATA !== 'undefined' && SEED_DATA.translation) {
          this._data = SEED_DATA.translation;
        } else {
          this._data = {};
        }
      } catch(e) { this._data = {}; }
      return this._data;
    }
  };

  // ── CRUD factory ───────────────────────────────────────────────────────────
  function makeCRUD(table) {
    return {
      all:    async ()          => { await _ready; return [...(store[table] || [])]; },
      find:   async (id)        => { await _ready; return (store[table]||[]).find(r => String(r.id) === String(id)); },
      insert: async (row)       => {
        await _ready;
        const { id: _id, ...rest } = row;
        const r = { id: nextId(table), ...rest, created_at: new Date().toISOString() };
        store[table] = [...(store[table] || []), r];
        return r;
      },
      update: async (id, patch) => {
        await _ready;
        const i = (store[table]||[]).findIndex(r => String(r.id) === String(id));
        if (i > -1) store[table][i] = { ...store[table][i], ...patch };
        return store[table] ? store[table][i] : undefined;
      },
      delete: async (id) => {
        store[table] = (store[table]||[]).filter(r => String(r.id) !== String(id));
        return { deleted: true };
      },
      bulk: async (rows) => {
        await _ready;
        return rows.map(row => {
          const { id: _id, ...rest } = row;
          const r = { id: nextId(table), ...rest };
          store[table] = [...(store[table] || []), r];
          return r;
        });
      },
    };
  }

  // ── Build tables ───────────────────────────────────────────────────────────
  const tables = {};
  [
    'patients','appointments','treatments','transactions','inventory','doctors',
    'users','discount_codes','services','employment','suppliers','laborders',
    'insurance_companies','insurance_policies','insurance_claims',
    'feedback','notifications','messages','workhours',
  ].forEach(t => { tables[t] = makeCRUD(t); });

  tables.discount_codes.validate = async (code) => {
    await _ready;
    const dc = (store.discount_codes||[]).find(d => d.code === code && d.is_active);
    if (!dc) return { valid: false, message: 'Invalid or inactive code' };
    return { valid: true, discount_type: dc.discount_type, value: dc.value };
  };

  // ── Waiting Room ───────────────────────────────────────────────────────────
  const waiting = {
    all:             async ()           => { await _ready; return [...store.waiting]; },
    add:             async (pid, notes) => {
      await _ready;
      const r = { id: nextId('waiting'), patient_id: pid, notes: notes||null, arrived_at: new Date().toISOString() };
      store.waiting.push(r); return r;
    },
    remove:          async (id)         => { store.waiting = store.waiting.filter(r => String(r.id)!==String(id)); return {deleted:true}; },
    removeByPatient: async (pid)        => { store.waiting = store.waiting.filter(r => String(r.patient_id)!==String(pid)); return {deleted:true}; },
    clearAll:        async ()           => { store.waiting = []; return {deleted:true}; },
  };

  // ── Settings ───────────────────────────────────────────────────────────────
  const settings = {
    get:   async ()     => { await _ready; return { ...store.settings }; },
    save:  async (data) => { await _ready; store.settings = { ...store.settings, ...data }; return store.settings; },
    reset: async ()     => store.settings,
  };

  // ── Auth — Netlify Function first, seed users as fallback ─────────────────
  const auth = {
    async login(username, password) {
      // Always check seed users first — fast and reliable
      await _ready;
      const user = store.users.find(function(u) { return u.username === username && u.password === password; });
      if (user) {
        var safe = {};
        for (var k in user) { if (k !== 'password') safe[k] = user[k]; }
        var session = Object.assign({}, safe, { loginTime: Date.now() });
        localStorage.setItem('dentcare_session', JSON.stringify(session));
        return session;
      }
      // If not in seed, try Netlify Function (for users created via admin panel)
      try {
        var res = await fetch('/.netlify/functions/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password }),
        });
        var data = await res.json();
        if (data.success) {
          var session2 = Object.assign({}, data.user, { loginTime: Date.now() });
          localStorage.setItem('dentcare_session', JSON.stringify(session2));
          return session2;
        }
      } catch(e) { /* function unavailable */ }
      return null;
    },
    logout()  { localStorage.removeItem('dentcare_session'); },
    current() { const s = localStorage.getItem('dentcare_session'); return s ? JSON.parse(s) : null; },
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const helpers = {
    patientName: async (id) => { const p = await tables.patients.find(id); return (p && p.full_name) || 'Unknown'; },
    doctorName:  async (id) => { const d = await tables.doctors.find(id);  return (d && d.full_name) || 'Unknown'; },
    todayAppts:  async ()   => {
      const today = new Date().toISOString().split('T')[0];
      return (await tables.appointments.all()).filter(a => a.date===today);
    },
    stats: async () => {
      await _ready;
      return {
        patients: store.patients.length,
        appointments: store.appointments.length,
        treatments: store.treatments.length,
        revenue: store.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+(Number(t.amount)||0),0),
      };
    },
    nextPatientNo: async () => {
      await _ready;
      const max = store.patients.reduce((m,p)=>Math.max(m,Number(p.patient_no||0)),0);
      return `P${String(max+1).padStart(4,'0')}`;
    },
    reset: async () => {},
    translation,
  };

  // ── Installments ───────────────────────────────────────────────────────────
  const installments = {
    all:       async ()      => { await _ready; return [...store.installments]; },
    byPatient: async (pid)   => { await _ready; return store.installments.filter(r=>String(r.patient_id)===String(pid)); },
    create:    async (data)  => {
      await _ready;
      const plan = { id: nextId('installments'), ...data, status:'active', created_at: new Date().toISOString() };
      store.installments.push(plan);
      const amt = plan.total_amount / plan.num_installments;
      let due = new Date(plan.start_date);
      for (let i=1; i<=plan.num_installments; i++) {
        store.installment_payments.push({
          id: nextId('installment_payments'), plan_id: plan.id,
          installment_no: i, amount: Math.round(amt*100)/100,
          due_date: due.toISOString().split('T')[0], status:'pending',
        });
        due.setMonth(due.getMonth()+1);
      }
      return { plan, payments: store.installment_payments.filter(p=>p.plan_id===plan.id) };
    },
    delete: async (id) => {
      store.installments = store.installments.filter(r=>String(r.id)!==String(id));
      store.installment_payments = store.installment_payments.filter(r=>String(r.plan_id)!==String(id));
      return {deleted:true};
    },
    payInstallment: async (payId, data) => {
      const i = store.installment_payments.findIndex(r=>String(r.id)===String(payId));
      if (i>-1) store.installment_payments[i] = {...store.installment_payments[i],...data};
      return store.installment_payments[i];
    },
  };

  // ── Xrays ──────────────────────────────────────────────────────────────────
  const xrays = {
    byPatient: async (pid)  => { await _ready; return store.xrays.filter(r=>String(r.patient_id)===String(pid)); },
    gallery:   async ()     => { await _ready; return [...store.xrays]; },
    stats:     async ()     => { await _ready; return { total: store.xrays.length }; },
    add:       async (data) => {
      await _ready;
      const r = { id: nextId('xrays'), ...data, created_at: new Date().toISOString() };
      store.xrays.push(r); return r;
    },
    update: async (id, data) => {
      const i = store.xrays.findIndex(r=>String(r.id)===String(id));
      if (i>-1) store.xrays[i] = {...store.xrays[i],...data};
      return store.xrays[i];
    },
    delete: async (id) => { store.xrays = store.xrays.filter(r=>String(r.id)!==String(id)); return {deleted:true}; },
  };

  // ── Commissions ────────────────────────────────────────────────────────────
  const commissions = {
    report: async (params={}) => {
      await _ready;
      let treats = [...store.treatments];
      if (params.doctor_id) treats = treats.filter(t=>String(t.doctor_id)===String(params.doctor_id));
      if (params.from)      treats = treats.filter(t=>t.date>=params.from);
      if (params.to)        treats = treats.filter(t=>t.date<=params.to);
      return treats.map(t=>({
        ...t,
        commission_amount: Math.round((Number(t.cost)||0)*((Number(t.doctor_commission_pct)||15)/100)*100)/100,
      }));
    },
  };

  // ── Reminders ──────────────────────────────────────────────────────────────
  const reminders = {
    followups:           async ()  => [],
    todayAppointments:   async ()  => helpers.todayAppts(),
    overdueInstallments: async ()  => {
      await _ready;
      const today = new Date().toISOString().split('T')[0];
      return store.installment_payments.filter(p=>p.status==='pending'&&p.due_date<today);
    },
  };

  // ── Abilities ──────────────────────────────────────────────────────────────
  function _defaultAbilities() {
    return ['Composite Filling','Amalgam Filling','Crown Placement','Root Canal','Extraction',
            'Scaling & Polishing','Teeth Whitening','Implant Placement','Orthodontics','Veneers',
            'Dentures','Dental X-Ray','Panoramic X-Ray','Fluoride Treatment','Sealants'];
  }
  const abilities = {
    allList:      async ()          => ({ abilities: store.abilities._list || _defaultAbilities() }),
    forTreatment: async (type)      => ({ abilities: store.abilities._list || _defaultAbilities() }),
    forDoctor:    async (did)       => ({ abilities: store.abilities[did] || [] }),
    saveDoctor:   async (did, list) => { store.abilities[did] = list; return {success:true}; },
  };

  // ── Pages (access control config) ─────────────────────────────────────────
  const pages = {
    getAll:   async ()       => { await _ready; return store.pages || {pages:[],actions:[],users:[]}; },
    getUser:  async (uid)    => { await _ready; return ((store.pages && store.pages.users)||[]).find(u=>String(u.userId)===String(uid))||null; },
    saveUser: async (uid, d) => {
      await _ready;
      if (!store.pages) store.pages = {pages:[],actions:[],users:[]};
      const i = (store.pages.users||[]).findIndex(u=>String(u.userId)===String(uid));
      const entry = { userId: uid, ...d };
      if (i>-1) store.pages.users[i]=entry; else store.pages.users=[...(store.pages.users||[]),entry];
      return entry;
    },
    saveBulk: async (users) => {
      await _ready;
      if (!store.pages) store.pages={pages:[],actions:[],users:[]};
      store.pages.users=users; return store.pages;
    },
    backup: async () => {
      const blob = new Blob([JSON.stringify(store.pages,null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download=`pages-backup-${Date.now()}.json`; a.click();
      return {success:true};
    },
  };

  // ── Generic GET router (DB.fetch('/endpoint')) ─────────────────────────────
  const apiGet = async (endpoint) => {
    await _ready;
    const [path, qs] = endpoint.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs||''));

    if (path==='/stats')                           return helpers.stats();
    if (path==='/nextPatientNo')                   return { patient_no: await helpers.nextPatientNo() };
    if (path.startsWith('/receipts/number/'))      return { receipt_no: `RCP-${Date.now()}` };
    if (path==='/installments')                    return params.patient_id ? installments.byPatient(params.patient_id) : installments.all();
    if (path==='/xrays/gallery')                   return xrays.gallery();
    if (path==='/xrays/stats')                     return xrays.stats();
    if (path==='/xrays')                           return params.patient_id ? xrays.byPatient(params.patient_id) : xrays.gallery();
    if (path==='/commissions')                     return commissions.report(params);
    if (path==='/reminders/today')                 return reminders.todayAppointments();
    if (path==='/reminders/overdue-installments')  return reminders.overdueInstallments();
    if (path.startsWith('/reminders/followups'))   return reminders.followups();
    if (path==='/treatments')                      return params.patient_id ? store.treatments.filter(t=>String(t.patient_id)===params.patient_id) : store.treatments;
    if (path==='/appointments')                    return params.patient_id ? store.appointments.filter(a=>String(a.patient_id)===params.patient_id) : store.appointments;
    if (path==='/laborders')                       return params.status ? store.laborders.filter(l=>l.status===params.status) : store.laborders;
    if (path==='/laborders/stats')                 return { total:store.laborders.length, pending:store.laborders.filter(l=>l.status==='pending').length };
    if (path==='/workhours/today')                 return store.workhours.filter(w=>w.work_date===new Date().toISOString().split('T')[0]);
    if (path.startsWith('/workhours/summary'))     return { summary:[] };
    if (path==='/workhours')                       return store.workhours;
    if (path==='/insurance/claims/stats')          return { total:store.insurance_claims.length, pending:store.insurance_claims.filter(c=>c.status==='pending').length, approved:store.insurance_claims.filter(c=>c.status==='approved').length };
    if (path==='/insurance/companies')             return store.insurance_companies;
    if (path==='/insurance/policies')              return store.insurance_policies;
    if (path==='/insurance/claims')                return store.insurance_claims;
    if (path==='/feedback/analytics')              return { average_rating:0, total:store.feedback.length };
    if (path==='/feedback')                        return store.feedback;
    if (path==='/suppliers')                       return store.suppliers;
    if (path==='/abilities/all-list')              return abilities.allList();
    if (path.startsWith('/abilities/doctor/'))     return abilities.forDoctor(path.split('/').pop());
    if (path.startsWith('/abilities/for-treatment/')) return abilities.forTreatment(path.split('/').pop());
    if (path==='/users/available-employment')      {
      const linked=new Set(store.users.filter(u=>u.employment_id).map(u=>String(u.employment_id)));
      return store.employment.filter(e=>!linked.has(String(e.id)));
    }
    if (path.startsWith('/users/'))                return store.users.find(u=>String(u.id)===path.split('/').pop());
    if (path.startsWith('/employment/'))           return store.employment.find(e=>String(e.id)===path.split('/').pop());
    if (path==='/notifications')                   return store.notifications;
    console.warn('[DB] Unhandled GET:', endpoint);
    return [];
  };

  return {
    tables, auth, helpers, settings, pages, waiting,
    fetch: apiGet,
    installments, xrays, commissions, reminders, abilities,
    ready: _ready, _store: store,
  };
})();

// v1781122254
