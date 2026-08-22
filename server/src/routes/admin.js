const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  serializeHotel,
  serializeVehicle,
  serializeRoute,
  serializeActivity,
  serializePackage,
  serializeSettings,
  serializeBooking,
  serializeUser,
  serializeLead,
  serializeWalletTransaction,
} = require('../serializers');

const router = express.Router();

// Every route in this file is admin-only.
router.use(requireAuth, requireRole('admin'));

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

// ---------------------------------------------------------------------------
// Aggregate load -- shape matches what the old client-side initializeDB()
// produced, so the frontend's `db` object needs no restructuring.
// ---------------------------------------------------------------------------
router.get('/db', async (req, res) => {
  const [cities, hotels, vehicles, routes, activities, packages, settings, bookings, leads, users] =
    await Promise.all([
      all('SELECT name FROM cities ORDER BY name ASC'),
      all('SELECT * FROM hotels'),
      all('SELECT * FROM vehicles'),
      all('SELECT * FROM routes'),
      all('SELECT * FROM activities'),
      all('SELECT * FROM packages'),
      one('SELECT * FROM settings WHERE id = 1'),
      all('SELECT * FROM bookings ORDER BY created_at DESC'),
      all('SELECT * FROM leads ORDER BY created_at DESC'),
      all('SELECT * FROM users'),
    ]);

  res.json({
    cities: cities.map((c) => c.name),
    hotels: hotels.map(serializeHotel),
    vehicles: vehicles.map(serializeVehicle),
    routes: routes.map(serializeRoute),
    activities: activities.map(serializeActivity),
    packages: packages.map(serializePackage),
    settings: serializeSettings(settings) || {},
    bookings: bookings.map(serializeBooking),
    leads: leads.map(serializeLead),
    users: users.map(serializeUser),
  });
});

// ---------------------------------------------------------------------------
// Cities -- flat string list. PUT replaces the whole set.
// ---------------------------------------------------------------------------
router.get('/cities', async (req, res) => {
  const cities = await all('SELECT name FROM cities ORDER BY name ASC');
  res.json(cities.map((c) => c.name));
});

router.put('/cities', async (req, res) => {
  const names = Array.isArray(req.body?.cities) ? req.body.cities : req.body;
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: 'Body must be an array of city names' });
  }
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];

  const existing = (await all('SELECT name FROM cities')).map((c) => c.name);
  const toAdd = clean.filter((n) => !existing.includes(n));
  const toRemove = existing.filter((n) => !clean.includes(n));

  const statements = [
    ...toRemove.map((name) => ({ sql: 'DELETE FROM cities WHERE name = ?', args: [name] })),
    ...toAdd.map((name) => ({ sql: 'INSERT INTO cities (name) VALUES (?)', args: [name] })),
  ];
  if (statements.length) await client.batch(statements, 'write');

  const updated = await all('SELECT name FROM cities ORDER BY name ASC');
  res.json(updated.map((c) => c.name));
});

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------
router.get('/hotels', async (req, res) => {
  res.json((await all('SELECT * FROM hotels')).map(serializeHotel));
});

router.post('/hotels', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.rates) return res.status(400).json({ error: 'name and rates are required' });
  const id = b.id || genId('h');
  await run(
    'INSERT INTO hotels (id, name, city, category, description, rates) VALUES (?, ?, ?, ?, ?, ?)',
    [id, b.name, b.city || '', b.category || '3-Star', b.description || '', JSON.stringify(b.rates)]
  );
  res.status(201).json(serializeHotel(await one('SELECT * FROM hotels WHERE id = ?', [id])));
});

router.put('/hotels/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM hotels WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Hotel not found' });
  await run(
    'UPDATE hotels SET name = ?, city = ?, category = ?, description = ?, rates = ? WHERE id = ?',
    [
      b.name ?? existing.name,
      b.city ?? existing.city,
      b.category ?? existing.category,
      b.description ?? existing.description,
      JSON.stringify(b.rates ?? JSON.parse(existing.rates)),
      req.params.id,
    ]
  );
  res.json(serializeHotel(await one('SELECT * FROM hotels WHERE id = ?', [req.params.id])));
});

