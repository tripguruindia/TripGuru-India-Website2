const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
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
} = require('../serializers');

const router = express.Router();

// Every route in this file is admin-only.
router.use(requireAuth, requireRole('admin'));

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Aggregate load -- shape matches what the old client-side initializeDB()
// produced, so the frontend's `db` object needs no restructuring.
// ---------------------------------------------------------------------------
router.get('/db', async (req, res) => {
  const [cities, hotels, vehicles, routes, activities, packages, settings, bookings, leads, users] =
    await Promise.all([
      prisma.city.findMany({ orderBy: { name: 'asc' } }),
      prisma.hotel.findMany(),
      prisma.vehicle.findMany(),
      prisma.route.findMany(),
      prisma.activity.findMany(),
      prisma.package.findMany(),
      prisma.settings.findUnique({ where: { id: 1 } }),
      prisma.booking.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany(),
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
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } });
  res.json(cities.map((c) => c.name));
});

router.put('/cities', async (req, res) => {
  const names = Array.isArray(req.body?.cities) ? req.body.cities : req.body;
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: 'Body must be an array of city names' });
  }
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];

  const existing = await prisma.city.findMany();
  const existingNames = existing.map((c) => c.name);
  const toAdd = clean.filter((n) => !existingNames.includes(n));
  const toRemove = existingNames.filter((n) => !clean.includes(n));

  await prisma.$transaction([
    ...toRemove.map((name) => prisma.city.deleteMany({ where: { name } })),
    ...toAdd.map((name) => prisma.city.create({ data: { name } })),
  ]);

  const updated = await prisma.city.findMany({ orderBy: { name: 'asc' } });
  res.json(updated.map((c) => c.name));
});

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------
router.get('/hotels', async (req, res) => {
  const hotels = await prisma.hotel.findMany();
  res.json(hotels.map(serializeHotel));
});

router.post('/hotels', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.rates) return res.status(400).json({ error: 'name and rates are required' });
  const hotel = await prisma.hotel.create({
    data: {
      id: b.id || genId('h'),
      name: b.name,
      city: b.city || '',
      category: b.category || '3-Star',
      description: b.description || '',
      rates: b.rates,
    },
  });
  res.status(201).json(serializeHotel(hotel));
});

router.put('/hotels/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const hotel = await prisma.hotel.update({
      where: { id: req.params.id },
      data: {
        name: b.name,
        city: b.city,
        category: b.category,
        description: b.description,
        rates: b.rates,
      },
    });
    res.json(serializeHotel(hotel));
  } catch (err) {
    res.status(404).json({ error: 'Hotel not found' });
  }
});

router.delete('/hotels/:id', async (req, res) => {
  try {
    await prisma.hotel.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Hotel not found' });
  }
});

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
router.get('/vehicles', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany();
  res.json(vehicles.map(serializeVehicle));
});

router.post('/vehicles', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const vehicle = await prisma.vehicle.create({
    data: {
      id: b.id || genId('v'),
      name: b.name,
      description: b.description || '',
      capacity: b.capacity ?? null,
      dailySightseeingRate: b.daily_sightseeing_rate ?? null,
      routeRates: b.route_rates || {},
    },
  });
  res.status(201).json(serializeVehicle(vehicle));
});

router.put('/vehicles/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        name: b.name,
        description: b.description,
        capacity: b.capacity,
        dailySightseeingRate: b.daily_sightseeing_rate,
        routeRates: b.route_rates,
      },
    });
    res.json(serializeVehicle(vehicle));
  } catch (err) {
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

router.delete('/vehicles/:id', async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Vehicle not found' });
  }
});

// ---------------------------------------------------------------------------
// Routes (transfer routes, e.g. "ktm_to_pokhara")
// ---------------------------------------------------------------------------
router.get('/routes', async (req, res) => {
  const routes = await prisma.route.findMany();
  res.json(routes.map(serializeRoute));
});

router.post('/routes', async (req, res) => {
  const b = req.body || {};
  if (!b.key || !b.name) return res.status(400).json({ error: 'key and name are required' });
  const route = await prisma.route.create({
    data: { key: b.key, name: b.name, description: b.description || '' },
  });
  res.status(201).json(serializeRoute(route));
});

router.put('/routes/:key', async (req, res) => {
  const b = req.body || {};
  try {
    const route = await prisma.route.update({
      where: { key: req.params.key },
      data: { name: b.name, description: b.description },
    });
    res.json(serializeRoute(route));
  } catch (err) {
    res.status(404).json({ error: 'Route not found' });
  }
});

router.delete('/routes/:key', async (req, res) => {
  try {
    await prisma.route.delete({ where: { key: req.params.key } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Route not found' });
  }
});

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------
router.get('/activities', async (req, res) => {
  const activities = await prisma.activity.findMany();
  res.json(activities.map(serializeActivity));
});

router.post('/activities', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const activity = await prisma.activity.create({
    data: {
      id: b.id || genId('a'),
      name: b.name,
      city: b.city || '',
      description: b.description || '',
      priceAdult: b.price_adult ?? 0,
      priceChild: b.price_child ?? 0,
    },
  });
  res.status(201).json(serializeActivity(activity));
});

router.put('/activities/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const activity = await prisma.activity.update({
      where: { id: req.params.id },
      data: {
        name: b.name,
        city: b.city,
        description: b.description,
        priceAdult: b.price_adult,
        priceChild: b.price_child,
      },
    });
    res.json(serializeActivity(activity));
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' });
  }
});

