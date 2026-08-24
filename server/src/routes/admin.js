const express = require('express');
const bcrypt = require('bcryptjs');
const client = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  serializeHotel,
  serializeVehicle,
  parseJSON,
  serializeRoute,
  serializeAirport,
  serializeActivity,
  serializeCityDefault,
  serializeVehiclePackage,
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
  const [cities, airports, hotels, vehicles, routes, activities, packages, settings, bookings, leads, users, cityDefaults, vehiclePackages] =
    await Promise.all([
      all('SELECT name, country FROM cities ORDER BY name ASC'),
      all('SELECT * FROM airports'),
      all('SELECT * FROM hotels'),
      all('SELECT * FROM vehicles'),
      all('SELECT * FROM routes'),
      all('SELECT * FROM activities'),
      all('SELECT * FROM packages'),
      one('SELECT * FROM settings WHERE id = 1'),
      all('SELECT * FROM bookings ORDER BY created_at DESC'),
      all('SELECT * FROM leads ORDER BY created_at DESC'),
      all('SELECT * FROM users'),
      all('SELECT * FROM city_defaults'),
      all('SELECT * FROM vehicle_packages'),
    ]);

  res.json({
    cities: cities.map((c) => c.name),
    // A parallel map rather than turning `cities` into objects: every dropdown
    // in the portal reads that flat name list, and reshaping it would ripple
    // through all of them for one extra field.
    city_countries: Object.fromEntries(
      cities.map((c) => [c.name, c.country === 'india' ? 'india' : 'nepal'])
    ),
    airports: airports.map(serializeAirport),
    hotels: hotels.map(serializeHotel),
    vehicles: vehicles.map(serializeVehicle),
    routes: routes.map(serializeRoute),
    activities: activities.map(serializeActivity),
    packages: packages.map(serializePackage),
    settings: serializeSettings(settings) || {},
    bookings: bookings.map(serializeBooking),
    leads: leads.map(serializeLead),
    users: users.map(serializeUser),
    city_defaults: cityDefaults.map(serializeCityDefault),
    vehicle_packages: vehiclePackages.map(serializeVehiclePackage),
  });
});

// ---------------------------------------------------------------------------
// Vehicle packages -- one rate for the vehicle across a whole trip, instead of
// adding up sector by sector. See the table comment in db/schema.sql.
// ---------------------------------------------------------------------------
router.get('/vehicle-packages', async (req, res) => {
  res.json((await all('SELECT * FROM vehicle_packages')).map(serializeVehiclePackage));
});

