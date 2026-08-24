// ---------------------------------------------------------------------------
// A whole-trip rate for the vehicle, instead of adding up sector by sector.
//
// How Nepal actually works: a party leaves an Indian border town (Gorakhpur,
// Raxaul) in an Indian vehicle, tours Nepal, and the same vehicle brings them
// back to a border town. The vehicle is hired for the trip, not for each leg,
// and the empty return run is part of what is being paid for. So the price is
// quoted as one figure -- "Hiace, Gorakhpur to Gorakhpur, Kathmandu + Pokhara,
// 6 days" -- and not as a sum of sectors. The same is true of a Nepali vehicle
// picked up inside Nepal.
//
// Matching is deliberately EXACT. A package rate is a negotiated number for a
// specific run; guessing the nearest one would put a figure on a quote that
// nobody agreed. When nothing matches, the caller falls back to sector pricing
// and says so, rather than failing quietly.
//
// Order of cities is ignored: Kathmandu then Pokhara is the same road as
// Pokhara then Kathmandu, so one row covers a circuit however it was entered.
// ---------------------------------------------------------------------------

const norm = (s) => String(s || '').trim().toLowerCase();

// Trimmed, de-duplicated, sorted -- the shape both sides compare on.
export function normaliseCities(list) {
  const seen = new Set();
  for (const c of Array.isArray(list) ? list : []) {
    const n = norm(c);
    if (n) seen.add(n);
  }
  return [...seen].sort();
}

const sameSet = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// The cities a trip actually sleeps in. The final day is the departure -- it
// has no hotel and its city is where the vehicle drops them, which is already
// carried by `end_city`.
export function overnightCitiesOf(itinerary) {
  const days = Array.isArray(itinerary) ? itinerary : [];
  const staying = days.length > 1 ? days.slice(0, -1) : days;
  return normaliseCities(staying.map((d) => d && d.city));
}

// The one package rate that covers this exact trip, or null.
export function findVehiclePackage({
  vehiclePackages,
  vehicleId,
  startCity,
  endCity,
  itinerary,
}) {
  if (!vehicleId || !Array.isArray(vehiclePackages) || vehiclePackages.length === 0) return null;
  const days = Array.isArray(itinerary) ? itinerary.length : 0;
  if (days < 1) return null;

  const cities = overnightCitiesOf(itinerary);
  if (cities.length === 0) return null;

  return (
    vehiclePackages.find(
      (p) =>
        p &&
        p.vehicle_id === vehicleId &&
        norm(p.start_city) === norm(startCity) &&
        norm(p.end_city) === norm(endCity) &&
        Number(p.days) === days &&
        sameSet(normaliseCities(p.cities), cities)
    ) || null
  );
}

// What to tell the operator when no rate exists for the run they have built.
// Named in full, because the useful thing is knowing exactly which row to add.
export function describeMissingPackage({ vehicles, vehicleId, startCity, endCity, itinerary }) {
  const vehicle = (vehicles || []).find((v) => v.id === vehicleId);
  const days = Array.isArray(itinerary) ? itinerary.length : 0;
  const cities = overnightCitiesOf(itinerary);
  return {
    vehicleName: vehicle ? vehicle.name : 'This vehicle',
    startCity: String(startCity || '').trim(),
    endCity: String(endCity || '').trim(),
    days,
    // Display form: original casing is lost by normalising, so title-case it
    // back for reading rather than showing the operator lowercase city names.
    cities: cities.map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase())),
  };
}
