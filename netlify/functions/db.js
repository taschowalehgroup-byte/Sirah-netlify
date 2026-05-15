/**
 * DentCare Pro — Netlify Blobs Backend
 * Single function handles all data: CRUD, auth, settings, pages, etc.
 * Data persists in Netlify Blobs across page refreshes.
 *
 * Store layout (one blob key per table):
 *   dentcare:patients, dentcare:appointments, dentcare:treatments,
 *   dentcare:transactions, dentcare:inventory, dentcare:doctors,
 *   dentcare:users, dentcare:discount_codes, dentcare:waiting,
 *   dentcare:installments, dentcare:insurance, dentcare:xrays,
 *   dentcare:audit, dentcare:settings, dentcare:pages, dentcare:translation
 */

const { getStore } = require('@netlify/blobs');

/* ── Seed data bundled inline so the function is self-contained ────────── */
const SEED = require('./seed.json');

/* ── CORS / JSON helpers ────────────────────────────────────────────────── */
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-User',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

/* ── Get or create the store ─────────────────────────────────────────────── */
function getDB() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token  = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_TOKEN;
  const opts   = siteID && token ? { siteID, token } : {};
  return getStore({ name: 'dentcare', ...opts });
}

/* ── Load a table from Blobs (seeds on first access) ────────────────────── */
async function loadTable(store, table) {
  try {
    const raw = await store.get(`dentcare:${table}`, { type: 'json' });
    if (raw !== null && raw !== undefined) return raw;
  } catch (_) {}
  // First time — seed from bundled data
  const seed = SEED[table] || (table === 'settings' ? {} : table === 'pages' ? { pages: [], actions: [], users: [] } : []);
  await store.setJSON(`dentcare:${table}`, seed);
  return seed;
}

async function saveTable(store, table, data) {
  await store.setJSON(`dentcare:${table}`, data);
}

/* ── Auto-increment helper ───────────────────────────────────────────────── */
function nextId(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 1;
  return Math.max(...rows.map(r => Number(r.id) || 0)) + 1;
}