function normaliseCityList(input) {
  // Stored trimmed, de-duplicated and sorted, so the row is written the same
  // way however the admin typed it and matching never depends on order.
  const list = Array.isArray(input) ? input : [];
  const seen = new Map();
  for (const c of list) {
    const name = String(c || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

router.post('/vehicle-packages', async (req, res) => {
  const b = req.body || {};
  const cities = normaliseCityList(b.cities);
  const days = Number(b.days);
  const rate = Number(b.rate);

  if (!b.vehicle_id || !String(b.start_city || '').trim() || !String(b.end_city || '').trim()) {
    return res.status(400).json({ error: 'vehicle_id, start_city and end_city are required' });
  }
  if (cities.length === 0) return res.status(400).json({ error: 'At least one overnight city is required' });
  if (!Number.isFinite(days) || days < 1) return res.status(400).json({ error: 'days must be 1 or more' });
  if (!Number.isFinite(rate) || rate < 0) return res.status(400).json({ error: 'rate must be 0 or more' });

  const id = b.id && String(b.id).trim() ? String(b.id).trim() : genId('vpkg');
  await run(
    `INSERT INTO vehicle_packages (id, vehicle_id, start_city, end_city, cities, days, rate)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       vehicle_id = excluded.vehicle_id, start_city = excluded.start_city,
       end_city = excluded.end_city, cities = excluded.cities,
       days = excluded.days, rate = excluded.rate`,
    [
      id,
      String(b.vehicle_id),
      String(b.start_city).trim(),
      String(b.end_city).trim(),
      JSON.stringify(cities),
      Math.round(days),
      rate,
    ]
  );
  res.status(201).json(serializeVehiclePackage(await one('SELECT * FROM vehicle_packages WHERE id = ?', [id])));
});

router.delete('/vehicle-packages/:id', async (req, res) => {
  await run('DELETE FROM vehicle_packages WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// City defaults -- what a freshly built day in this city starts out as.
// Upsert by city name; DELETE clears the city back to the built-in fallback.
// ---------------------------------------------------------------------------
router.get('/city-defaults', async (req, res) => {
  res.json((await all('SELECT * FROM city_defaults')).map(serializeCityDefault));
});

router.put('/city-defaults/:city', async (req, res) => {
  const b = req.body || {};
  const city = String(req.params.city || '').trim();
  if (!city) return res.status(400).json({ error: 'city is required' });

  const meals = b.default_meals === undefined || b.default_meals === null ? '' : String(b.default_meals).trim();
  if (meals && !['CP', 'MAP', 'AP'].includes(meals)) {
    return res.status(400).json({ error: "default_meals must be 'CP', 'MAP', 'AP', or empty" });
  }

  await run(
    `INSERT INTO city_defaults (city, default_hotels, default_meals, night_plans)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(city) DO UPDATE SET
       default_hotels = excluded.default_hotels,
       default_meals  = excluded.default_meals,
       night_plans    = excluded.night_plans`,
    [
      city,
      JSON.stringify(b.default_hotels || {}),
      meals || null,
      JSON.stringify(b.night_plans || {}),
    ]
  );
  res.json(serializeCityDefault(await one('SELECT * FROM city_defaults WHERE city = ?', [city])));
});

router.delete('/city-defaults/:city', async (req, res) => {
  await run('DELETE FROM city_defaults WHERE city = ?', [String(req.params.city || '').trim()]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Cities -- flat string list. PUT replaces the whole set.
// ---------------------------------------------------------------------------
router.get('/cities', async (req, res) => {
  const cities = await all('SELECT name FROM cities ORDER BY name ASC');
  res.json(cities.map((c) => c.name));
});

// Which side of the border a city is on. Kept as its own route rather than
// folded into PUT /cities, which replaces the whole list from an array of
// names -- a shape that has no room for a country and would drop them all.
router.patch('/cities/:name/country', async (req, res) => {
  const country = String(req.body?.country || '').trim().toLowerCase();
  if (!['india', 'nepal'].includes(country)) {
    return res.status(400).json({ error: "country must be 'india' or 'nepal'" });
  }
  const name = String(req.params.name || '').trim();
  const existing = await one('SELECT name FROM cities WHERE name = ?', [name]);
  if (!existing) return res.status(404).json({ error: 'City not found' });
  await run('UPDATE cities SET country = ? WHERE name = ?', [country, name]);
  res.json({ name, country });
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
// Airports -- one airport can serve several cities, so `cities` is a list.
// See the table comment in db/schema.sql for why this isn't a cities column.
// ---------------------------------------------------------------------------
router.get('/airports', async (req, res) => {
  res.json((await all('SELECT * FROM airports')).map(serializeAirport));
});

router.post('/airports', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const id = b.id || genId('apt');
  await run(
    'INSERT INTO airports (id, name, code, cities) VALUES (?, ?, ?, ?)',
    [id, b.name, b.code || '', JSON.stringify(Array.isArray(b.cities) ? b.cities : [])]
  );
  res.status(201).json(serializeAirport(await one('SELECT * FROM airports WHERE id = ?', [id])));
});

router.put('/airports/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM airports WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Airport not found' });
  await run(
    'UPDATE airports SET name = ?, code = ?, cities = ? WHERE id = ?',
    [
      b.name ?? existing.name,
      b.code ?? existing.code,
      JSON.stringify(Array.isArray(b.cities) ? b.cities : parseJSON(existing.cities, [])),
      req.params.id,
    ]
  );
  res.json(serializeAirport(await one('SELECT * FROM airports WHERE id = ?', [req.params.id])));
});

router.delete('/airports/:id', async (req, res) => {
  const result = await run('DELETE FROM airports WHERE id = ?', [req.params.id]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Airport not found' });
  res.status(204).end();
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
    `INSERT INTO vehicles (id, name, description, capacity, daily_sightseeing_rate, route_rates, origin)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id, b.name, b.description || '', b.capacity ?? null, b.daily_sightseeing_rate ?? null,
      // An Indian vehicle is quoted only from a package, so it never carries
      // sector rates -- store none rather than leaving stale numbers behind.
      JSON.stringify(b.origin === 'india' ? {} : (b.route_rates || {})),
      b.origin === 'india' ? 'india' : 'nepal',
    ]
  );
  res.status(201).json(serializeVehicle(await one('SELECT * FROM vehicles WHERE id = ?', [id])));
});

router.put('/vehicles/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });
  await run(
    `UPDATE vehicles SET name = ?, description = ?, capacity = ?, daily_sightseeing_rate = ?,
       route_rates = ?, origin = ? WHERE id = ?`,
    (() => {
      const origin = b.origin === undefined
        ? (existing.origin === 'india' ? 'india' : 'nepal')
        : (b.origin === 'india' ? 'india' : 'nepal');
      return [
        b.name ?? existing.name,
        b.description ?? existing.description,
        b.capacity ?? existing.capacity,
        b.daily_sightseeing_rate ?? existing.daily_sightseeing_rate,
        // Switching a vehicle to Indian clears its sector rates: it is quoted
        // only from a package, and leaving the old numbers behind would let a
        // stale rate reappear if it were ever switched back.
        JSON.stringify(origin === 'india' ? {} : (b.route_rates ?? JSON.parse(existing.route_rates))),
        origin,
        req.params.id,
      ];
    })()
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
    `INSERT INTO activities (id, name, city, description, price_adult, price_child, pricing_mode,
       vehicle_rates, covered_by_vehicle_package)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, b.name, b.city || '', b.description || '',
      b.price_adult ?? 0, b.price_child ?? 0,
      b.pricing_mode === 'per_vehicle' ? 'per_vehicle' : 'per_person',
      JSON.stringify(b.vehicle_rates || {}),
      // Unspecified means covered: ordinary local sightseeing is what a
      // package includes, and the extras are the exception.
      b.covered_by_vehicle_package === undefined ? 1 : (b.covered_by_vehicle_package ? 1 : 0),
    ]
  );
  res.status(201).json(serializeActivity(await one('SELECT * FROM activities WHERE id = ?', [id])));
});

router.put('/activities/:id', async (req, res) => {
  const b = req.body || {};
  const existing = await one('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Activity not found' });
  await run(
    `UPDATE activities SET name = ?, city = ?, description = ?, price_adult = ?, price_child = ?,
      pricing_mode = ?, vehicle_rates = ?, covered_by_vehicle_package = ? WHERE id = ?`,
    [
      b.name ?? existing.name,
      b.city ?? existing.city,
      b.description ?? existing.description,
      b.price_adult ?? existing.price_adult,
      b.price_child ?? existing.price_child,
      b.pricing_mode === undefined
        ? (existing.pricing_mode || 'per_person')
        : (b.pricing_mode === 'per_vehicle' ? 'per_vehicle' : 'per_person'),
      b.vehicle_rates === undefined
        ? (existing.vehicle_rates || '{}')
        : JSON.stringify(b.vehicle_rates || {}),
      b.covered_by_vehicle_package === undefined
        ? (existing.covered_by_vehicle_package ?? 1)
        : (b.covered_by_vehicle_package ? 1 : 0),
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
    tax_percent: b.tax_percent ?? existing?.tax_percent ?? 5,
    // Missing on both body and row only before the column existed, and that
    // row was charging GST -- so a missing value means on.
    tax_enabled: (b.tax_enabled ?? existing?.tax_enabled ?? 1) ? 1 : 0,
    exchange_rate: b.exchange_rate ?? existing?.exchange_rate ?? null,
    popup_poster_url: b.popup_poster_url ?? existing?.popup_poster_url ?? null,
    popup_poster_active: (b.popup_poster_active ?? existing?.popup_poster_active) ? 1 : 0,
  };

  await run(
    `INSERT INTO settings (id, markup_percent, b2c_markup_percent, b2b_markup_percent, b2b_admin_margin_percent, tax_percent, tax_enabled, exchange_rate, popup_poster_url, popup_poster_active)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       markup_percent = excluded.markup_percent,
       b2c_markup_percent = excluded.b2c_markup_percent,
       b2b_markup_percent = excluded.b2b_markup_percent,
       b2b_admin_margin_percent = excluded.b2b_admin_margin_percent,
       tax_percent = excluded.tax_percent,
       tax_enabled = excluded.tax_enabled,
       exchange_rate = excluded.exchange_rate,
       popup_poster_url = excluded.popup_poster_url,
       popup_poster_active = excluded.popup_poster_active`,
    [
      values.markup_percent,
      values.b2c_markup_percent,
      values.b2b_markup_percent,
      values.b2b_admin_margin_percent,
      values.tax_percent,
      values.tax_enabled,
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

// ---------------------------------------------------------------------------
// PATCH /admin/users/:id/approval -- approve or reject an agent account.
//
// This is the only route that may write approval_status: an agent editing his
// own profile (PATCH /auth/me) deliberately cannot, or the pending queue would
// be self-service. The whole admin router already sits behind
// requireAuth + requireRole('admin').
// ---------------------------------------------------------------------------
router.patch('/users/:id/approval', async (req, res) => {
  const { status, note } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved', 'rejected' or 'pending'" });
  }
  const existing = await one('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (existing.role !== 'b2b') {
    return res.status(400).json({ error: 'Only agent accounts go through approval' });
  }

  await run('UPDATE users SET approval_status = ?, approval_note = ? WHERE id = ?', [
    status,
    note ? String(note).slice(0, 500) : null,
    req.params.id,
  ]);
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
