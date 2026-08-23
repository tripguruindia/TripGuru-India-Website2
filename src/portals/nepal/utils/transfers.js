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

// The legacy airport <-> hotel key for a city, e.g. `ktm_airport_transfer`.
// Still generated and still looked up first, because live routes (and their
// prices) already use this form. New routes built in the Route Builder use
// the airport-stop form below instead, which can express a run between one
// city's airport and a DIFFERENT city -- Pokhara Airport to Bandipur, say.
export function airportTransferKey(city) {
  const key = cityKey(city);
  return key ? `${key}_airport_transfer` : '';
}

// ---------------------------------------------------------------------------
// Airports as route stops
// ---------------------------------------------------------------------------
// A route is a sequence of stops, and a stop can be a city OR an airport.
// Airport stops are written `apt:<airportId>` in the builder's dropdowns and
// collapse to an `apt<code>` segment in the key, so "Pokhara Airport to
// Bandipur" becomes `aptpkr_to_bandipur`. This is what stops every new
// destination needing a code change: an airport an hour from the town it
// serves is now just another route somebody prices in Admin.

export const AIRPORT_STOP_PREFIX = 'apt:';

export function isAirportStop(stop) {
  return typeof stop === 'string' && stop.startsWith(AIRPORT_STOP_PREFIX);
}

export function airportStopValue(airport) {
  return airport ? `${AIRPORT_STOP_PREFIX}${airport.id}` : '';
}

export function airportFromStop(airports, stop) {
  if (!isAirportStop(stop)) return null;
  const id = stop.slice(AIRPORT_STOP_PREFIX.length);
  return (airports || []).find((a) => a.id === id) || null;
}

// Key segment for one stop. Airports get an `apt` prefix so they can never
// collide with a city that happens to share the name.
export function stopKeySegment(airports, stop) {
  if (isAirportStop(stop)) {
    const airport = airportFromStop(airports, stop);
    if (!airport) return '';
    const token = (airport.code || airport.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return token ? `apt${token}` : '';
  }
  return cityKey(stop);
}

export function stopLabel(airports, stop) {
  if (isAirportStop(stop)) {
    const airport = airportFromStop(airports, stop);
    if (!airport) return 'Unknown airport';
    return airport.code ? `${airport.name} (${airport.code})` : airport.name;
  }
  return stop;
}

export function buildRouteKey(airports, stops) {
  return (stops || [])
    .map((s) => stopKeySegment(airports, s))
    .filter(Boolean)
    .join('_to_');
}

export function buildRouteName(airports, stops) {
  return (stops || []).map((s) => stopLabel(airports, s)).filter(Boolean).join(' to ');
}

// ---------------------------------------------------------------------------
// Direction
// ---------------------------------------------------------------------------
// A transfer is priced by the distance driven, so A->B and B->A cost the same.
// Entering one direction is enough: the reverse is understood, including for
// multi-stop sectors (`pokhara_to_ktm_to_chitwan` reversed is
// `chitwan_to_ktm_to_pokhara`). Both directions may still be stored separately
// -- older data does -- and an explicitly stored rate always wins over the
// reverse, so anyone who genuinely needs asymmetric pricing can still set it.

export function reverseRouteKey(key) {
  if (!key || !key.includes('_to_')) return key;
  return key.split('_to_').reverse().join('_to_');
}

// The rate a vehicle charges for a route key, falling back to the reverse.
// Returns undefined when neither direction is priced, so callers can tell
// "not priced" apart from "priced at zero".
export function rateForRoute(vehicle, key) {
  if (!vehicle || !key) return undefined;
  const rates = vehicle.route_rates || {};
  if (rates[key] !== undefined) return rates[key];
  const rev = reverseRouteKey(key);
  if (rev !== key && rates[rev] !== undefined) return rates[rev];
  return undefined;
}

// Looks up a route definition, falling back to the reverse direction. When it
// matches in reverse the result carries the ORIGINAL key plus `reversedFrom`,
// so callers price and label it in the direction actually being travelled
// rather than showing "Pokhara to Kathmandu" on a Kathmandu-to-Pokhara day.
export function findRoute(routes, key) {
  if (!key) return null;
  const direct = (routes || []).find((r) => r.key === key);
  if (direct) return direct;
  const rev = reverseRouteKey(key);
  if (rev === key) return null;
  const reversed = (routes || []).find((r) => r.key === rev);
  return reversed ? { ...reversed, key, reversedFrom: rev } : null;
}

// True when either direction of this route already exists -- used to avoid
// creating a second row for a sector that is already priced backwards.
export function routeExistsEitherWay(routes, key) {
  return !!findRoute(routes, key);
}

// Reverse of stopKeySegment: turns an `apt…` key segment back into the
// airport it came from, so a route key can be worded in plain English.
export function airportFromKeySegment(airports, segment) {
  if (!segment || !/^apt[a-z0-9]+$/.test(segment)) return null;
  const token = segment.slice(3);
  return (
    (airports || []).find((a) => {
      const code = (a.code || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const id = (a.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      return (code && code === token) || (!code && id === token);
    }) || null
  );
}

// True when a route key touches an airport, in EITHER spelling: the legacy
// per-city `<city>_airport_transfer`, or the airport-stop form where any
// segment is `apt…`. Used to badge a transfer row and to word the itinerary.
export function isAirportRouteKey(key) {
  if (!key) return false;
  if (key.endsWith('_airport_transfer')) return true;
  return key.split('_to_').some((seg) => /^apt[a-z0-9]+$/.test(seg));
}

// Which existing route represents "get between this city and the airport that
// serves it". Checks the airport-stop form in both directions before falling
// back to the legacy per-city key, so a route the admin built by hand in the
// Route Builder is found ahead of one auto-created at zero.
//
// Returns { key, exists }. When nothing exists yet, `key` is the form that
// should be created so it shows up in Admin > Vehicles & Routes to be priced.
export function resolveAirportTransfer(routes, airports, city) {
  const airport = getAirportForCity(airports, city);
  if (!airport) return { key: '', exists: false };

  const aptSeg = stopKeySegment(airports, airportStopValue(airport));
  const citySeg = cityKey(city);
  const legacy = airportTransferKey(city);

  const candidates = [
    `${aptSeg}_to_${citySeg}`,
    `${citySeg}_to_${aptSeg}`,
    legacy,
  ].filter((k) => k && !k.startsWith('_to_') && !k.endsWith('_to_'));

  const found = candidates.find((k) => (routes || []).some((r) => r.key === k));
  if (found) return { key: found, exists: true };

  // Nothing priced yet. Prefer the airport-stop form -- it is the one the
  // Route Builder produces, so an admin editing it later sees a single entry
  // rather than two spellings of the same run.
  return { key: candidates[0] || legacy, exists: false };
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
//
// Resolved against the route list rather than generated blind, so a city
// whose airport sits in another town (Bandipur flying via Pokhara) picks up
// the hand-built "Pokhara Airport to Bandipur" route instead of inventing a
// `bandipur_airport_transfer` that describes an airport Bandipur hasn't got.
export function flightLegTransfers(routes, airports, fromCity, toCity) {
  return [
    resolveAirportTransfer(routes, airports, fromCity).key,
    resolveAirportTransfer(routes, airports, toCity).key,
  ].filter(Boolean);
}