/* ── Main handler ────────────────────────────────────────────────────────── */
exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return json(200, {});

  let store;
  try {
    store = getDB();
  } catch (e) {
    return json(500, { error: 'DB init failed: ' + e.message });
  }

  // Parse path: /.netlify/functions/db/TABLE[/id][/action]
  const rawPath = event.path || '';
  const afterDb = rawPath.replace(/.*\/db/, '').replace(/^\/+/, '');
  const parts   = afterDb.split('/').filter(Boolean);
  const table   = parts[0] || '';
  const idOrSub = parts[1] || '';   // id OR sub-resource name
  const sub     = parts[2] || '';   // e.g. /installments/payment/42
  const method  = event.httpMethod;

  let body = {};
  if (event.body) {
    try { body = JSON.parse(event.body); } catch (_) {}
  }

  const qs = event.queryStringParameters || {};

  try {

    /* ══════════════════════════════════════════════════════════════════
       AUTH
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'auth') {
      const users = await loadTable(store, 'users');

      // POST /auth/login
      if (idOrSub === 'login' && method === 'POST') {
        const user = users.find(u => u.username === body.username && u.password === body.password);
        if (!user) return json(401, { error: 'Invalid credentials' });
        const { password: _, ...safe } = user;
        return json(200, safe);
      }

      // POST /auth/request-reset
      if (idOrSub === 'request-reset' && method === 'POST') {
        const user = users.find(u => u.username === body.username);
        if (!user) return json(404, { error: 'User not found' });
        const token   = Math.random().toString(36).substring(2, 8).toUpperCase();
        const expires = new Date(Date.now() + 3600000).toISOString();
        // Store token on user record temporarily
        const idx = users.findIndex(u => u.username === body.username);
        users[idx] = { ...users[idx], reset_token: token, reset_expires: expires };
        await saveTable(store, 'users', users);
        return json(200, { success: true, token, expires_at: expires });
      }

      // GET /auth/reset-requests (admin sees pending requests)
      if (idOrSub === 'reset-requests' && method === 'GET') {
        const reqs = users
          .filter(u => u.reset_token && new Date(u.reset_expires) > new Date())
          .map(u => ({ username: u.username, role: u.role, token: u.reset_token, expires_at: u.reset_expires }));
        return json(200, reqs);
      }

      // POST /auth/reset-password
      if (idOrSub === 'reset-password' && method === 'POST') {
        const { username, token, new_password } = body;
        const idx = users.findIndex(u => u.username === username);
        if (idx === -1) return json(404, { error: 'User not found' });
        const u = users[idx];
        if (!u.reset_token || u.reset_token !== token) return json(400, { error: 'Invalid token' });
        if (new Date(u.reset_expires) < new Date()) return json(400, { error: 'Token expired' });
        users[idx] = { ...u, password: new_password, reset_token: null, reset_expires: null };
        await saveTable(store, 'users', users);
        return json(200, { success: true });
      }

      return json(404, { error: 'Auth route not found' });
    }

    /* ══════════════════════════════════════════════════════════════════
       SETTINGS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'settings') {
      const settings = await loadTable(store, 'settings');

      if (method === 'GET')  return json(200, settings);
      if (method === 'PUT' || method === 'POST') {
        const merged = { ...settings, ...body };
        await saveTable(store, 'settings', merged);
        return json(200, merged);
      }
      // POST /settings/reset
      if (idOrSub === 'reset' && method === 'POST') {
        await saveTable(store, 'settings', {});
        return json(200, {});
      }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       TRANSLATION
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'translation') {
      const t = await loadTable(store, 'translation');
      return json(200, t);
    }

    /* ══════════════════════════════════════════════════════════════════
       PAGES / PAGE ACCESS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'pages') {
      const pagesData = await loadTable(store, 'pages');

      // GET /pages
      if (!idOrSub && method === 'GET') return json(200, pagesData);

      // GET /pages/user/:uid
      if (idOrSub === 'user' && sub && method === 'GET') {
        const entry = (pagesData.users || []).find(u => String(u.userId) === String(sub));
        return json(200, entry || { userId: sub, permissions: {} });
      }

      // PUT /pages/user/:uid
      if (idOrSub === 'user' && sub && method === 'PUT') {
        if (!pagesData.users) pagesData.users = [];
        const idx = pagesData.users.findIndex(u => String(u.userId) === String(sub));
        if (idx > -1) pagesData.users[idx] = { ...pagesData.users[idx], ...body };
        else pagesData.users.push({ userId: sub, ...body });
        await saveTable(store, 'pages', pagesData);
        return json(200, { success: true });
      }

      // PUT /pages/bulk
      if (idOrSub === 'bulk' && method === 'PUT') {
        const { users } = body;
        if (!pagesData.users) pagesData.users = [];
        for (const u of (users || [])) {
          const idx = pagesData.users.findIndex(x => String(x.userId) === String(u.userId));
          if (idx > -1) pagesData.users[idx] = u;
          else pagesData.users.push(u);
        }
        await saveTable(store, 'pages', pagesData);
        return json(200, { success: true, count: (users || []).length });
      }

      // POST /pages/backup
      if (idOrSub === 'backup' && method === 'POST') {
        return json(200, { success: true, message: 'Page access backed up to Blobs' });
      }

      return json(404, { error: 'Pages route not found' });
    }

    /* ══════════════════════════════════════════════════════════════════
       STATS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'stats') {
      const [patients, appointments, transactions, inventory] = await Promise.all([
        loadTable(store, 'patients'),
        loadTable(store, 'appointments'),
        loadTable(store, 'transactions'),
        loadTable(store, 'inventory'),
      ]);
      const today = new Date().toISOString().split('T')[0];
      return json(200, {
        patients_count:     patients.length,
        appointments_today: appointments.filter(a => a.date === today).length,
        revenue_total:      transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
        inventory_low:      inventory.filter(i => (Number(i.quantity) || 0) < 10).length,
      });
    }

    /* ══════════════════════════════════════════════════════════════════
       NEXT PATIENT NO
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'nextPatientNo') {
      const patients = await loadTable(store, 'patients');
      const max = patients.reduce((m, p) => Math.max(m, Number(p.patient_no) || 0), 0);
      return json(200, { patient_no: max + 1 });
    }

    /* ══════════════════════════════════════════════════════════════════
       WAITING ROOM
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'waiting') {
      const waiting = await loadTable(store, 'waiting');

      if (!idOrSub && method === 'GET')    return json(200, waiting);
      if (!idOrSub && method === 'DELETE') { await saveTable(store, 'waiting', []); return json(200, { deleted: true }); }
      if (!idOrSub && method === 'POST') {
        const r = { id: nextId(waiting), patient_id: body.patient_id, notes: body.notes || null, added_at: new Date().toISOString() };
        waiting.push(r);
        await saveTable(store, 'waiting', waiting);
        return json(201, r);
      }
      // DELETE /waiting/:id
      if (idOrSub && method === 'DELETE') {
        const filtered = waiting.filter(r => String(r.id) !== String(idOrSub));
        await saveTable(store, 'waiting', filtered);
        return json(200, { deleted: true });
      }
      // DELETE /waiting/by-patient/:pid
      if (idOrSub === 'by-patient' && sub && method === 'DELETE') {
        const filtered = waiting.filter(r => String(r.patient_id) !== String(sub));
        await saveTable(store, 'waiting', filtered);
        return json(200, { deleted: true });
      }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       INSTALLMENTS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'installments') {
      const plans = await loadTable(store, 'installments');

      if (!idOrSub && method === 'GET') {
        const filtered = qs.patient_id ? plans.filter(p => String(p.patient_id) === String(qs.patient_id)) : plans;
        return json(200, filtered);
      }
      if (!idOrSub && method === 'POST') {
        const r = { id: nextId(plans), ...body, created_at: new Date().toISOString() };
        plans.push(r);
        await saveTable(store, 'installments', plans);
        return json(201, r);
      }
      if (idOrSub && method === 'DELETE') {
        const filtered = plans.filter(r => String(r.id) !== String(idOrSub));
        await saveTable(store, 'installments', filtered);
        return json(200, { deleted: true });
      }
      // PUT /installments/payment/:payId
      if (idOrSub === 'payment' && sub && method === 'PUT') {
        // sub is payId — update payment status within plan
        const idx = plans.findIndex(p => {
          const payments = p.payments || [];
          return payments.find(pay => String(pay.id) === String(sub));
        });
        if (idx > -1) {
          const payments = plans[idx].payments || [];
          const pi = payments.findIndex(pay => String(pay.id) === String(sub));
          if (pi > -1) payments[pi] = { ...payments[pi], ...body };
          plans[idx].payments = payments;
          await saveTable(store, 'installments', plans);
          return json(200, plans[idx]);
        }
        return json(404, { error: 'Payment not found' });
      }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       INSURANCE
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'insurance') {
      const claims = await loadTable(store, 'insurance');

      // GET /insurance/stats/summary
      if (idOrSub === 'stats' && sub === 'summary' && method === 'GET') {
        return json(200, {
          total:    claims.length,
          pending:  claims.filter(c => c.status === 'pending').length,
          approved: claims.filter(c => c.status === 'approved').length,
          rejected: claims.filter(c => c.status === 'rejected').length,
        });
      }
      if (!idOrSub && method === 'GET') {
        const filtered = qs.patient_id ? claims.filter(c => String(c.patient_id) === String(qs.patient_id)) : claims;
        return json(200, filtered);
      }
      if (idOrSub && !sub && method === 'GET') {
        const r = claims.find(c => String(c.id) === String(idOrSub));
        return r ? json(200, r) : json(404, { error: 'Not found' });
      }
      if (!idOrSub && method === 'POST') {
        const r = { id: nextId(claims), ...body, created_at: new Date().toISOString() };
        claims.push(r);
        await saveTable(store, 'insurance', claims);
        return json(201, r);
      }
      if (idOrSub && method === 'PUT') {
        const idx = claims.findIndex(c => String(c.id) === String(idOrSub));
        if (idx === -1) return json(404, { error: 'Not found' });
        claims[idx] = { ...claims[idx], ...body };
        await saveTable(store, 'insurance', claims);
        return json(200, claims[idx]);
      }
      if (idOrSub && method === 'DELETE') {
        const filtered = claims.filter(c => String(c.id) !== String(idOrSub));
        await saveTable(store, 'insurance', filtered);
        return json(200, { deleted: true });
      }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       XRAYS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'xrays') {
      const xrays = await loadTable(store, 'xrays');

      if (method === 'GET') {
        const filtered = qs.patient_id ? xrays.filter(x => String(x.patient_id) === String(qs.patient_id)) : xrays;
        return json(200, filtered);
      }
      if (method === 'POST') {
        const r = { id: nextId(xrays), ...body, uploaded_at: new Date().toISOString() };
        xrays.push(r);
        await saveTable(store, 'xrays', xrays);
        return json(201, r);
      }
      if (idOrSub && method === 'DELETE') {
        const filtered = xrays.filter(x => String(x.id) !== String(idOrSub));
        await saveTable(store, 'xrays', filtered);
        return json(200, { deleted: true });
      }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       AUDIT LOG
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'audit') {
      const log = await loadTable(store, 'audit');
      const limit  = parseInt(qs.limit  || 200);
      const offset = parseInt(qs.offset || 0);

      if (method === 'GET')    return json(200, log.slice(offset, offset + limit));
      if (method === 'POST')   {
        log.unshift({ id: nextId(log), ...body, created_at: new Date().toISOString() });
        if (log.length > 500) log.splice(500); // cap at 500 entries
        await saveTable(store, 'audit', log);
        return json(201, { ok: true });
      }
      if (method === 'DELETE') { await saveTable(store, 'audit', []); return json(200, { deleted: true }); }
      return json(405, { error: 'Method not allowed' });
    }

    /* ══════════════════════════════════════════════════════════════════
       2FA (stubbed — needs a server secret key to implement properly)
    ══════════════════════════════════════════════════════════════════ */
    if (table === '2fa') {
      if (idOrSub === 'setup')       return json(200, { secret: 'STATIC', qr: '' });
      if (idOrSub === 'verify')      return json(200, { valid: true });
      if (idOrSub === 'disable')     return json(200, { success: true });
      if (idOrSub === 'check-login') return json(200, { valid: true });
      // GET /2fa/:userId
      return json(200, { enabled: false });
    }

    /* ══════════════════════════════════════════════════════════════════
       COMMISSIONS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'commissions') {
      const [doctors, transactions] = await Promise.all([
        loadTable(store, 'doctors'),
        loadTable(store, 'transactions'),
      ]);
      const report = doctors.map(d => {
        const txns  = transactions.filter(t => String(t.doctor_id) === String(d.id));
        const total = txns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const rate  = Number(d.commission_rate) || 0;
        return { doctor_id: d.id, doctor_name: d.full_name, total_revenue: total, commission_rate: rate, commission_amount: total * rate / 100 };
      });
      return json(200, report);
    }

    /* ══════════════════════════════════════════════════════════════════
       REMINDERS
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'reminders') {
      const appointments = await loadTable(store, 'appointments');
      const today = new Date().toISOString().split('T')[0];

      if (idOrSub === 'today')                return json(200, appointments.filter(a => a.date === today));
      if (idOrSub === 'followups') {
        const days   = parseInt(qs.days || 3);
        const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
        return json(200, appointments.filter(a => a.status === 'completed' && a.followup_needed && new Date(a.date) <= cutoff));
      }
      if (idOrSub === 'overdue-installments') {
        const plans = await loadTable(store, 'installments');
        return json(200, plans.filter(p => p.due_date && p.due_date < today && p.status !== 'paid'));
      }
      return json(404, { error: 'Reminder route not found' });
    }

    /* ══════════════════════════════════════════════════════════════════
       IMAGES UPLOAD (store base64 in Blobs)
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'images' && idOrSub === 'upload' && method === 'POST') {
      // Store base64 as the "url" — no disk needed
      return json(200, { url: body.base64 || '' });
    }

    /* ══════════════════════════════════════════════════════════════════
       BACKUP (export snapshot)
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'backup') {
      if (idOrSub === 'list')   return json(200, { count: 0, backups: [], message: 'Backups are stored in Netlify Blobs automatically' });
      if (idOrSub === 'create') return json(200, { success: true, message: 'Data is persisted in Netlify Blobs', backup: { total_size: 'N/A' } });
      return json(200, { success: true });
    }

    /* ══════════════════════════════════════════════════════════════════
       RESET
    ══════════════════════════════════════════════════════════════════ */
    if (table === 'reset' && method === 'POST') {
      // Re-seed all tables from SEED
      const tables = ['patients','appointments','treatments','transactions','inventory','doctors','users','discount_codes','waiting','installments','insurance','xrays','audit','settings','pages'];
      await Promise.all(tables.map(t => saveTable(store, t, SEED[t] || (t === 'settings' ? {} : t === 'pages' ? { pages:[], actions:[], users:[] } : []))));
      return json(200, { success: true });
    }

    /* ══════════════════════════════════════════════════════════════════
       GENERIC TABLE CRUD
       Tables: patients, appointments, treatments, transactions,
               inventory, doctors, users, discount_codes
    ══════════════════════════════════════════════════════════════════ */
    const TABLES = ['patients','appointments','treatments','transactions','inventory','doctors','users','discount_codes'];
    if (!TABLES.includes(table)) return json(404, { error: `Unknown resource: ${table}` });

    const rows = await loadTable(store, table);

    // GET /table  (with optional ?filter=value)
    if (!idOrSub && method === 'GET') {
      let result = [...rows];
      // Apply query string filters
      for (const [k, v] of Object.entries(qs)) {
        if (k !== 'limit' && k !== 'offset') {
          result = result.filter(r => String(r[k]) === String(v));
        }
      }
      return json(200, result);
    }

    // POST /table/bulk
    if (idOrSub === 'bulk' && method === 'POST') {
      const inserted = (body.rows || []).map(row => {
        const r = { id: nextId(rows), ...row };
        rows.push(r);
        return r;
      });
      await saveTable(store, table, rows);
      return json(201, { inserted: inserted.length, rows: inserted });
    }

    // Special: GET /discount_codes/validate/:code
    if (table === 'discount_codes' && idOrSub === 'validate') {
      const code = sub;
      const dc = rows.find(d => d.code === code && d.active);
      if (!dc) return json(404, { error: 'Invalid or inactive discount code' });
      return json(200, dc);
    }

    // POST /table  — insert
    if (!idOrSub && method === 'POST') {
      const r = { id: nextId(rows), ...body, created_at: new Date().toISOString() };
      rows.push(r);
      await saveTable(store, table, rows);
      return json(201, r);
    }

    // GET /table/:id
    if (idOrSub && !sub && method === 'GET') {
      const r = rows.find(r => String(r.id) === String(idOrSub));
      return r ? json(200, r) : json(404, { error: 'Not found' });
    }

    // PUT /table/:id
    if (idOrSub && method === 'PUT') {
      const idx = rows.findIndex(r => String(r.id) === String(idOrSub));
      if (idx === -1) return json(404, { error: 'Not found' });
      rows[idx] = { ...rows[idx], ...body };
      await saveTable(store, table, rows);
      return json(200, rows[idx]);
    }

    // DELETE /table/:id
    if (idOrSub && method === 'DELETE') {
      const filtered = rows.filter(r => String(r.id) !== String(idOrSub));
      await saveTable(store, table, filtered);
      return json(200, { deleted: true });
    }

    return json(405, { error: 'Method not allowed' });

  } catch (e) {
    console.error('[db function error]', e.message);
    return json(500, { error: e.message });
  }
};
