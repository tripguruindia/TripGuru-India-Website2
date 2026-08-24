const jwt = require('jsonwebtoken');
const client = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Verifies the Bearer token and attaches { id, role, email } to req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Use after requireAuth. Rejects unless req.user.role is one of `roles`.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }
    next();
  };
}

// Like requireAuth, but never rejects -- attaches req.user if a valid
// bearer token is present, otherwise leaves it undefined and continues.
// For routes that serve both logged-in users and anonymous visitors (e.g.
// B2C guest checkout, which has never required an account).
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // Invalid/expired token on an optional-auth route: treat as anonymous
    // rather than rejecting the request.
  }
  next();
}

// ---------------------------------------------------------------------------
// Use after requireAuth (or optionalAuth) on any route that lets an agent
// TRADE -- create or amend a booking or a quote. A B2B account starts life
// 'pending' and must be approved by an admin before it can do either.
//
// The status is read from the DATABASE, never from the token. Tokens last 30
// days, so an agent rejected this morning would still be carrying a token
// minted while he was approved; trusting the token would leave him trading
// until it expired. This costs one indexed lookup on the write paths only --
// reads are left alone so the "awaiting approval" screen can still load.
//
// Anyone who is not a B2B agent passes straight through: this is a rule about
// agent accounts, not a general permission check.
// ---------------------------------------------------------------------------
async function requireApprovedAgent(req, res, next) {
  if (!req.user || req.user.role !== 'b2b') return next();
  try {
    const rs = await client.execute({
      sql: 'SELECT approval_status FROM users WHERE id = ?',
      args: [req.user.id],
    });
    const row = rs.rows[0];
    if (!row) return res.status(401).json({ error: 'Account not found' });
    // Missing column/value on a database that predates the migration means an
    // existing, working account -- treat it as approved, never as pending.
    const status = row.approval_status || 'approved';
    if (status === 'approved') return next();
    return res.status(403).json({
      error:
        status === 'rejected'
          ? 'This agent account has been rejected. Please contact TripGuru.'
          : 'This agent account is awaiting approval by TripGuru.',
      approvalStatus: status,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { signToken, requireAuth, requireRole, optionalAuth, requireApprovedAgent };
