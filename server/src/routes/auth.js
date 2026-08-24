const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { serializeUser } = require('../serializers');

const router = express.Router();

// Same rule the old client-side signup enforced (App.jsx ~L290): at least
// 6 characters, containing at least one letter and one digit.
function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

async function findUserByEmail(email) {
  const rs = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  return rs.rows[0] || null;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await findUserByEmail(String(email).toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.json({ token, user: serializeUser(user) });
});

// Public signup. Role is restricted to b2c/b2b here -- admin accounts are
// only ever created by an existing admin via /admin/users.
router.post('/signup', async (req, res) => {
  const { email, password, role, fullName, phone, countryCode, ...profileData } = req.body || {};

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }
  if (!['b2c', 'b2b'].includes(role)) {
    return res.status(400).json({ error: 'role must be b2c or b2b' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters and include a letter and a digit' });
  }
  if (role === 'b2b' && !profileData.agencyName) {
    return res.status(400).json({ error: 'agencyName is required for B2B signup' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const createdAt = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO users
      (id, email, password_hash, role, full_name, phone, country_code,
       agency_name, agency_address, agency_phone, agency_email, agency_website,
       gst_number, approval_status, wallet_balance, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      normalizedEmail,
      passwordHash,
      role,
      fullName || '',
      phone || '',
      countryCode || '',
      profileData.agencyName || null,
      profileData.agencyAddress || null,
      profileData.agencyPhone || null,
      profileData.agencyEmail || null,
      profileData.agencyWebsite || null,
      // Optional -- an agent may register without one and add it later
      // from his profile.
      role === 'b2b' ? String(profileData.gstNumber || '').trim() || null : null,
      // A new agent account cannot trade until an admin approves it. Anything
      // else -- a traveller account -- is live immediately, as it always was.
      role === 'b2b' ? 'pending' : 'approved',
      0,
      profileData.address || null,
      createdAt,
    ],
  });

  const user = await findUserByEmail(normalizedEmail);
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.status(201).json({ token, user: serializeUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const rs = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] });
  const user = rs.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: serializeUser(user) });
});

// ---------------------------------------------------------------------------
// PATCH /auth/me -- the caller edits their OWN profile: contact details and,
// for an agent, the agency branding that appears on the vouchers they send
// their clients.
//
// Which row is written comes from the verified token, never the body -- the
// same rule that governs bookings and quotes. Role, email, password and wallet
// balance are not editable here: changing those is an admin action
// (PUT /admin/users/:id), not a self-service one. Neither is approval_status:
// an agent must never be able to approve himself out of the pending queue.
//
// The logo is a data URL. It is capped because it rides along with every
// login and /me call, and an uncapped one would make both slow for everybody.
// ---------------------------------------------------------------------------
const MAX_LOGO_CHARS = 1_400_000; // ~1MB of image once base64-encoded

router.patch('/me', requireAuth, async (req, res) => {
  const b = req.body || {};
  const rs = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] });
  const existing = rs.rows[0];
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (typeof b.agencyLogo === 'string' && b.agencyLogo.length > MAX_LOGO_CHARS) {
    return res.status(400).json({ error: 'Logo is too large. Please upload an image under 1MB.' });
  }

  const pick = (next, current) => (next !== undefined && next !== null ? next : current);

  await client.execute({
    sql: `UPDATE users SET
            full_name = ?, phone = ?, country_code = ?, address = ?,
            agency_name = ?, agency_address = ?, agency_phone = ?,
            agency_email = ?, agency_website = ?, agency_logo = ?,
            gst_number = ?
          WHERE id = ?`,
    args: [
      pick(b.fullName, existing.full_name),
      pick(b.phone, existing.phone),
      pick(b.countryCode, existing.country_code),
      pick(b.address, existing.address),
      pick(b.agencyName, existing.agency_name),
      pick(b.agencyAddress, existing.agency_address),
      pick(b.agencyPhone, existing.agency_phone),
      pick(b.agencyEmail, existing.agency_email),
      pick(b.agencyWebsite, existing.agency_website),
      pick(b.agencyLogo, existing.agency_logo),
      pick(b.gstNumber, existing.gst_number),
      req.user.id,
    ],
  });

  const after = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [req.user.id] });
  res.json({ user: serializeUser(after.rows[0]) });
});

module.exports = router;
