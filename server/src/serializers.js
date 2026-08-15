// Prisma returns Decimal fields as Decimal.js instances, which
// JSON.stringify turns into strings ("15.00"), not numbers. The Nepal
// portal frontend expects plain JS numbers everywhere (it does math on
// them directly in calculator.js), so every Decimal field is converted
// back to a Number before a response leaves this server.

function num(value) {
  if (value === null || value === undefined) return value;
  return typeof value === 'object' && typeof value.toNumber === 'function'
    ? value.toNumber()
    : Number(value);
}

function serializeHotel(h) {
  return {
    id: h.id,
    name: h.name,
    city: h.city,
    category: h.category,
    description: h.description || '',
    rates: h.rates,
  };
}

function serializeVehicle(v) {
  return {
    id: v.id,
    name: v.name,
    description: v.description || '',
    capacity: v.capacity,
    daily_sightseeing_rate: num(v.dailySightseeingRate),
    route_rates: v.routeRates,
  };
}

function serializeRoute(r) {
  return { key: r.key, name: r.name, description: r.description || '' };
}

function serializeActivity(a) {
  return {
    id: a.id,
    name: a.name,
    city: a.city,
    description: a.description || '',
    price_adult: num(a.priceAdult),
    price_child: num(a.priceChild),
  };
}

function serializePackage(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    duration_nights: p.durationNights,
    default_hotel_category: p.defaultHotelCategory,
    default_vehicle_id: p.defaultVehicleId,
    starting_price_override: num(p.startingPriceOverride),
    cities: p.cities,
    days: p.days,
  };
}

function serializeSettings(s) {
  if (!s) return null;
  return {
    markup_percent: num(s.markupPercent),
    b2c_markup_percent: num(s.b2cMarkupPercent),
    b2b_markup_percent: num(s.b2bMarkupPercent),
    b2b_admin_margin_percent: num(s.b2bAdminMarginPercent),
    tax_percent: num(s.taxPercent),
    exchange_rate: num(s.exchangeRate),
    popup_poster_url: s.popupPosterUrl || '',
    popup_poster_active: s.popupPosterActive,
  };
}

function serializeBooking(b) {
  return {
    id: b.id,
    client_name: b.clientName,
    email: b.email,
    phone: b.phone,
    travel_date: b.travelDate,
    adults: b.adults,
    cwb: b.cwb,
    cnb: b.cnb,
    total_price: num(b.totalPrice),
    package_name: b.packageName,
    status: b.status,
    created_at: b.createdAt,
    itinerary_summary: b.itinerarySummary,
    type: b.type,
    agent_id: b.agentId,
    agent_commission: num(b.agentCommission),
    vehicleId: b.vehicleId,
    hotelCategory: b.hotelCategory,
    startCity: b.startCity,
    endCity: b.endCity,
    notes: b.notes,
    markup_percent: num(b.markupPercent),
    b2b_admin_margin_percent: num(b.b2bAdminMarginPercent),
    passengers: b.passengers,
    itinerary: b.itinerary,
    rooms: b.rooms,
    b2b_white_label: b.b2bWhiteLabel,
  };
}

// Never include passwordHash in a response.
function serializeUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    fullName: u.fullName,
    phone: u.phone,
    countryCode: u.countryCode,
    agencyName: u.agencyName,
    agencyAddress: u.agencyAddress,
    agencyPhone: u.agencyPhone,
    agencyEmail: u.agencyEmail,
    agencyWebsite: u.agencyWebsite,
    walletBalance: num(u.walletBalance),
    address: u.address,
    createdAt: u.createdAt,
  };
}

function serializeLead(l) {
  return {
    id: l.id,
    name: l.name,
    email: l.email,
    country_code: l.countryCode,
    phone: l.phone,
    created_at: l.createdAt,
  };
}

module.exports = {
  num,
  serializeHotel,
  serializeVehicle,
  serializeRoute,
  serializeActivity,
  serializePackage,
  serializeSettings,
  serializeBooking,
  serializeUser,
  serializeLead,
};
