const jwt = require('jsonwebtoken');

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

module.exports = { signToken, requireAuth, requireRole, optionalAuth };
