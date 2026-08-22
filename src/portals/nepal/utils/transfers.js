// Shared rules for transfers, airports, and how a traveller moves between
// two cities. Imported by BOTH the pricing engine (calculator.js) and the
// quote builder UI (App.jsx) so the price charged and the itinerary shown can
// never disagree about which transfers a day contains.
//
// Background: a day used to hold exactly one transfer (`day.transfer_route`,
// a string). Flying between cities needs two on the same day -- a drop at the
// origin airport and a pickup at the destination -- so days now carry a
// `transfers` ARRAY. `transfer_route` is still written as transfers[0] for
// backward compatibility: quotes, bookings and packages saved before this
// change store only the string, and older PDF/WhatsApp exports read it.

// Route keys are built from a short city key. Kathmandu is 'ktm' for
// historical reasons -- the original fixtures used ktm_to_pokhara etc. and
// live bookings reference those keys, so it must stay.
export function cityKey(city) {
  if (!city) return '';
  const name = String(city).toLowerCase().trim();
  return name === 'kathmandu' ? 'ktm' : name.replace(/[^a-z0-9]+/g, '');
}

// The airport <-> hotel run for a city. Keyed per CITY rather than per
// airport on purpose: one airport can serve several cities at very different
// distances (Bhairahawa is ~22km from Lumbini but ~18km from Butwal), so each
// city carries its own rate.
export function airportTransferKey(city) {
  const key = cityKey(city);
  return key ? `${key}_airport_transfer` : '';
}

export function cityToCityRouteKey(fromCity, toCity) {
  return `${cityKey(fromCity)}_to_${cityKey(toCity)}`;
}

export function getAirportForCity(airports, city) {
  if (!city || !Array.isArray(airports)) return null;
  const target = String(city).toLowerCase().trim();
  return (
    airports.find((a) =>
      (a.cities || []).some((c) => String(c).toLowerCase().trim() === target)
    ) || null
  );
}

export function cityHasAirport(airports, city) {
  return !!getAirportForCity(airports, city);
}

// A flight leg is only offered when both cities have air access AND those
// airports are actually different. Lumbini -> Butwal both fly out of
// Bhairahawa, so "flying" between them is meaningless and stays road-only.
export function canFlyBetween(airports, fromCity, toCity) {
  const from = getAirportForCity(airports, fromCity);
  const to = getAirportForCity(airports, toCity);
  if (!from || !to) return false;
  return from.id !== to.id;
}

// Normalizes any day shape -- new (`transfers` array), legacy
// (`transfer_route` string), or empty -- into a plain array of route keys.
// Every read of a day's transfers should go through this.
export function getDayTransfers(day) {
  if (!day) return [];
  if (Array.isArray(day.transfers)) return day.transfers.filter(Boolean);
  if (day.transfer_route) return [day.transfer_route];
  return [];
}

// Writes a transfers array back onto a day, keeping the legacy
// `transfer_route` string in step so anything still reading it (saved quotes,
// bookings, exports) keeps working.
export function withDayTransfers(day, transfers) {
  const clean = (transfers || []).filter(Boolean);
  return { ...day, transfers: clean, transfer_route: clean[0] || '' };
}

export const TRAVEL_MODE_CAR = 'car';
export const TRAVEL_MODE_FLIGHT = 'flight';

// The two airport runs a flight leg implies: drop at the origin city's
// airport, pickup at the destination city's. Either can be removed by the
// agent afterwards (a client may arrange their own airport drop), which is
// why these are returned as separate, individually-removable entries.
export function flightLegTransfers(fromCity, toCity) {
  return [airportTransferKey(fromCity), airportTransferKey(toCity)].filter(Boolean);
}
