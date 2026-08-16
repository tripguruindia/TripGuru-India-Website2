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
       wallet_balance, address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      role === 'b2b' ? 0 : 0,
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

module.exports = router;
