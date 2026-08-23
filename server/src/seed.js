// One-off seed script: populates a fresh database with the same demo
// fixtures the old localStorage-based app shipped with. Safe to re-run --
// it upserts (INSERT ... ON CONFLICT), so it won't duplicate rows.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const client = require('./db');
const {
  INITIAL_CITIES,
  INITIAL_AIRPORTS,
  INITIAL_HOTELS,
  INITIAL_VEHICLES,
  INITIAL_ACTIVITIES,
  INITIAL_PACKAGES,
  INITIAL_SETTINGS,
  INITIAL_BOOKINGS,
  INITIAL_ROUTES,
  INITIAL_USERS,
} = require('../db/seed-data');

async function run(sql, args = []) {
  return client.execute({ sql, args });
}

async function main() {
  console.log('Seeding cities...');
  for (const name of INITIAL_CITIES) {
    await run('INSERT INTO cities (name) VALUES (?) ON CONFLICT(name) DO NOTHING', [name]);
  }

  console.log('Seeding airports...');
  for (const a of INITIAL_AIRPORTS) {
    await run(
      `INSERT INTO airports (id, name, code, cities) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code, cities=excluded.cities`,
      [a.id, a.name, a.code, JSON.stringify(a.cities)]
    );
  }

  console.log('Seeding routes...');
  for (const r of INITIAL_ROUTES) {
    await run(
      `INSERT INTO routes (key, name, description) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description`,
      [r.key, r.name, r.description]
    );
  }

  console.log('Seeding hotels...');
  for (const h of INITIAL_HOTELS) {
    await run(
      `INSERT INTO hotels (id, name, city, category, description, rates) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city, category=excluded.category,
         description=excluded.description, rates=excluded.rates`,
      [h.id, h.name, h.city, h.category, h.description, JSON.stringify(h.rates)]
    );
  }

  console.log('Seeding vehicles...');
  for (const v of INITIAL_VEHICLES) {
    await run(
      `INSERT INTO vehicles (id, name, description, capacity, daily_sightseeing_rate, route_rates) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, capacity=excluded.capacity,
         daily_sightseeing_rate=excluded.daily_sightseeing_rate, route_rates=excluded.route_rates`,
      [v.id, v.name, v.description, v.capacity, v.daily_sightseeing_rate, JSON.stringify(v.route_rates)]
    );
  }

  console.log('Seeding activities...');
  for (const a of INITIAL_ACTIVITIES) {
    await run(
      `INSERT INTO activities (id, name, city, description, price_adult, price_child, pricing_mode, vehicle_rates)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city, description=excluded.description,
         price_adult=excluded.price_adult, price_child=excluded.price_child,
         pricing_mode=excluded.pricing_mode, vehicle_rates=excluded.vehicle_rates`,
      [
        a.id, a.name, a.city, a.description, a.price_adult, a.price_child,
        a.pricing_mode || 'per_person',
        JSON.stringify(a.vehicle_rates || {}),
      ]
    );
  }

  console.log('Seeding packages...');
  for (const p of INITIAL_PACKAGES) {
    await run(
      `INSERT INTO packages (id, name, description, duration_nights, default_hotel_category, default_vehicle_id, starting_price_override, cities, days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, duration_nights=excluded.duration_nights,
         default_hotel_category=excluded.default_hotel_category, default_vehicle_id=excluded.default_vehicle_id,
         starting_price_override=excluded.starting_price_override, cities=excluded.cities, days=excluded.days`,
      [
        p.id,
        p.name,
        p.description,
        p.duration_nights,
        p.default_hotel_category,
        p.default_vehicle_id,
        p.starting_price_override,
        JSON.stringify(p.cities),
        JSON.stringify(p.days),
      ]
    );
  }

  console.log('Seeding settings...');
  await run(
    `INSERT INTO settings (id, markup_percent, b2c_markup_percent, b2b_markup_percent, b2b_admin_margin_percent, tax_percent, tax_enabled, exchange_rate, popup_poster_url, popup_poster_active)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET markup_percent=excluded.markup_percent, b2c_markup_percent=excluded.b2c_markup_percent,
       b2b_markup_percent=excluded.b2b_markup_percent, b2b_admin_margin_percent=excluded.b2b_admin_margin_percent,
       tax_percent=excluded.tax_percent, tax_enabled=excluded.tax_enabled, exchange_rate=excluded.exchange_rate,
       popup_poster_url=excluded.popup_poster_url, popup_poster_active=excluded.popup_poster_active`,
    [
      INITIAL_SETTINGS.markup_percent,
      INITIAL_SETTINGS.b2c_markup_percent,
      INITIAL_SETTINGS.b2b_markup_percent,
      INITIAL_SETTINGS.b2b_admin_margin_percent,
      INITIAL_SETTINGS.tax_percent,
      INITIAL_SETTINGS.tax_enabled === false ? 0 : 1,
      INITIAL_SETTINGS.exchange_rate,
      INITIAL_SETTINGS.popup_poster_url,
      INITIAL_SETTINGS.popup_poster_active ? 1 : 0,
    ]
  );

  console.log('Seeding demo bookings...');
  for (const b of INITIAL_BOOKINGS) {
    await run(
      `INSERT INTO bookings (id, client_name, email, phone, travel_date, adults, cwb, cnb, total_price, package_name, status, created_at, itinerary_summary, type, agent_id, agent_commission, passengers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [
        b.id,
        b.client_name,
        b.email,
        b.phone,
        b.travel_date,
        b.adults,
        b.cwb,
        b.cnb,
        b.total_price,
        b.package_name,
        b.status,
        b.created_at,
        b.itinerary_summary,
        b.type,
        b.agent_id || null,
        b.agent_commission ?? null,
        JSON.stringify(b.passengers || []),
      ]
    );
  }

  console.log('Seeding demo users (passwords hashed)...');
  for (const u of INITIAL_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await run(
      `INSERT INTO users (id, email, password_hash, role, full_name, phone, country_code, agency_name, agency_address, agency_phone, agency_email, agency_website, wallet_balance, address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [
        u.id,
        u.email,
        passwordHash,
        u.role,
        u.fullName || '',
        u.phone || '',
        u.countryCode || '',
        u.agencyName || null,
        u.agencyAddress || null,
        u.agencyPhone || null,
        u.agencyEmail || null,
        u.agencyWebsite || null,
        u.walletBalance ?? 0,
        u.address || null,
        new Date().toISOString(),
      ]
    );
  }

  console.log('Seeding demo wallet transactions...');
  for (const u of INITIAL_USERS) {
    if (u.role !== 'b2b' || !u.walletBalance) continue;
    await run(
      `INSERT INTO wallet_transactions (id, agent_id, type, amount, reason, created_by, created_at)
       VALUES (?, ?, 'credit', ?, ?, NULL, ?)
       ON CONFLICT(id) DO NOTHING`,
      [`wtx-seed-${u.id}`, u.id, u.walletBalance, 'Opening balance (demo seed data)', new Date().toISOString()]
    );
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.close());
