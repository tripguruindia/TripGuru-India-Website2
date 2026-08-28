// ---------------------------------------------------------------------------
// A sellable name for a trip, generated from what the trip actually contains.
//
// Quotes used to go out called "Kathmandu & Pokhara Custom Itinerary" -- an
// accurate label and a poor product name. A traveller reading a proposal
// should see something that sounds like a holiday, with the length stated the
// way the trade states it: "Wonders of Nepal 4N/5D".
//
// Deliberately NOT random. The same trip must produce the same name every time
// it is rebuilt, or an agent who reprices a quote would watch its title change
// underneath him. The choice is a stable hash of the cities and the length.
//
// The name is only ever a starting point: the field stays editable, and a name
// that was saved with a quote is never overwritten.
// ---------------------------------------------------------------------------

const norm = (s) => String(s || '').trim().toLowerCase();

// Titles grouped by what gives the trip its character. The first group that
// matches wins, so the most distinctive feature names the trip: a jungle stay
// says more about a holiday than another hill town does.
const TITLE_SETS = [
  {
    // Wildlife -- Chitwan or Bardia means a jungle safari leg.
    match: (c) => c.some((x) => /chitwan|bardia/.test(x)),
    titles: [
      'Wild & Wonderful Nepal',
      'Jungles & Peaks of Nepal',
      'Nepal Wildlife & Heritage',
      'Safari & Summits of Nepal',
    ],
  },
  {
    // Pilgrimage -- Lumbini, Janakpur, Muktinath.
    match: (c) => c.some((x) => /lumbini|janakpur|muktinath/.test(x)),
    titles: [
      'Sacred Nepal',
      'Spiritual Trails of Nepal',
      'Temples & Trails of Nepal',
      'Nepal Pilgrimage Journey',
    ],
  },
  {
    // High country -- Jomsom, Nagarkot, Muktinath, Bandipur.
    match: (c) => c.some((x) => /jomsom|nagarkot|bandipur|dhulikhel/.test(x)),
    titles: [
      'Himalayan Heights',
      'Peaks & Valleys of Nepal',
      'Nepal Mountain Escape',
      'Above the Clouds — Nepal',
    ],
  },
  {
    // The classic lakes-and-heritage circuit.
    match: (c) => c.some((x) => /pokhara/.test(x)),
    titles: [
      'Wonders of Nepal',
      'Lakes & Legends of Nepal',
      'Majestic Nepal',
      'Enchanting Nepal',
      'Heritage & Lakes of Nepal',
    ],
  },
  {
    match: () => true,
    titles: [
      'Discover Nepal',
      'Timeless Nepal',
      'Majestic Nepal',
      'The Best of Nepal',
    ],
  },
];

// Small, stable string hash. Only needs to spread evenly and never change for
// the same input -- it is picking a title, not securing anything.
function hashOf(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// "4N/5D" -- nights first, the way the trade writes it. A trip's last day is
// the departure and carries no hotel, so nights are one fewer than days.
export function formatDuration(dayCount) {
  const days = Math.max(1, Number(dayCount) || 0);
  const nights = Math.max(0, days - 1);
  return `${nights}N/${days}D`;
}

// The cities a trip sleeps in, in the order it visits them, de-duplicated.
export function tripCities(itinerary) {
  const seen = [];
  for (const d of Array.isArray(itinerary) ? itinerary : []) {
    const city = String(d?.city || '').trim();
    if (city && !seen.some((c) => norm(c) === norm(city))) seen.push(city);
  }
  return seen;
}

export function generateTripName(itinerary) {
  const days = Array.isArray(itinerary) ? itinerary.length : 0;
  if (days === 0) return '';

  const cities = tripCities(itinerary);
  const keys = cities.map(norm);
  const set = TITLE_SETS.find((s) => s.match(keys)) || TITLE_SETS[TITLE_SETS.length - 1];

  // Stable across rebuilds: same cities and same length, same title.
  const seed = hashOf([...keys].sort().join('|') + '#' + days);
  const title = set.titles[seed % set.titles.length];

  return `${title} ${formatDuration(days)}`;
}
