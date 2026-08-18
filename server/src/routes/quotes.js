const express = require('express');
const client = require('../db');
const { requireAuth } = require('../middleware/auth');
const { serializeQuote } = require('../serializers');

const router = express.Router();

function genId() {
  return `qo-${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 4)}`;
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

const VALID_STATUSES = ['Draft', 'Sent', 'Won', 'Lost'];
const AGENT_COMMISSION_RATE = 0.1;

// Every quote belongs to exactly one account, and which column holds that
// depends on the role. Ownership is derived from the verified JWT only --
// a client-supplied agent_id/user_id is never trusted, matching the rule
// that governs bookings.agent_id.
function ownerFilter(user) {
  return user.role === 'b2b'
    ? { column: 'agent_id', id: user.id }
    : { column: 'user_id', id: user.id };
}

const J = (v, fallback) => JSON.stringify(v === undefined ? fallback : v);
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

// ---------------------------------------------------------------------------
// GET /quotes/mine -- the caller's own quotes, newest first.
// Optional ?status=Draft filter for the pipeline columns.
// ---------------------------------------------------------------------------
router.get('/mine', requireAuth, async (req, res) => {
  const { column, id } = ownerFilter(req.user);
  const status = req.query.status;

  let sql = `SELECT * FROM quotes WHERE ${column} = ?`;
  const args = [id];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }
    sql += ' AND status = ?';
    args.push(status);
  }

  sql += ' ORDER BY updated_at DESC';
  const rows = await all(sql, args);
  res.json(rows.map(serializeQuote));
});

// ---------------------------------------------------------------------------
// GET /quotes/:id -- scoped to the owner, so one agent can never read
// another agent's quote by guessing an id.
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
  const { column, id } = ownerFilter(req.user);
  const quote = await one(
    `SELECT * FROM quotes WHERE id = ? AND ${column} = ?`,
    [req.params.id, id]
  );
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(serializeQuote(quote));
});

// ---------------------------------------------------------------------------
// POST /quotes -- save a new quote.
// ---------------------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const now = new Date().toISOString();
  const id = genId();
  const { column, id: ownerId } = ownerFilter(req.user);

  const status = VALID_STATUSES.includes(b.status) ? b.status : 'Draft';

  await run(
    `INSERT INTO quotes (
       id, agent_id, user_id, client_name, client_email, client_phone,
       country_code, package_name, travel_date, total_price, status,
       valid_until, adults, cwb, cnb, vehicle_id, hotel_category,
       start_city, end_city, markup_percent, b2b_admin_margin_percent,
       offer_discount_per_pax, itinerary, rooms, passengers, notes,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      column === 'agent_id' ? ownerId : null,
      column === 'user_id' ? ownerId : null,
      b.client_name || '',
      b.client_email || '',
      b.client_phone || '',
      b.country_code || '',
      b.package_name || '',
      b.travel_date || '',
      num(b.total_price),
      status,
      b.valid_until || null,
      Number(b.adults || 0),
      Number(b.cwb || 0),
      Number(b.cnb || 0),
      b.vehicle_id || '',
      b.hotel_category || '',
      b.start_city || '',
      b.end_city || '',
      num(b.markup_percent),
      num(b.b2b_admin_margin_percent),
      Number(b.offer_discount_per_pax || 0),
      J(b.itinerary, []),
      J(b.rooms, []),
      J(b.passengers, []),
      b.notes || '',
      now,
      now,
    ]
  );

  const created = await one('SELECT * FROM quotes WHERE id = ?', [id]);
  res.status(201).json(serializeQuote(created));
});

// ---------------------------------------------------------------------------
// PATCH /quotes/:id -- partial update. Only the fields present in the body
// are written, so the UI can autosave an itinerary edit or flip a status
// without resending the whole quote.
// ---------------------------------------------------------------------------
const PATCHABLE = {
  client_name: (v) => String(v || ''),
  client_email: (v) => String(v || ''),
  client_phone: (v) => String(v || ''),
  country_code: (v) => String(v || ''),
  package_name: (v) => String(v || ''),
  travel_date: (v) => String(v || ''),
  total_price: num,
  valid_until: (v) => v || null,
  adults: (v) => Number(v || 0),
  cwb: (v) => Number(v || 0),
  cnb: (v) => Number(v || 0),
  vehicle_id: (v) => String(v || ''),
  hotel_category: (v) => String(v || ''),
  start_city: (v) => String(v || ''),
  end_city: (v) => String(v || ''),
  markup_percent: num,
  b2b_admin_margin_percent: num,
  offer_discount_per_pax: (v) => Number(v || 0),
  itinerary: (v) => J(v, []),
  rooms: (v) => J(v, []),
  passengers: (v) => J(v, []),
  notes: (v) => String(v || ''),
};

router.patch('/:id', requireAuth, async (req, res) => {
  const { column, id: ownerId } = ownerFilter(req.user);
  const existing = await one(
    `SELECT * FROM quotes WHERE id = ? AND ${column} = ?`,
    [req.params.id, ownerId]
  );
  if (!existing) return res.status(404).json({ error: 'Quote not found' });

  // A converted quote is part of a booking's history -- editing it after the
  // fact would rewrite the record of what the client actually agreed to.
  if (existing.converted_booking_id) {
    return res.status(409).json({
      error: 'This quote has been converted to a booking and can no longer be edited',
    });
  }

  const b = req.body || {};
  const sets = [];
  const args = [];

  for (const [field, coerce] of Object.entries(PATCHABLE)) {
    if (b[field] !== undefined) {
      sets.push(`${field} = ?`);
      args.push(coerce(b[field]));
    }
  }

  if (b.status !== undefined) {
    if (!VALID_STATUSES.includes(b.status)) {
      return res.status(400).json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` });
    }
    // 'Won' is reserved for the convert endpoint, which is what actually
    // creates the booking -- letting the client set it directly would allow
    // a quote to look won with no booking behind it.
    if (b.status === 'Won') {
      return res.status(400).json({
        error: "Use POST /quotes/:id/convert to mark a quote Won",
      });
    }
    sets.push('status = ?');
    args.push(b.status);
    if (b.status === 'Sent') {
      sets.push('last_sent_at = ?');
      args.push(new Date().toISOString());
    }
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No updatable fields supplied' });
  }

  sets.push('updated_at = ?');
  args.push(new Date().toISOString());
  args.push(req.params.id, ownerId);

  await run(
    `UPDATE quotes SET ${sets.join(', ')} WHERE id = ? AND ${column} = ?`,
    args
  );

  const updated = await one('SELECT * FROM quotes WHERE id = ?', [req.params.id]);
  res.json(serializeQuote(updated));
});