router.delete('/hotels/:id', async (req, res) => {
  const result = await run('DELETE FROM hotels WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Hotel not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
router.get('/vehicles', async (req, res) => {
  res.json((await all('SELECT * FROM vehicles')).map(serializeVehicle));
});

router.post('/vehicles', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const id = b.id || genId('v');
  await run(
    'INSERT INTO vehicles (id, name, description, capacity, daily_sightseeing_rate, route_rates) VALUES (?, ?, ?, ?, ?, ?)',
    [id, b.name, b.description || '', b.capacity ?? null, b.daily_sightseeing_rate ?? null, JSON.stringify(b.route_rates || {})]
  );
  res.status(201).json(serializeVehicle(await one('SELECT * FROM vehicles WHERE id = ?', [id])));
});

router.put('/vehicles/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
  await run(
    'UPDATE vehicles SET name = ?, description = ?, capacity = ?, daily_sightseeing_rate = ?, route_rates = ? WHERE id = ?',
    [
      b.name ?? existing.name,
      b.description ?? existing.description,
      b.capacity ?? existing.capacity,
      b.daily_sightseeing_rate ?? existing.daily_sightseeing_rate,
      JSON.stringify(b.route_rates ?? JSON.parse(existing.route_rates)),
      req.params.id,
    ]
  );
  res.json(serializeVehicle(await one('SELECT * FROM vehicles WHERE id = ?', [req.params.id])));
});

router.delete('/vehicles/:id', async (req, res) => {
  const result = await run('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Vehicle not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Routes (transfer routes, e.g. "ktm_to_pokhara")
// ---------------------------------------------------------------------------
router.get('/routes', async (req, res) => {
  res.json((await all('SELECT * FROM routes')).map(serializeRoute));
});

router.post('/routes', async (req, res) => {
  const b = req.body || {};
  if (!b.key || !b.name) return res.status(400).json({ error: 'key and name are required' });
  await run('INSERT INTO routes (key, name, description) VALUES (?, ?, ?)', [b.key, b.name, b.description || '']);
  res.status(201).json(serializeRoute(await one('SELECT * FROM routes WHERE key = ?', [b.key])));
});

router.put('/routes/:key', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM routes WHERE key = ?', [req.params.key]);
  if (!existing) return res.status(404).json({ error: 'Route not found' });
  await run('UPDATE routes SET name = ?, description = ? WHERE key = ?', [
    b.name ?? existing.name,
    b.description ?? existing.description,
    req.params.key,
  ]);
  res.json(serializeRoute(await one('SELECT * FROM routes WHERE key = ?', [req.params.key])));
});

router.delete('/routes/:key', async (req, res) => {
  const result = await run('DELETE FROM routes WHERE key = ?', [req.params.key]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Route not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
router.get('/activities', async (req, res) => {
  res.json((await all('SELECT * FROM activities')).map(serializeActivity));
});

router.post('/activities', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const id = b.id || genId('a');
  await run(
    'INSERT INTO activities (id, name, city, description, price_adult, price_child) VALUES (?, ?, ?, ?, ?, ?)',
    [id, b.name, b.city || '', b.description || '', b.price_adult ?? 0, b.price_child ?? 0]
  );
  res.status(201).json(serializeActivity(await one('SELECT * FROM activities WHERE id = ?', [id])));
});

router.put('/activities/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });
  await run(
    'UPDATE activities SET name = ?, city = ?, description = ?, price_adult = ?, price_child = ? WHERE id = ?',
    [
      b.name ?? existing.name,
      b.city ?? existing.city,
      b.description ?? existing.description,
      b.price_adult ?? existing.price_adult,
      b.price_child ?? existing.price_child,
      req.params.id,
    ]
  );
  res.json(serializeActivity(await one('SELECT * FROM activities WHERE id = ?', [req.params.id])));
});

router.delete('/activities/:id', async (req, res) => {
  const result = await run('DELETE FROM activities WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Activity not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Packages -- days[] embeds references to hotels/routes/activities by id.
// SQLite has no cross-JSON FK checking, so we validate them here.
// ---------------------------------------------------------------------------
async function validatePackageRefs(body) {
  const [hotels, routes, activities, vehicles] = await Promise.all([
    all('SELECT id FROM hotels'),
    all('SELECT key FROM routes'),
    all('SELECT id FROM activities'),
    all('SELECT id FROM vehicles'),
  ]);
  const hotelIds = new Set(hotels.map((h) => h.id));
  const routeKeys = new Set(routes.map((r) => r.key));
  const activityIds = new Set(activities.map((a) => a.id));
  const vehicleIds = new Set(vehicles.map((v) => v.id));

  const errors = [];
  if (body.default_vehicle_id && !vehicleIds.has(body.default_vehicle_id)) {
    errors.push(`default_vehicle_id "${body.default_vehicle_id}" does not exist`);
  }
  (body.days || []).forEach((day, i) => {
    if (day.hotelId && day.hotelId !== 'no_stay' && !hotelIds.has(day.hotelId)) {
      errors.push(`days[${i}].hotelId "${day.hotelId}" does not exist`);
    }
    if (day.transfer_route && !routeKeys.has(day.transfer_route)) {
      errors.push(`days[${i}].transfer_route "${day.transfer_route}" does not exist`);
    }
    (day.activity_ids || []).forEach((id) => {
      if (!activityIds.has(id)) errors.push(`days[${i}].activity_ids contains unknown id "${id}"`);
    });
  });
  return errors;
}

router.get('/packages', async (req, res) => {
  res.json((await all('SELECT * FROM packages')).map(serializePackage));
});

router.post('/packages', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const errors = await validatePackageRefs(b);
  if (errors.length) return res.status(400).json({ error: 'Invalid references', details: errors });

  const id = b.id || genId('pkg');
  await run(
    `INSERT INTO packages
      (id, name, description, duration_nights, default_hotel_category, default_vehicle_id, starting_price_override, cities, days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      b.name,
      b.description || '',
      b.duration_nights ?? null,
      b.default_hotel_category || null,
      b.default_vehicle_id || null,
      b.starting_price_override ?? null,
      JSON.stringify(b.cities || []),
      JSON.stringify(b.days || []),
    ]
  );
  res.status(201).json(serializePackage(await one('SELECT * FROM packages WHERE id = ?', [id])));
});

router.put('/packages/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM packages WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Package not found' });

  const errors = await validatePackageRefs(b);
  if (errors.length) return res.status(400).json({ error: 'Invalid references', details: errors });

  await run(
    `UPDATE packages SET name = ?, description = ?, duration_nights = ?, default_hotel_category = ?,
      default_vehicle_id = ?, starting_price_override = ?, cities = ?, days = ? WHERE id = ?`,
    [
      b.name ?? existing.name,
      b.description ?? existing.description,
      b.duration_nights ?? existing.duration_nights,
      b.default_hotel_category ?? existing.default_hotel_category,
      b.default_vehicle_id ?? existing.default_vehicle_id,
      b.starting_price_override ?? existing.starting_price_override,
      JSON.stringify(b.cities ?? JSON.parse(existing.cities)),
      JSON.stringify(b.days ?? JSON.parse(existing.days)),
      req.params.id,
    ]
  );
  res.json(serializePackage(await one('SELECT * FROM packages WHERE id = ?', [req.params.id])));
});

router.delete('/packages/:id', async (req, res) => {
  const result = await run('DELETE FROM packages WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Package not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Settings -- singleton row.
// ---------------------------------------------------------------------------
router.get('/settings', async (req, res) => {
  res.json(serializeSettings(await one('SELECT * FROM settings WHERE id = 1')) || {});
});

router.put('/settings', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM settings WHERE id = 1');

  const values = {
    markup_percent: b.markup_percent ?? existing?.markup_percent ?? 15,
    b2c_markup_percent: b.b2c_markup_percent ?? existing?.b2c_markup_percent ?? 15,
    b2b_markup_percent: b.b2b_markup_percent ?? existing?.b2b_markup_percent ?? 10,
    b2b_admin_margin_percent: b.b2b_admin_margin_percent ?? existing?.b2b_admin_margin_percent ?? 10,
    tax_percent: b.tax_percent ?? existing?.tax_percent ?? 13,
    exchange_rate: b.exchange_rate ?? existing?.exchange_rate ?? null,
    popup_poster_url: b.popup_poster_url ?? existing?.popup_poster_url ?? null,
    popup_poster_active: (b.popup_poster_active ?? existing?.popup_poster_active) ? 1 : 0,
  };

  await run(
    `INSERT INTO settings (id, markup_percent, b2c_markup_percent, b2b_markup_percent, b2b_admin_margin_percent, tax_percent, exchange_rate, popup_poster_url, popup_poster_active)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       markup_percent = excluded.markup_percent,
       b2c_markup_percent = excluded.b2c_markup_percent,
       b2b_markup_percent = excluded.b2b_markup_percent,
       b2b_admin_margin_percent = excluded.b2b_admin_margin_percent,
       tax_percent = excluded.tax_percent,
       exchange_rate = excluded.exchange_rate,
       popup_poster_url = excluded.popup_poster_url,
       popup_poster_active = excluded.popup_poster_active`,
    [
      values.markup_percent,
      values.b2c_markup_percent,
      values.b2b_markup_percent,
      values.b2b_admin_margin_percent,
      values.tax_percent,
      values.exchange_rate,
      values.popup_poster_url,
      values.popup_poster_active,
    ]
  );
  res.json(serializeSettings(await one('SELECT * FROM settings WHERE id = 1')));
});

// ---------------------------------------------------------------------------
// Users -- admin can manage any role here (unlike public /auth/signup,
// which is restricted to b2c/b2b). Passwords are never returned; use
// POST /users/:id/reset-password instead of the old plaintext display.
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  res.json((await all('SELECT * FROM users')).map(serializeUser));
});

router.post('/users', async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.password || !b.role) {
    return res.status(400).json({ error: 'email, password, and role are required' });
  }
  const normalizedEmail = String(b.email).toLowerCase().trim();
  const existing = await one('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

  const passwordHash = await bcrypt.hash(b.password, 10);
  const id = b.id || genId('usr');
  await run(
    `INSERT INTO users
      (id, email, password_hash, role, full_name, phone, country_code,
       agency_name, agency_address, agency_phone, agency_email, agency_website,
       address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      normalizedEmail,
      passwordHash,
      b.role,
      b.fullName || '',
      b.phone || '',
      b.countryCode || '',
      b.agencyName || null,
      b.agencyAddress || null,
      b.agencyPhone || null,
      b.agencyEmail || null,
      b.agencyWebsite || null,
      b.address || null,
      new Date().toISOString(),
    ]
  );
  res.status(201).json(serializeUser(await one('SELECT * FROM users WHERE id = ?', [id])));
});

router.put('/users/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  await run(
    `UPDATE users SET full_name = ?, phone = ?, country_code = ?, agency_name = ?, agency_address = ?,
      agency_phone = ?, agency_email = ?, agency_website = ?, address = ? WHERE id = ?`,
    [
      b.fullName ?? existing.full_name,
      b.phone ?? existing.phone,
      b.countryCode ?? existing.country_code,
      b.agencyName ?? existing.agency_name,
      b.agencyAddress ?? existing.agency_address,
      b.agencyPhone ?? existing.agency_phone,
      b.agencyEmail ?? existing.agency_email,
      b.agencyWebsite ?? existing.agency_website,
      b.address ?? existing.address,
      req.params.id,
    ]
  );
  res.json(serializeUser(await one('SELECT * FROM users WHERE id = ?', [req.params.id])));
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters and include a letter and a digit' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const result = await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Wallet -- an agent's wallet_balance is deliberately not editable via the
// PUT above: this is the only path allowed to change it, so it always moves
// in step with a wallet_transactions row that explains why. There is no
// automatic crediting on booking creation (a booking's commission isn't
// necessarily paid out yet) -- every entry here is a deliberate admin action.
// ---------------------------------------------------------------------------
router.get('/users/:id/wallet', async (req, res) => {
  const user = await one('SELECT id, role, wallet_balance FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'b2b') return res.status(400).json({ error: 'Only B2B agents have a wallet' });

  const rows = await all(
    'SELECT * FROM wallet_transactions WHERE agent_id = ? ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json({
    balance: user.wallet_balance,
    transactions: rows.map(serializeWalletTransaction),
  });
});

router.post('/users/:id/wallet', async (req, res) => {
  const user = await one('SELECT id, role, wallet_balance FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'b2b') return res.status(400).json({ error: 'Only B2B agents have a wallet' });

  const b = req.body || {};
  if (b.type !== 'credit' && b.type !== 'debit') {
    return res.status(400).json({ error: "type must be 'credit' or 'debit'" });
  }
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  if (!b.reason || !String(b.reason).trim()) {
    return res.status(400).json({ error: 'reason is required, e.g. what this credit/debit is for' });
  }

  const id = genId('wtx');
  const now = new Date().toISOString();
  const delta = b.type === 'credit' ? amount : -amount;

  await run(
    `INSERT INTO wallet_transactions (id, agent_id, type, amount, reason, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, req.params.id, b.type, amount, String(b.reason).trim(), req.user.id, now]
  );
  await run('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [delta, req.params.id]);

  const [transaction, updatedUser] = await Promise.all([
    one('SELECT * FROM wallet_transactions WHERE id = ?', [id]),
    one('SELECT wallet_balance FROM users WHERE id = ?', [req.params.id]),
  ]);
  res.status(201).json({
    balance: updatedUser.wallet_balance,
    transaction: serializeWalletTransaction(transaction),
  });
});

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
router.get('/leads', async (req, res) => {
  res.json((await all('SELECT * FROM leads ORDER BY created_at DESC')).map(serializeLead));
});

router.delete('/leads/:id', async (req, res) => {
  const result = await run('DELETE FROM leads WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Lead not found' });
  res.status(204).end();
});

router.delete('/leads', async (req, res) => {
  await run('DELETE FROM leads');
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Bookings -- read-only in Phase 0. Write path arrives with B2C/B2B wiring.
// ---------------------------------------------------------------------------
router.get('/bookings', async (req, res) => {
  res.json((await all('SELECT * FROM bookings ORDER BY created_at DESC')).map(serializeBooking));
});

module.exports = router;
