// Converts a raw libSQL row (snake_case columns, JSON-in-TEXT for nested
// structures) into the shape the Nepal portal frontend expects (matches
// what the old client-side initializeDB() produced). Centralizing the
// JSON.parse calls here means the route handlers never touch raw TEXT.

function parseJSON(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value; // already an object (e.g. in tests)
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback;
  }
}

function serializeHotel(h) {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    category: h.category,
    description: h.description || '',
    rates: parseJSON(h.rates, {}),
  };
}

function serializeVehicle(v) {
  return {
    id: v.id,
    name: v.name,
    description: v.description || '',
    capacity: v.capacity,
    daily_sightseeing_rate: v.daily_sightseeing_rate,
    route_rates: parseJSON(v.route_rates, {}),
    // Null on a row written before the column existed. Every vehicle that
    // already existed is a Nepali one, which is also the column default.
    origin: v.origin === 'india' ? 'india' : 'nepal',
  };
}

function serializeRoute(r) {
  return { key: r.key, name: r.name, description: r.description || '' };
}

function serializeAirport(a) {
  return {
    id: a.id,
    name: a.name,
    code: a.code || '',
    cities: parseJSON(a.cities, []),
  };
}

function serializeActivity(a) {
  return {
    id: a.id,
    name: a.name,
    city: a.city,
    description: a.description || '',
    price_adult: a.price_adult,
    price_child: a.price_child,
    // 'per_vehicle' activities (full-day sightseeing) bill vehicle_rates once
    // instead of price_adult/price_child per head -- see schema.sql.
    pricing_mode: a.pricing_mode || 'per_person',
    vehicle_rates: parseJSON(a.vehicle_rates, {}),
    // Null on a row written before the column existed. Those are all ordinary
    // local sightseeing, which a package does cover -- so a missing value
    // reads as covered, matching the column default.
    covered_by_vehicle_package:
      a.covered_by_vehicle_package === null || a.covered_by_vehicle_package === undefined
        ? true
        : !!a.covered_by_vehicle_package,
  };
}

// A whole-trip vehicle rate. `cities` is the set of overnight cities; the
// client matches on it without caring about order.
function serializeVehiclePackage(v) {
  return {
    id: v.id,
    vehicle_id: v.vehicle_id,
    start_city: v.start_city,
    end_city: v.end_city,
    cities: parseJSON(v.cities, []),
    days: Number(v.days) || 0,
    rate: Number(v.rate) || 0,
  };
}

// Per-city builder defaults. Shapes are normalised here so the client never
// has to guess whether a field is missing, null, or a JSON string.
function serializeCityDefault(c) {
  return {
    city: c.city,
    default_hotels: parseJSON(c.default_hotels, {}),
    // Null/'' means "no default set" -- the builder then falls back to the
    // rule it used before this table existed. It is NOT the same as 'CP'.
    default_meals: c.default_meals || '',
    night_plans: parseJSON(c.night_plans, {}),
  };
}

function serializePackage(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    duration_nights: p.duration_nights,
    default_hotel_category: p.default_hotel_category,
    default_vehicle_id: p.default_vehicle_id,
    starting_price_override: p.starting_price_override,
    cities: parseJSON(p.cities, []),
    days: parseJSON(p.days, []),
  };
}

function serializeSettings(s) {
  if (!s) return null;
  return {
    markup_percent: s.markup_percent,
    b2c_markup_percent: s.b2c_markup_percent,
    b2b_markup_percent: s.b2b_markup_percent,
    b2b_admin_margin_percent: s.b2b_admin_margin_percent,
    tax_percent: s.tax_percent,
    // Null only on a row written before the column existed; that row was
    // charging GST, so treat a missing value as on.
    tax_enabled: s.tax_enabled === null || s.tax_enabled === undefined ? true : !!s.tax_enabled,
    exchange_rate: s.exchange_rate,
    popup_poster_url: s.popup_poster_url || '',
    popup_poster_active: !!s.popup_poster_active,
  };
}

function serializeBooking(b) {
  return {
    id: b.id,
    client_name: b.client_name,
    email: b.email,
    phone: b.phone,
    travel_date: b.travel_date,
    adults: b.adults,
    cwb: b.cwb,
    cnb: b.cnb,
    total_price: b.total_price,
    package_name: b.package_name,
    status: b.status,
    created_at: b.created_at,
    itinerary_summary: b.itinerary_summary,
    type: b.type,
    agent_id: b.agent_id,
    agent_commission: b.agent_commission,
    vehicleId: b.vehicle_id,
    hotelCategory: b.hotel_category,
    startCity: b.start_city,
    endCity: b.end_city,
    notes: b.notes,
    markup_percent: b.markup_percent,
    b2b_admin_margin_percent: b.b2b_admin_margin_percent,
    passengers: parseJSON(b.passengers, []),
    itinerary: parseJSON(b.itinerary, []),
    rooms: parseJSON(b.rooms, []),
    b2b_white_label: parseJSON(b.b2b_white_label, null),
    user_id: b.user_id,
  };
}

// Never include password_hash in a response.
function serializeUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.full_name,
    phone: u.phone,
    countryCode: u.country_code,
    agencyName: u.agency_name,
    agencyAddress: u.agency_address,
    agencyPhone: u.agency_phone,
    agencyEmail: u.agency_email,
    agencyWebsite: u.agency_website,
    agencyLogo: u.agency_logo || '',
    // Defaulted here as well as in the DB so a row read back before the
    // migration has run still reports a usable status rather than undefined.
    approvalStatus: u.approval_status || 'approved',
    approvalNote: u.approval_note || '',
    gstNumber: u.gst_number || '',
    walletBalance: u.wallet_balance,
    address: u.address,
    createdAt: u.created_at,
  };
}

function serializeLead(l) {
  return {
    id: l.id,
    name: l.name,
    email: l.email,
    country_code: l.country_code,
    phone: l.phone,
    created_at: l.created_at,
  };
}

function serializeQuote(q) {
  return {
    id: q.id,
    agent_id: q.agent_id || null,
    user_id: q.user_id || null,
    client_name: q.client_name || '',
    client_email: q.client_email || '',
    client_phone: q.client_phone || '',
    country_code: q.country_code || '',
    package_name: q.package_name || '',
    travel_date: q.travel_date || '',
    total_price: q.total_price,
    status: q.status || 'Draft',
    valid_until: q.valid_until || null,
    adults: q.adults,
    cwb: q.cwb,
    cnb: q.cnb,
    vehicle_id: q.vehicle_id || '',
    hotel_category: q.hotel_category || '',
    start_city: q.start_city || '',
    end_city: q.end_city || '',
    markup_percent: q.markup_percent,
    b2b_admin_margin_percent: q.b2b_admin_margin_percent,
    offer_discount_per_pax: q.offer_discount_per_pax || 0,
    itinerary: parseJSON(q.itinerary, []),
    rooms: parseJSON(q.rooms, []),
    passengers: parseJSON(q.passengers, []),
    notes: q.notes || '',
    converted_booking_id: q.converted_booking_id || null,
    last_sent_at: q.last_sent_at || null,
    created_at: q.created_at,
    updated_at: q.updated_at,
  };
}

function serializeWalletTransaction(t) {
  return {
    id: t.id,
    agentId: t.agent_id,
    type: t.type,
    amount: t.amount,
    reason: t.reason,
    createdBy: t.created_by || null,
    createdAt: t.created_at,
  };
}

module.exports = {
  parseJSON,
  serializeHotel,
  serializeVehicle,
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
  serializeQuote,
  serializeWalletTransaction,
};