// ---------------------------------------------------------------------------
// DELETE /quotes/:id
// ---------------------------------------------------------------------------
router.delete('/:id', requireAuth, async (req, res) => {
  const { column, id: ownerId } = ownerFilter(req.user);
  const existing = await one(
    `SELECT id, converted_booking_id FROM quotes WHERE id = ? AND ${column} = ?`,
    [req.params.id, ownerId]
  );
  if (!existing) return res.status(404).json({ error: 'Quote not found' });
  if (existing.converted_booking_id) {
    return res.status(409).json({
      error: 'This quote has been converted to a booking and cannot be deleted',
    });
  }
  await run(`DELETE FROM quotes WHERE id = ? AND ${column} = ?`, [req.params.id, ownerId]);
  res.json({ deleted: true, id: req.params.id });
});

// ---------------------------------------------------------------------------
// POST /quotes/:id/convert -- turn an accepted quote into a real booking.
//
// This is the only path that marks a quote 'Won', so a Won quote always has
// a booking behind it. Commission is computed server-side from the stored
// total, exactly as in POST /bookings -- never taken from the request.
// Idempotent: converting twice returns the existing booking rather than
// creating a duplicate.
// ---------------------------------------------------------------------------
router.post('/:id/convert', requireAuth, async (req, res) => {
  const { column, id: ownerId } = ownerFilter(req.user);
  const quote = await one(
    `SELECT * FROM quotes WHERE id = ? AND ${column} = ?`,
    [req.params.id, ownerId]
  );
  if (!quote) return res.status(404).json({ error: 'Quote not found' });

  if (quote.converted_booking_id) {
    const existing = await one('SELECT * FROM bookings WHERE id = ?', [quote.converted_booking_id]);
    if (existing) {
      const { serializeBooking } = require('../serializers');
      return res.json({ booking: serializeBooking(existing), quote: serializeQuote(quote), already: true });
    }
  }

  if (!quote.client_name || !quote.client_email || !quote.client_phone) {
    return res.status(400).json({
      error: 'A quote needs a client name, email and phone before it can be booked',
    });
  }

  const isB2B = req.user.role === 'b2b';
  const now = new Date().toISOString();
  const bookingId = `qt-${Date.now().toString().slice(-4)}${Math.random().toString(36).slice(2, 4)}`;

  // The booking list renders package_name and itinerary_summary as two lines,
  // so copying the package name into both just prints it twice. Rebuild the
  // same one-line shape POST /bookings stores ("5 Nights, 2 Adults, ...").
  const nights = (() => {
    try {
      const parsed = JSON.parse(quote.itinerary || '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  })();
  const itinerarySummary = [
    `${nights} Nights`,
    `${quote.adults || 0} Adults`,
    `${quote.cwb || 0} CWB`,
    `${quote.cnb || 0} CNB`,
    `${quote.hotel_category || 'Standard'} Hotels.`,
  ].join(', ');

  await run(
    `INSERT INTO bookings (
       id, client_name, email, phone, travel_date, adults, cwb, cnb,
       total_price, package_name, status, created_at, itinerary_summary,
       type, agent_id, agent_commission, vehicle_id, hotel_category,
       start_city, end_city, notes, markup_percent, b2b_admin_margin_percent,
       passengers, itinerary, rooms, user_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      quote.client_name,
      quote.client_email,
      quote.client_phone,
      quote.travel_date || '',
      quote.adults || 0,
      quote.cwb || 0,
      quote.cnb || 0,
      quote.total_price,
      quote.package_name || '',
      'Confirmed',
      now,
      itinerarySummary,
      isB2B ? 'B2B' : 'B2C',
      isB2B ? ownerId : null,
      isB2B ? Math.round(Number(quote.total_price || 0) * AGENT_COMMISSION_RATE) : null,
      quote.vehicle_id || '',
      quote.hotel_category || '',
      quote.start_city || '',
      quote.end_city || '',
      quote.notes || '',
      quote.markup_percent,
      quote.b2b_admin_margin_percent,
      quote.passengers || '[]',
      quote.itinerary || '[]',
      quote.rooms || '[]',
      isB2B ? null : ownerId,
    ]
  );

  await run(
    'UPDATE quotes SET status = ?, converted_booking_id = ?, updated_at = ? WHERE id = ?',
    ['Won', bookingId, now, quote.id]
  );

  const booking = await one('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  const updatedQuote = await one('SELECT * FROM quotes WHERE id = ?', [quote.id]);
  const { serializeBooking } = require('../serializers');

  res.status(201).json({
    booking: serializeBooking(booking),
    quote: serializeQuote(updatedQuote),
  });
});

module.exports = router;