router.delete('/activities/:id', async (req, res) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Activity not found' });
  }
});

// ---------------------------------------------------------------------------
// Packages -- days[] embeds references to hotels/routes/activities by id.
// Postgres can't FK-check inside JSONB, so we validate them here.
// ---------------------------------------------------------------------------
async function validatePackageRefs(body) {
  const [hotels, routes, activities, vehicles] = await Promise.all([
    prisma.hotel.findMany({ select: { id: true } }),
    prisma.route.findMany({ select: { key: true } }),
    prisma.activity.findMany({ select: { id: true } }),
    prisma.vehicle.findMany({ select: { id: true } }),
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
  const packages = await prisma.package.findMany();
  res.json(packages.map(serializePackage));
});

router.post('/packages', async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const errors = await validatePackageRefs(b);
  if (errors.length) return res.status(400).json({ error: 'Invalid references', details: errors });

  const pkg = await prisma.package.create({
    data: {
      id: b.id || genId('pkg'),
      name: b.name,
      description: b.description || '',
      durationNights: b.duration_nights ?? null,
      defaultHotelCategory: b.default_hotel_category || null,
      defaultVehicleId: b.default_vehicle_id || null,
      startingPriceOverride: b.starting_price_override ?? null,
      cities: b.cities || [],
      days: b.days || [],
    },
  });
  res.status(201).json(serializePackage(pkg));
});

router.put('/packages/:id', async (req, res) => {
  const b = req.body || {};
  const errors = await validatePackageRefs(b);
  if (errors.length) return res.status(400).json({ error: 'Invalid references', details: errors });

  try {
    const pkg = await prisma.package.update({
      where: { id: req.params.id },
      data: {
        name: b.name,
        description: b.description,
        durationNights: b.duration_nights,
        defaultHotelCategory: b.default_hotel_category,
        defaultVehicleId: b.default_vehicle_id,
        startingPriceOverride: b.starting_price_override,
        cities: b.cities,
        days: b.days,
      },
    });
    res.json(serializePackage(pkg));
  } catch (err) {
    res.status(404).json({ error: 'Package not found' });
  }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    await prisma.package.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Package not found' });
  }
});

// ---------------------------------------------------------------------------
// Settings -- singleton row.
// ---------------------------------------------------------------------------
router.get('/settings', async (req, res) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  res.json(serializeSettings(settings) || {});
});

router.put('/settings', async (req, res) => {
  const b = req.body || {};
  const data = {
    markupPercent: b.markup_percent,
    b2cMarkupPercent: b.b2c_markup_percent,
    b2bMarkupPercent: b.b2b_markup_percent,
    b2bAdminMarginPercent: b.b2b_admin_margin_percent,
    taxPercent: b.tax_percent,
    exchangeRate: b.exchange_rate,
    popupPosterUrl: b.popup_poster_url,
    popupPosterActive: b.popup_poster_active,
  };
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  res.json(serializeSettings(settings));
});

// ---------------------------------------------------------------------------
// Users -- admin can manage any role here (unlike public /auth/signup,
// which is restricted to b2c/b2b). Passwords are never returned; use
// POST /users/:id/reset-password instead of the old plaintext display.
// ---------------------------------------------------------------------------
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users.map(serializeUser));
});

router.post('/users', async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.password || !b.role) {
    return res.status(400).json({ error: 'email, password, and role are required' });
  }
  const normalizedEmail = String(b.email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

  const passwordHash = await bcrypt.hash(b.password, 10);
  const user = await prisma.user.create({
    data: {
      id: b.id || genId('usr'),
      email: normalizedEmail,
      passwordHash,
      role: b.role,
      fullName: b.fullName || '',
      phone: b.phone || '',
      countryCode: b.countryCode || '',
      agencyName: b.agencyName || null,
      agencyAddress: b.agencyAddress || null,
      agencyPhone: b.agencyPhone || null,
      agencyEmail: b.agencyEmail || null,
      agencyWebsite: b.agencyWebsite || null,
      walletBalance: b.walletBalance ?? 0,
      address: b.address || null,
    },
  });
  res.status(201).json(serializeUser(user));
});

router.put('/users/:id', async (req, res) => {
  const b = req.body || {};
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        fullName: b.fullName,
        phone: b.phone,
        countryCode: b.countryCode,
        agencyName: b.agencyName,
        agencyAddress: b.agencyAddress,
        agencyPhone: b.agencyPhone,
        agencyEmail: b.agencyEmail,
        agencyWebsite: b.agencyWebsite,
        walletBalance: b.walletBalance,
        address: b.address,
      },
    });
    res.json(serializeUser(user));
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters and include a letter and a digit' });
  }
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'User not found' });
  }
});

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
router.get('/leads', async (req, res) => {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(leads.map(serializeLead));
});

router.delete('/leads/:id', async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Lead not found' });
  }
});

router.delete('/leads', async (req, res) => {
  await prisma.lead.deleteMany({});
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Bookings -- read-only in Phase 0. Write path arrives with B2C/B2B wiring.
// ---------------------------------------------------------------------------
router.get('/bookings', async (req, res) => {
  const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(bookings.map(serializeBooking));
});

module.exports = router;
