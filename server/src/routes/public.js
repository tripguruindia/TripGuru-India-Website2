const express = require('express');
const client = require('../db');
const {
  serializeHotel,
  serializeVehicle,
  serializeRoute,
  serializeAirport,
  serializeActivity,
  serializeCityDefault,
  serializePackage,
  serializeSettings,
} = require('../serializers');

const router = express.Router();

async function all(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rs.rows;
}

async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// Public master data -- no auth required. This is what lets B2C/B2B read
// the same cities/hotels/vehicles/routes/activities/packages/pricing that
// Admin manages, instead of a static fixtures file bundled into the
// frontend. Deliberately excludes bookings/leads/users -- those stay
// admin-only (full list) or owner-scoped (see routes/bookings.js).
// ---------------------------------------------------------------------------
router.get('/db', async (req, res) => {
  const [cities, airports, hotels, vehicles, routes, activities, packages, settings, cityDefaults] = await Promise.all([
    all('SELECT name FROM cities ORDER BY name ASC'),
    all('SELECT * FROM airports'),
    all('SELECT * FROM hotels'),
    all('SELECT * FROM vehicles'),
    all('SELECT * FROM routes'),
    all('SELECT * FROM activities'),
    all('SELECT * FROM packages'),
    one('SELECT * FROM settings WHERE id = 1'),
    // The builder applies these when it makes a day, so the traveller portal
    // needs them too -- they are pricing inputs, not admin-only data.
    all('SELECT * FROM city_defaults'),
  ]);

  res.json({
    cities: cities.map((c) => c.name),
    airports: airports.map(serializeAirport),
    hotels: hotels.map(serializeHotel),
    vehicles: vehicles.map(serializeVehicle),
    routes: routes.map(serializeRoute),
    activities: activities.map(serializeActivity),
    packages: packages.map(serializePackage),
    settings: serializeSettings(settings) || {},
    city_defaults: cityDefaults.map(serializeCityDefault),
  });
});

module.exports = router;
