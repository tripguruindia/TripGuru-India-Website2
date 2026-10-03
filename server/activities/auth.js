const jwt = require('jsonwebtoken');
const { one } = require('./db');

// Own signing key, so a Nepal portal token can never be used here and the
// other way round. Derived from the Nepal key when no dedicated one is set,
// which keeps the deploy to a single env var today.
const SECRET = process.env.ACTIVITIES_JWT_SECRET
  || (process.env.JWT_SECRET ? process.env.JWT_SECRET + ':activities' : '');

function signToken(user) {
  if (!SECRET) throw new Error('No signing key configured');
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '30d' });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ') || !SECRET) return null;
  try {
    return jwt.verify(header.slice(7), SECRET);
  } catch {
    return null;
  }
}

// The role is read from the database on every request, never trusted from
// the token: an account demoted this morning must not keep its powers for
// the 30 days its token lasts.
async function loadUser(req) {
  const payload = readToken(req);
  if (!payload) return null;
  return one('SELECT id, email, name, phone, role, approval_status FROM act_users WHERE id = ?', [payload.id]);
}

function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await loadUser(req);
    if (!user) return res.status(401).json({ error: 'Please sign in' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Not allowed for this account' });
    req.user = user;
    next();
  };
}

async function optionalUser(req, res, next) {
  req.user = await loadUser(req);
  next();
}

module.exports = { signToken, loadUser, requireRole, optionalUser };
