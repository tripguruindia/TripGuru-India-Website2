// ---------------------------------------------------------------------------
// The activities section's API: tours, tickets, transfers, eSIMs (trains and
// insurance later). Mounted by server/src/index.js at /api/activities.
//
// It is self-contained on purpose -- its own tables (act_*), its own login
// and signing key, its own migrations -- and imports nothing from the Nepal
// portal, so it can later run as its own service on its own domain by
// starting this router in a two-line Express app.
//
// It must never take the Nepal portal down with it: setup failures are
// logged and answered with 503 on this section's routes only.
// ---------------------------------------------------------------------------
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { migrate } = require('./migrate');
const { seed } = require('./seed');
const { one, run } = require('./db');

let ready = null;

// The first admin comes from env vars, once: only while no admin exists, so
// changing the variables later never resets a password set since.
async function bootstrapAdmin() {
  const email = String(process.env.ACTIVITIES_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ACTIVITIES_ADMIN_PASSWORD || '');
  if (!email || password.length < 8) return;
  const existing = await one("SELECT id FROM act_users WHERE role = 'admin' LIMIT 1");
  if (existing) return;
  await run(
    `INSERT INTO act_users (id, email, password_hash, name, role, approval_status, created_at)
     VALUES (?, ?, ?, ?, 'admin', 'approved', ?)`,
    ['usr-' + crypto.randomBytes(6).toString('hex'), email, await bcrypt.hash(password, 10), 'Admin', new Date().toISOString()]
  );
  console.log('activities: first admin account created for', email);
}

function init() {
  if (!ready) {
    ready = (async () => {
      await migrate();
      await seed();
      await bootstrapAdmin();
      console.log('activities: ready');
    })();
    // A failed setup (say, the database briefly unreachable) is retried on
    // the next request rather than leaving the section down until a restart.
    ready.catch((err) => {
      console.error('activities: setup failed --', err);
      ready = null;
    });
  }
  return ready;
}

const router = express.Router();
router.use(async (req, res, next) => {
  try {
    await init();
  } catch {
    return res.status(503).json({ error: 'This section is starting up. Please try again in a minute.' });
  }
  next();
});
router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/public', require('./routes/public'));
router.use('/auth', require('./routes/auth'));
router.use('/admin', require('./routes/admin'));

module.exports = { router, init };
