// ---------------------------------------------------------------------------
// Indian vehicles and Nepali vehicles are different fleets, hired differently
// and priced differently.
//
// An **Indian** vehicle is taken from a border town (Gorakhpur, Raxaul), runs
// the whole tour, and comes back to a border town. It is hired for the trip,
// so it has NO sector rates at all -- its only price is a row in Vehicle
// Packages. That is the rule this module enforces: without it, an Indian
// vehicle with no matching package would quietly total zero, because a missing
// sector rate contributes nothing.
//
// A **Nepali** vehicle is picked up inside Nepal and can be priced either way:
// leg by leg from its sector rates, or from a package when one matches.
//
// Which fleet a trip needs follows from where it starts and ends:
//
//   India  -> India    an Indian vehicle does the whole run
//   Nepal  -> Nepal    the vehicle never leaves Nepal
//   mixed              either can be right (an Indian vehicle dropping at
//                      Kathmandu, or a border drop and a Nepali vehicle
//                      onward), so neither fleet is hidden
// ---------------------------------------------------------------------------

const norm = (s) => String(s || '').trim().toLowerCase();

// Unmarked means Nepal. Every city that existed before this was recorded is a
// Nepali one apart from a handful of border towns, which are marked by hand.
export function countryOfCity(cityCountries, city) {
  const key = norm(city);
  if (!key || !cityCountries) return 'nepal';
  const found = Object.keys(cityCountries).find((k) => norm(k) === key);
  return found && cityCountries[found] === 'india' ? 'india' : 'nepal';
}

export function isIndianVehicle(vehicle) {
  return !!vehicle && vehicle.origin === 'india';
}

// Which fleet this trip needs, or null when either will do.
export function fleetForTrip(cityCountries, startCity, endCity) {
  const start = countryOfCity(cityCountries, startCity);
  const end = countryOfCity(cityCountries, endCity);
  if (start === 'india' && end === 'india') return 'india';
  if (start === 'nepal' && end === 'nepal') return 'nepal';
  return null; // crossing the border one way -- both fleets are plausible
}

// The vehicles an operator may choose for this trip.
//
// Filtering rather than merely warning is deliberate: picking an Indian
// vehicle for a run that never leaves Nepal is not a pricing question, it is
// a vehicle that would never turn up.
export function vehiclesForTrip(vehicles, cityCountries, startCity, endCity) {
  const list = Array.isArray(vehicles) ? vehicles : [];
  // Before both ends are chosen there is nothing to filter on, so offer
  // everything rather than an empty dropdown the operator cannot explain.
  if (!String(startCity || '').trim() || !String(endCity || '').trim()) return list;

  const fleet = fleetForTrip(cityCountries, startCity, endCity);
  if (!fleet) return list;
  return list.filter((v) => (isIndianVehicle(v) ? 'india' : 'nepal') === fleet);
}
