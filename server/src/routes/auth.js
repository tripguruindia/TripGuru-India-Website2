const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { serializeUser } = require('../serializers');

const router = express.Router();

// Same rule the old client-side signup enforced (App.jsx ~L290): at least
// 6 characters, containing at least one letter and one digit.
function isValidPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user);
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
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      id: 'usr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      email: normalizedEmail,
      passwordHash,
      role,
      fullName: fullName || '',
      phone: phone || '',
      countryCode: countryCode || '',
      agencyName: profileData.agencyName || null,
      agencyAddress: profileData.agencyAddress || null,
      agencyPhone: profileData.agencyPhone || null,
      agencyEmail: profileData.agencyEmail || null,
      agencyWebsite: profileData.agencyWebsite || null,
      walletBalance: role === 'b2b' ? 0 : undefined,
      address: profileData.address || null,
    },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: serializeUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: serializeUser(user) });
});

module.exports = router;
