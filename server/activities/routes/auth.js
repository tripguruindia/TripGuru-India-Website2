const express = require('express');
const bcrypt = require('bcryptjs');
const { one } = require('../db');
const { signToken, loadUser } = require('../auth');

const router = express.Router();

// A small brake on password guessing: 10 failed tries per address per 15
// minutes. In memory, so it resets on a restart -- enough for a login form.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
function tooMany(key) {
  const f = failures.get(key);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return f.count >= 10;
}
function recordFailure(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > WINDOW_MS) failures.set(key, { first: Date.now(), count: 1 });
  else f.count += 1;
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role };
}

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const key = `${req.ip}|${email}`;
  if (tooMany(key)) return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
  const user = email ? await one('SELECT * FROM act_users WHERE email = ?', [email]) : null;
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    recordFailure(key);
    return res.status(401).json({ error: 'Email or password is wrong' });
  }
  failures.delete(key);
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', async (req, res) => {
  const user = await loadUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
