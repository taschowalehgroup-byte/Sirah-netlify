# DentCare Pro — Netlify Static Edition

A fully static version of DentCare Pro that deploys to **Netlify** with zero backend.

- All patient/appointment/treatment data lives **in-memory** (seeded from GitHub JSON on load)
- User accounts are **persistent** via Netlify Blobs (survived across deploys)
- WhatsApp Bot is not available (requires a persistent Node.js process)

---

## 🚀 Deploy in 3 steps

### Step 1 — Fork & push your JSON seed data to GitHub

1. Create a **public** GitHub repo (e.g. `dentcare-data`)
2. Push the `database/JSON/` folder to it
3. Note the raw URL: `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/database/JSON`

### Step 2 — Update `GITHUB_RAW_BASE` in `js/api.js`

Open `js/api.js` and replace line 10:

```js
const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/database/JSON';
```

### Step 3 — Deploy to Netlify

1. Push this entire folder to a GitHub repo
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. Set **Publish directory** to `.` (the root)
4. Click **Deploy site**

Netlify will automatically detect `netlify.toml` and deploy the Functions for auth.

---

## 🔐 User Accounts (Netlify Blobs)

User accounts are stored persistently in **Netlify Blobs** via `/.netlify/functions/auth`.

Default credentials (seeded on first login):

| Username       | Password   | Role          |
|----------------|------------|---------------|
| admin          | Admin-01   | admin         |
| manager        | Mgr-01     | manager       |
| doctor1–5      | Doc-01–05  | doctor        |
| receptionist   | Rec-01     | receptionist  |
| accountant     | Acc-01     | accountant    |

> Change passwords after first login via **Settings → Password Management**.

---

## 💾 Data Persistence

| Data Type        | Persistence          | Notes                                        |
|------------------|----------------------|----------------------------------------------|
| User accounts    | ✅ Permanent (Blobs) | Survives refreshes and deploys               |
| Patients         | ⚠️ Session only      | Resets on page refresh — seed from GitHub    |
| Appointments     | ⚠️ Session only      | Resets on page refresh                       |
| Treatments       | ⚠️ Session only      | Resets on page refresh                       |
| Transactions     | ⚠️ Session only      | Resets on page refresh                       |
| Settings         | ⚠️ Session only      | Resets on page refresh                       |
| X-rays / Images  | ⚠️ Session only      | Stored as base64 in memory                   |

**To make all data persistent**, use the **Port-3000** Node.js version on Railway/Render/VPS instead.

---

## 📦 Local development

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Install function dependencies
cd netlify/functions && npm install && cd ../..

# Run locally (emulates Netlify Functions + Blobs)
netlify dev
```

Open `http://localhost:8888`

---

## ⚠️ Limitations vs Node.js version

| Feature              | Netlify Static | Node.js (Port-3000) |
|----------------------|----------------|----------------------|
| User accounts        | ✅ Persistent  | ✅ Persistent        |
| Patient data         | Session only   | ✅ Persistent (SQLite)|
| WhatsApp Bot         | ❌ Not available| ✅ Available         |
| X-ray file storage   | Base64 in RAM  | ✅ Disk files        |
| Auto backup          | JSON download  | ✅ Automatic         |
| Multi-tab sync       | ❌             | ✅                   |
