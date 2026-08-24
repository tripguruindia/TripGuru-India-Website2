// ---------------------------------------------------------------------------
// What a freshly built day in a city starts out as: which hotel, which meal
// plan, and which activities.
//
// This is the ONE place that decides. Before it existed the answer was spread
// across the builder: the hotel was `cityHotels[0]` -- whichever hotel happened
// to sit first in the Hotels master, so with several options at a rating the
// choice was effectively arbitrary -- and the meal plan was the literal
// `city === 'chitwan' ? 'AP' : 'CP'`, written out in nine separate places, so
// no other city could ever default to anything but CP.
//
// Admin -> City Defaults now drives all three. Everything is OPTIONAL: with no
// row for a city, or a field left unset, these fall back to exactly what the
// builder did before, so nothing reprices until the defaults are filled in.
//
// Kept deliberately free of React and of `db`, so the pricing engine, the
// builder and the tests all read the same rules.
// ---------------------------------------------------------------------------

// Same forgiving comparison as sameCity() in App.jsx: a stray space or a
// different case in the Cities master must not hide a city's own data.
const sameCity = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// The rule the builder used before City Defaults existed. Kept as the fallback
// so an unconfigured city behaves exactly as it always has.
const BUILT_IN_MEALS = (city) => (sameCity(city, 'chitwan') ? 'AP' : 'CP');

export function cityDefaultsFor(cityDefaults, city) {
  if (!Array.isArray(cityDefaults)) return null;
  return cityDefaults.find((c) => sameCity(c.city, city)) || null;
}

// The hotel a new day in this city should book at this star rating.
//
// A configured default is only honoured if that hotel still exists AND is
// still in this city at this rating -- an admin can delete a hotel or change
// its rating long after setting it as a default, and a dangling id would put
// a day in a hotel that is not there.
export function defaultHotelId(cityDefaults, hotels, city, category) {
  const inCityAtRating = (hotels || []).filter(
    (h) => sameCity(h.city, city) && h.category === category
  );
  const configured = cityDefaultsFor(cityDefaults, city)?.default_hotels?.[category];
  if (configured && inCityAtRating.some((h) => h.id === configured)) return configured;
  // Unconfigured, or configured to something no longer valid: the old rule.
  return inCityAtRating.length > 0 ? inCityAtRating[0].id : '';
}

export function defaultMealPlan(cityDefaults, city) {
  const configured = cityDefaultsFor(cityDefaults, city)?.default_meals;
  return configured || BUILT_IN_MEALS(city);
}

// Activities for the nth night of a stay in this city (1-based).
//
// Keyed by the night's index within the stay rather than by how long the stay
// is, so a three-night stay takes nights 1, 2 and 3 and adding a fourth night
// later does not mean re-entering the first three.
//
// Filtered to activities that still exist and are still in this city: an
// activity is only ever offerable on a day in its own city, and one that was
// deleted or moved must not linger in a default and be silently charged for.
export function defaultActivityIds(cityDefaults, activities, city, nightIndex) {
  const plans = cityDefaultsFor(cityDefaults, city)?.night_plans;
  if (!plans) return [];
  const forNight = plans[String(nightIndex)];
  if (!Array.isArray(forNight)) return [];
  return forNight.filter((id) =>
    (activities || []).some((a) => a.id === id && sameCity(a.city, city))
  );
}

// Everything a new day needs, plus a plain-language description of whatever
// was filled in automatically.
//
// The description is not decoration. The previous attempt at automatic
// suggestions dropped a paid activity onto the second night in a city with
// nothing on screen to say so, and quotes came out higher than the agent
// expected. Whatever this adds must be visible and removable at the moment it
// is added, so the caller is handed the names to show.
export function buildDayDefaults({
  cityDefaults,
  hotels,
  activities,
  city,
  category,
  nightIndex,
}) {
  const hotelId = defaultHotelId(cityDefaults, hotels, city, category);
  const meals = defaultMealPlan(cityDefaults, city);
  const activityIds = defaultActivityIds(cityDefaults, activities, city, nightIndex);

  const row = cityDefaultsFor(cityDefaults, city);
  const hotelWasChosenByAdmin =
    !!row?.default_hotels?.[category] && row.default_hotels[category] === hotelId;

  return {
    hotelId,
    meals,
    activityIds,
    // Only what an admin actually configured is announced. Falling back to the
    // first hotel in the list is not a decision worth telling anyone about.
    autoAdded: {
      hotelName: hotelWasChosenByAdmin
        ? (hotels || []).find((h) => h.id === hotelId)?.name || ''
        : '',
      activityNames: activityIds
        .map((id) => (activities || []).find((a) => a.id === id)?.name)
        .filter(Boolean),
    },
  };
}
