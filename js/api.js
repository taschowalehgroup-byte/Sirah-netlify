/**
 * DentCare Pro — API Client (Netlify Blobs Edition)
 * All data is persisted in Netlify Blobs via /.netlify/functions/db
 * Data survives page refreshes. ✓
 */

const DB = (() => {

  const FN = '/.netlify/functions/db';

  async function req(path, method = 'GET', body = undefined) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${FN}/${path}`, opts);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const d = await res.json(); msg = d.error || msg; } catch(_) {}
      throw new Error(msg);
    }
    return res.json();
  }

  function makeCRUD(table) {
    return {
      all:    (filters = {}) => { const qs = new URLSearchParams(filters).toString(); return req(qs ? `${table}?${qs}` : table); },
      find:   (id)           => req(`${table}/${id}`),
      insert: (row)          => req(table, 'POST', row),
      update: (id, patch)    => req(`${table}/${id}`, 'PUT', patch),
      delete: (id)           => req(`${table}/${id}`, 'DELETE'),
      bulk:   (rows)         => req(`${table}/bulk`, 'POST', { rows }),
    };
  }

  const tables = {};
  ['patients','appointments','treatments','transactions','inventory','doctors','users','discount_codes']
    .forEach(t => { tables[t] = makeCRUD(t); });
  tables.discount_codes.validate = (code) => req(`discount_codes/validate/${code}`);

  const auth = {
    async login(username, password) {
      const user = await req('auth/login', 'POST', { username, password });
      localStorage.setItem('dentcare_session', JSON.stringify({ ...user, loginTime: Date.now() }));
      return user;
    },
    logout()  { localStorage.removeItem('dentcare_session'); },
    current() { const s = localStorage.getItem('dentcare_session'); return s ? JSON.parse(s) : null; },
  };

  const settings = {
    get:   ()     => req('settings'),
    save:  (data) => req('settings', 'POST', data),
    reset: ()     => req('settings/reset', 'POST'),
  };

  const waiting = {
    all:             ()                  => req('waiting'),
    add:             (patient_id, notes) => req('waiting', 'POST', { patient_id, notes }),
    remove:          (id)                => req(`waiting/${id}`, 'DELETE'),
    removeByPatient: (patient_id)        => req(`waiting/by-patient/${patient_id}`, 'DELETE'),
    clearAll:        ()                  => req('waiting', 'DELETE'),
  };

  const pages = {
    getAll:   ()          => req('pages'),
    getUser:  (uid)       => req(`pages/user/${uid}`),
    saveUser: (uid, data) => req(`pages/user/${uid}`, 'PUT', data),
    saveBulk: (users)     => req('pages/bulk', 'PUT', { users }),
    backup:   ()          => req('pages/backup', 'POST'),
  };

  const installments = {
    all:            (filters = {})    => req('installments' + (filters.patient_id ? `?patient_id=${filters.patient_id}` : '')),
    byPatient:      (pid)             => req(`installments?patient_id=${pid}`),
    create:         (data)            => req('installments', 'POST', data),
    delete:         (id)              => req(`installments/${id}`, 'DELETE'),
    payInstallment: (payId, data)     => req(`installments/payment/${payId}`, 'PUT', data),
  };

  const insurance = {
    all:       (filters = {}) => req('insurance' + (filters.patient_id ? `?patient_id=${filters.patient_id}` : '')),
    byPatient: (pid)          => req(`insurance?patient_id=${pid}`),
    find:      (id)           => req(`insurance/${id}`),
    create:    (data)         => req('insurance', 'POST', data),
    update:    (id, data)     => req(`insurance/${id}`, 'PUT', data),
    delete:    (id)           => req(`insurance/${id}`, 'DELETE'),
    stats:     ()             => req('insurance/stats/summary'),
  };

  const xrays = {
    byPatient: (pid)   => req(`xrays?patient_id=${pid}`),
    add:       (data)  => req('xrays', 'POST', data),
    delete:    (id)    => req(`xrays/${id}`, 'DELETE'),
  };

  const audit = {
    all:   (limit = 200, offset = 0) => req(`audit?limit=${limit}&offset=${offset}`),
    write: (entry)                    => req('audit', 'POST', entry),
    clear: ()                         => req('audit', 'DELETE'),
  };

  const twofa = {
    status:     (uid)            => req(`2fa/${uid}`),
    setup:      (uid)            => req('2fa/setup', 'POST', { userId: uid }),
    verify:     (uid, tok, en)   => req('2fa/verify', 'POST', { userId: uid, token: tok, enable: en }),
    disable:    (uid)            => req('2fa/disable', 'POST', { userId: uid }),
    checkLogin: (uid, tok)       => req('2fa/check-login', 'POST', { userId: uid, token: tok }),
  };

  const commissions = { report: () => req('commissions') };

  const reminders = {
    followups:           (days = 3) => req(`reminders/followups?days=${days}`),
    todayAppointments:   ()         => req('reminders/today'),
    overdueInstallments: ()         => req('reminders/overdue-installments'),
  };

  const helpers = {
    patientName:   async (id) => { try { const p = await tables.patients.find(id); return p?.full_name || 'Unknown'; } catch(_) { return 'Unknown'; } },
    doctorName:    async (id) => { try { const d = await tables.doctors.find(id); return d?.full_name || 'Unknown'; } catch(_) { return 'Unknown'; } },
    todayAppts:    ()         => { const today = new Date().toISOString().split('T')[0]; return tables.appointments.all({ date: today }); },
    stats:         ()         => req('stats'),
    nextPatientNo: async ()   => { const d = await req('nextPatientNo'); return d.patient_no; },
    reset:         async ()   => { await req('reset', 'POST'); location.reload(); },
  };

  const apiFetch = (endpoint) => {
    const [path, qs] = endpoint.replace(/^\//, '').split('?');
    return req(qs ? `${path}?${qs}` : path);
  };

  const _ready = Promise.resolve();

  return { tables, auth, helpers, settings, pages, waiting, installments, xrays, commissions, reminders, insurance, audit, twofa, fetch: apiFetch, _ready };
})();
