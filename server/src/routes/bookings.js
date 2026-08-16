const express = require('express');
const client = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { serializeBooking } = require('../serializers');

const router = express.Router();

function genId() {
  return `qt-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4)}`;
}

async function all(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rs.rows;
}

async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

async function run(sql, args = []) {
  return client.execute({ sql, args });
}

const AGENT_COMMISSION_RATE = 0.1;

// ---------------------------------------------------------------------------
// POST /bookings -- optionalAuth, not requireAuth: B2C guest checkout has
// never required an account (see App.jsx handleConfirmCheckout /
// isLeadCaptured), so this route must keep working for anonymous visitors.
// B2B bookings DO require a real logged-in agent, since agent_id/commission
// must come from the server, never the client (the old frontend hardcoded
// agent_id: 'AGT-9021' for every single B2B booking -- this route is what
// fixes that).
// ---------------------------------------------------------------------------
router.post('/', optionalAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.client_name || !b.email || !b.phone) {
    return res.status(400).json({ error: 'client_name, email, and phone are required' });
  }
  const type = b.type === 'B2B' ? 'B2B' : 'B2C';

  let agentId = null;
  let agentCommission = null;
  let userId = null;

  if (type === 'B2B') {
    if (!req.user || req.user.role !== 'b2b') {
      return res.status(401).json({ error: 'A B2B agent account is required to submit a B2B booking' });
    }
    agentId = req.user.id;
    agentCommission = Math.round(Number(b.total_price || 0) * AGENT_COMMISSION_RATE);
  } else if (req.user && req.user.role === 'b2c') {
    // Logged-in traveler: link the booking to their account. Anonymous
    // B2C checkout (no account) still works -- userId just stays null,
    // matching today's behavior of no real ownership tracking.
    userId = req.user.id;
  }

  const id = b.id && String(b.id).trim() ? String(b.id).trim() : genId();
  const createdAt = new Date().toISOString();

  await run(
    `INSERT INTO bookings
      (id, client_name, email, phone, travel_date, adults, cwb, cnb, total_price,
       package_name, status, created_at, itinerary_summary, type, agent_id,
       agent_commission, vehicle_id, hotel_category, start_city, end_city, notes,
       markup_percent, b2b_admin_margin_percent, passengers, itinerary, rooms,
       b2b_white_label, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      b.client_name,
      b.email,
      b.phone,
      b.travel_date || null,
      b.adults || 0,
      b.cwb || 0,
      b.cnb || 0,
      b.total_price || 0,
      b.package_name || '',
      b.status || 'Confirmed',
      createdAt,
      b.itinerary_summary || '',
      type,
      agentId,
      agentCommission,
      b.vehicleId || b.vehicle_id || null,
      b.hotelCategory || b.hotel_category || null,
      b.startCity || b.start_city || null,
      b.endCity || b.end_city || null,
      b.notes || '',
      b.markup_percent ?? null,
      b.b2b_admin_margin_percent ?? null,
      JSON.stringify(b.passengers || []),
      JSON.stringify(b.itinerary || []),
      JSON.stringify(b.rooms || []),
      b.b2b_white_label ? JSON.stringify(b.b2b_white_label) : null,
      userId,
    ]
  );

  res.status(201).json(serializeBooking(await one('SELECT * FROM bookings WHERE id = ?', [id])));
});

// ---------------------------------------------------------------------------
// GET /bookings/mine -- requires auth (any role except admin, which already
// has GET /admin/db for the full list). Scoped to the caller: agent_id for
// b2b, user_id for b2c.
// ---------------------------------------------------------------------------
router.get('/mine', requireAuth, async (req, res) => {
  if (req.user.role === 'b2b') {
    const rows = await all('SELECT * FROM bookings WHERE agent_id = ? ORDER BY created_at DESC', [req.user.id]);
    return res.json(rows.map(serializeBooking));
  }
  if (req.user.role === 'b2c') {
    const rows = await all('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    return res.json(rows.map(serializeBooking));
  }
  return res.status(403).json({ error: 'Forbidden for this role' });
});

module.exports = router;
