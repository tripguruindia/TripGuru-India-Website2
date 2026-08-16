require('dotenv').config();
// Must be required before any express.Router() is created (patches Router
// prototype) so that a rejected promise inside an async route handler is
// forwarded to the error-handling middleware instead of hanging the request.
require('express-async-errors');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');
const bookingsRoutes = require('./routes/bookings');

if (!process.env.JWT_SECRET) {
  // Fail fast rather than silently signing tokens with `undefined`.
  console.error('FATAL: JWT_SECRET env var is not set.');
  process.exit(1);
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow no-origin requests (curl, server-to-server, health checks).
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed`));
    },
  })
);
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/nepal/auth', authRoutes);
app.use('/api/nepal/admin', adminRoutes);
app.use('/api/nepal/public', publicRoutes);
app.use('/api/nepal/bookings', bookingsRoutes);

// Centralized error handler -- catches thrown/rejected errors from routes
// above (e.g. Prisma errors) so a bug never leaks a stack trace to the client.
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.publicMessage || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`tripguru-nepal-api listening on :${PORT}`);
});
