// One-off seed script: populates a fresh database with the same demo
// fixtures the old localStorage-based app shipped with. Safe to re-run --
// it upserts, so it won't duplicate rows.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./db');
const {
  INITIAL_CITIES,
  INITIAL_HOTELS,
  INITIAL_VEHICLES,
  INITIAL_ACTIVITIES,
  INITIAL_PACKAGES,
  INITIAL_SETTINGS,
  INITIAL_BOOKINGS,
  INITIAL_ROUTES,
  INITIAL_USERS,
} = require('../prisma/seed-data');

async function main() {
  console.log('Seeding cities...');
  for (const name of INITIAL_CITIES) {
    await prisma.city.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log('Seeding routes...');
  for (const r of INITIAL_ROUTES) {
    await prisma.route.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }

  console.log('Seeding hotels...');
  for (const h of INITIAL_HOTELS) {
    await prisma.hotel.upsert({
      where: { id: h.id },
      update: h,
      create: h,
    });
  }

  console.log('Seeding vehicles...');
  for (const v of INITIAL_VEHICLES) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: {
        name: v.name,
        description: v.description,
        capacity: v.capacity,
        dailySightseeingRate: v.daily_sightseeing_rate,
        routeRates: v.route_rates,
      },
      create: {
        id: v.id,
        name: v.name,
        description: v.description,
        capacity: v.capacity,
        dailySightseeingRate: v.daily_sightseeing_rate,
        routeRates: v.route_rates,
      },
    });
  }

  console.log('Seeding activities...');
  for (const a of INITIAL_ACTIVITIES) {
    await prisma.activity.upsert({
      where: { id: a.id },
      update: {
        name: a.name,
        city: a.city,
        description: a.description,
        priceAdult: a.price_adult,
        priceChild: a.price_child,
      },
      create: {
        id: a.id,
        name: a.name,
        city: a.city,
        description: a.description,
        priceAdult: a.price_adult,
        priceChild: a.price_child,
      },
    });
  }

  console.log('Seeding packages...');
  for (const p of INITIAL_PACKAGES) {
    await prisma.package.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        durationNights: p.duration_nights,
        defaultHotelCategory: p.default_hotel_category,
        defaultVehicleId: p.default_vehicle_id,
        startingPriceOverride: p.starting_price_override,
        cities: p.cities,
        days: p.days,
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        durationNights: p.duration_nights,
        defaultHotelCategory: p.default_hotel_category,
        defaultVehicleId: p.default_vehicle_id,
        startingPriceOverride: p.starting_price_override,
        cities: p.cities,
        days: p.days,
      },
    });
  }

  console.log('Seeding settings...');
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      markupPercent: INITIAL_SETTINGS.markup_percent,
      b2cMarkupPercent: INITIAL_SETTINGS.b2c_markup_percent,
      b2bMarkupPercent: INITIAL_SETTINGS.b2b_markup_percent,
      b2bAdminMarginPercent: INITIAL_SETTINGS.b2b_admin_margin_percent,
      taxPercent: INITIAL_SETTINGS.tax_percent,
      exchangeRate: INITIAL_SETTINGS.exchange_rate,
      popupPosterUrl: INITIAL_SETTINGS.popup_poster_url,
      popupPosterActive: INITIAL_SETTINGS.popup_poster_active,
    },
    create: {
      id: 1,
      markupPercent: INITIAL_SETTINGS.markup_percent,
      b2cMarkupPercent: INITIAL_SETTINGS.b2c_markup_percent,
      b2bMarkupPercent: INITIAL_SETTINGS.b2b_markup_percent,
      b2bAdminMarginPercent: INITIAL_SETTINGS.b2b_admin_margin_percent,
      taxPercent: INITIAL_SETTINGS.tax_percent,
      exchangeRate: INITIAL_SETTINGS.exchange_rate,
      popupPosterUrl: INITIAL_SETTINGS.popup_poster_url,
      popupPosterActive: INITIAL_SETTINGS.popup_poster_active,
    },
  });

  console.log('Seeding demo bookings...');
  for (const b of INITIAL_BOOKINGS) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        clientName: b.client_name,
        email: b.email,
        phone: b.phone,
        travelDate: b.travel_date,
        adults: b.adults,
        cwb: b.cwb,
        cnb: b.cnb,
        totalPrice: b.total_price,
        packageName: b.package_name,
        status: b.status,
        createdAt: new Date(b.created_at),
        itinerarySummary: b.itinerary_summary,
        type: b.type,
        agentId: b.agent_id || null,
        agentCommission: b.agent_commission ?? null,
        passengers: b.passengers,
      },
    });
  }

  console.log('Seeding demo users (passwords hashed)...');
  for (const u of INITIAL_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        passwordHash,
        role: u.role,
        fullName: u.fullName || '',
        phone: u.phone || '',
        countryCode: u.countryCode || '',
        agencyName: u.agencyName || null,
        agencyAddress: u.agencyAddress || null,
        agencyPhone: u.agencyPhone || null,
        agencyEmail: u.agencyEmail || null,
        agencyWebsite: u.agencyWebsite || null,
        walletBalance: u.walletBalance ?? 0,
        address: u.address || null,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
