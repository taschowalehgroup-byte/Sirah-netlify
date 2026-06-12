/**
 * DentCare Pro — Auth Netlify Function
 * ═════════════════════════════════════
 * Handles login and user management using Netlify Blobs
 * for persistent storage across deploys.
 *
 * Routes:
 *   POST /.netlify/functions/auth/login
 *   POST /.netlify/functions/auth/create-user
 *   PUT  /.netlify/functions/auth/update-user/:id
 *   DELETE /.netlify/functions/auth/delete-user/:id
 *   GET  /.netlify/functions/auth/users
 *   POST /.netlify/functions/auth/reset-password
 *   POST /.netlify/functions/auth/request-reset
 *   GET  /.netlify/functions/auth/reset-requests
 */

const { getStore } = require('@netlify/blobs');

// ── Seed users (used only on first-ever request when Blobs is empty) ─────────
const SEED_USERS = [
  { id: 1,  username: 'admin',        password: 'Admin-01',  role: 'admin',        doctor_id: null },
  { id: 2,  username: 'manager',      password: 'Mgr-01',    role: 'manager',      doctor_id: null },
  { id: 3,  username: 'doctor1',      password: 'Doc-01',    role: 'doctor',       doctor_id: 1    },
  { id: 4,  username: 'doctor2',      password: 'Doc-02',    role: 'doctor',       doctor_id: 2    },
  { id: 5,  username: 'doctor3',      password: 'Doc-03',    role: 'doctor',       doctor_id: 3    },
  { id: 6,  username: 'doctor4',      password: 'Doc-04',    role: 'doctor',       doctor_id: 4    },
  { id: 7,  username: 'doctor5',      password: 'Doc-05',    role: 'doctor',       doctor_id: 5    },
  { id: 8,  username: 'hygienist',    password: 'Hyg-01',    role: 'hygienist',    doctor_id: null },
  { id: 9,  username: 'assistant',    password: 'Ast-01',    role: 'assistant',    doctor_id: null },
  { id: 10, username: 'receptionist', password: 'Rec-01',    role: 'receptionist', doctor_id: null },
  { id: 11, username: 'accountant',   password: 'Acc-01',    role: 'accountant',   doctor_id: null },
];

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function json(statusCode, body) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// ── Blobs helpers ─────────────────────────────────────────────────────────────
async function getUsers() {
  try {
    const store = getStore('dentcare-users');
    const raw   = await store.get('users');
    if (!raw) {
      // First run — seed the store
      await store.set('users', JSON.stringify(SEED_USERS));
      return [...SEED_USERS];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('[Auth] getUsers error:', e.message);
    return [...SEED_USERS];
  }
}

async function saveUsers(users) {
  const store = getStore('dentcare-users');
  await store.set('users', JSON.stringify(users));
}

async function getResetTokens() {
  try {
    const store = getStore('dentcare-users');
    const raw   = await store.get('reset-tokens');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveResetTokens(tokens) {
  const store = getStore('dentcare-users');
  await store.set('reset-tokens', JSON.stringify(tokens));
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const path   = (event.path || '').replace('/.netlify/functions/auth', '');
  const method = event.httpMethod;

  try {
    // ── POST /login ───────────────────────────────────────────────────────────
    if (path === '/login' && method === 'POST') {
      const { username, password } = JSON.parse(event.body || '{}');
      if (!username || !password) return json(400, { error: 'username and password required' });

      const users = await getUsers();
      const user  = users.find(u => u.username === username && u.password === password);
      if (!user) return json(401, { success: false, error: 'Invalid credentials' });

      const { password: _pw, ...safe } = user;
      return json(200, { success: true, user: safe });
    }

    // ── GET /users ────────────────────────────────────────────────────────────
    if (path === '/users' && method === 'GET') {
      const users = await getUsers();
      return json(200, users.map(u => { const { password: _pw, ...s } = u; return s; }));
    }

    // ── POST /create-user ─────────────────────────────────────────────────────
    if (path === '/create-user' && method === 'POST') {
      const data  = JSON.parse(event.body || '{}');
      const users = await getUsers();
      if (users.find(u => u.username === data.username)) return json(409, { error: 'Username already exists' });
      const newUser = { id: Math.max(...users.map(u => u.id), 0) + 1, ...data };
      users.push(newUser);
      await saveUsers(users);
      const { password: _pw, ...safe } = newUser;
      return json(201, { success: true, user: safe });
    }

    // ── PUT /update-user/:id ──────────────────────────────────────────────────
    if (path.startsWith('/update-user/') && method === 'PUT') {
      const id    = parseInt(path.split('/').pop());
      const patch = JSON.parse(event.body || '{}');
      const users = await getUsers();
      const idx   = users.findIndex(u => u.id === id);
      if (idx === -1) return json(404, { error: 'User not found' });
      users[idx] = { ...users[idx], ...patch };
      await saveUsers(users);
      const { password: _pw, ...safe } = users[idx];
      return json(200, { success: true, user: safe });
    }

    // ── DELETE /delete-user/:id ───────────────────────────────────────────────
    if (path.startsWith('/delete-user/') && method === 'DELETE') {
      const id    = parseInt(path.split('/').pop());
      const users = await getUsers();
      const next  = users.filter(u => u.id !== id);
      if (next.length === users.length) return json(404, { error: 'User not found' });
      await saveUsers(next);
      return json(200, { success: true });
    }

    // ── POST /request-reset ───────────────────────────────────────────────────
    if (path === '/request-reset' && method === 'POST') {
      const { username } = JSON.parse(event.body || '{}');
      const users = await getUsers();
      if (!users.find(u => u.username === username)) return json(404, { error: 'User not found' });

      const token   = Math.random().toString(36).slice(2, 8).toUpperCase();
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      const tokens = (await getResetTokens()).filter(t => t.username !== username);
      tokens.push({ username, token, expires_at: expires });
      await saveResetTokens(tokens);
      return json(200, { success: true, token });
    }

    // ── GET /reset-requests ───────────────────────────────────────────────────
    if (path === '/reset-requests' && method === 'GET') {
      const tokens = await getResetTokens();
      const now    = new Date().toISOString();
      const users  = await getUsers();
      const active = tokens.filter(t => t.expires_at > now).map(t => {
        const u = users.find(u => u.username === t.username);
        return { ...t, role: u?.role || '—' };
      });
      return json(200, active);
    }

    // ── POST /reset-password ──────────────────────────────────────────────────
    if (path === '/reset-password' && method === 'POST') {
      const { username, token, new_password } = JSON.parse(event.body || '{}');
      if (!new_password || new_password.length < 4) return json(400, { error: 'Password too short' });

      const tokens = await getResetTokens();
      const now    = new Date().toISOString();
      const entry  = tokens.find(t => t.username === username && t.token === token && t.expires_at > now);
      if (!entry) return json(400, { error: 'Invalid or expired token' });

      const users = await getUsers();
      const idx   = users.findIndex(u => u.username === username);
      if (idx === -1) return json(404, { error: 'User not found' });

      users[idx].password = new_password;
      await saveUsers(users);
      await saveResetTokens(tokens.filter(t => !(t.username === username && t.token === token)));
      return json(200, { success: true });
    }

    return json(404, { error: `No handler for ${method} ${path}` });

  } catch (err) {
    console.error('[Auth Function] Error:', err);
    return json(500, { error: 'Internal server error', detail: err.message });
  }
};
