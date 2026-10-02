// First-boot content. Runs only when a table is empty, so it never touches
// anything entered in Admin.
//
// Destinations are published -- they are just places. The sample products are
// DRAFTS, never shown to travellers, flagged `sample` so Admin warns that
// every price and fact must be checked before publishing. They exist so the
// team can see a finished product and copy its shape.
const { all, run } = require('./db');

const DESTINATIONS = [
  ['thailand', 'Thailand', 'Thailand', 'Bangkok · Phuket · Pattaya · Krabi', '#2F5D8C'],
  ['dubai', 'Dubai', 'United Arab Emirates', 'Desert safaris · Burj Khalifa · theme parks', '#9A6A2F'],
  ['bali', 'Bali', 'Indonesia', 'Ubud · Nusa Penida · beach clubs', '#3C7A5A'],
  ['singapore', 'Singapore', 'Singapore', 'Sentosa · Universal Studios · Gardens', '#7A3C5A'],
  ['vietnam', 'Vietnam', 'Vietnam', 'Hanoi · Ha Long Bay · Da Nang', '#5A6E2F'],
  ['abu-dhabi', 'Abu Dhabi', 'United Arab Emirates', 'Yas Island · Grand Mosque · Ferrari World', '#2F6E7A'],
  ['japan', 'Japan', 'Japan', 'Tokyo · Kyoto · Osaka', '#8C2F3C'],
  ['europe', 'Europe', 'Europe', 'Paris · Switzerland · Italy', '#4A4A7A'],
];

const POLICY_48 = { tiers: [{ hours: 48, refund: 100 }, { hours: 24, refund: 50 }], note: '' };
const POLICY_24 = { tiers: [{ hours: 24, refund: 100 }], note: '' };
const NON_REFUNDABLE = { tiers: [], note: 'Tickets are issued on the date chosen and cannot be refunded.' };
const EVERY_DAY = { weekdays: [], closed: [], from: '', until: '', leadHours: 24, times: [], dateRequired: true };

const SAMPLES = [
  {
    id: 'prd-sample-dubai-safari',
    slug: 'sample-desert-safari-bbq-dinner',
    destination: 'dubai',
    category: 'tour',
    title: 'Desert Safari with BBQ Dinner and Dune Bashing',
    summary: 'An evening in the dunes outside Dubai: a 4x4 dune drive, sunset, a camel ride and dinner at a desert camp.',
    duration_text: '6 hours',
    highlights: ['Hotel pickup and drop in Dubai', 'Dune drive in a 4x4', 'Sunset photo stop', 'Dinner and live show at the camp'],
    includes: ['Hotel pickup and drop', '4x4 dune drive', 'Dinner', 'Water and soft drinks', 'Live show'],
    excludes: ['Quad bike', 'Tips', 'Photos sold at the camp'],
    itinerary: [
      { time: '2:30 pm', text: 'Pickup from your hotel lobby.' },
      { time: '4:00 pm', text: 'Dune drive, then a stop for photos at sunset.' },
      { time: '6:00 pm', text: 'Camp: camel ride, henna, tea and snacks.' },
      { time: '7:30 pm', text: 'Dinner and live show. Back at the hotel by about 9:30 pm.' },
    ],
    pickup_info: 'Pickup from hotels in Dubai city. The driver\'s name and number are sent on WhatsApp the evening before.',
    how_to_use: 'Show the e-ticket on your phone to the driver. No printout needed.',
    india_notes: 'Vegetarian and Jain dinner on request — choose it at checkout.',
    features: ['hotel_pickup', 'veg', 'jain', 'mobile_ticket'],
    attributes: { sample: true },
    policy: POLICY_48,
    options: [
      { name: 'Standard camp', description: 'Shared 4x4, buffet dinner with a vegetarian counter, camel ride, live show.', adult: 2450, child: 1650, senior: 2100 },
      { name: 'Premium camp', description: 'Smaller group, dinner served at your table, sandboarding.', adult: 3850, child: 2650, senior: 3450 },
    ],
  },
  {
    id: 'prd-sample-burj-khalifa',
    slug: 'sample-burj-khalifa-at-the-top',
    destination: 'dubai',
    category: 'ticket',
    title: 'Burj Khalifa At the Top — Levels 124 & 125',
    summary: 'Entry ticket to the observation decks of the world\'s tallest building.',
    duration_text: '1–2 hours',
    highlights: ['Observation decks on levels 124 and 125', 'Choose your time slot'],
    includes: ['Entry for the time slot chosen'],
    excludes: ['Hotel transfers'],
    meeting_point: 'Entrance on the lower ground floor of The Dubai Mall.',
    how_to_use: 'Show the QR code on your e-ticket at the entrance, 15 minutes before your slot.',
    features: ['mobile_ticket', 'senior_price'],
    attributes: { sample: true },
    policy: NON_REFUNDABLE,
    options: [
      { name: 'Standard hours', description: 'Daytime entry.', adult: 3890, child: 2990, senior: null, times: ['10:00', '12:00', '14:00'] },
    ],
  },
  {
    id: 'prd-sample-bkk-transfer',
    slug: 'sample-bangkok-airport-private-transfer',
    destination: 'thailand',
    category: 'transfer',
    title: 'Bangkok Suvarnabhumi Airport to City Hotel — Private Car',
    summary: 'A private car waiting at arrivals, straight to your hotel in Bangkok city.',
    duration_text: 'About 45–60 minutes',
    includes: ['Meet and greet with a name board', 'Waiting time after landing', 'Tolls'],
    pickup_info: 'Your driver waits at arrivals with your name on a board. Tell us your flight number at checkout.',
    features: ['meet_and_greet', 'private'],
    attributes: { sample: true, vehicle: 'Sedan', maxPassengers: 3, maxBags: 2, from: 'Suvarnabhumi Airport (BKK)', to: 'Hotels in Bangkok city' },
    policy: POLICY_24,
    options: [
      { name: 'Sedan (up to 3 people, 2 bags)', unit: 1650 },
      { name: 'Van (up to 8 people, 6 bags)', unit: 2650 },
    ],
  },
  {
    id: 'prd-sample-thailand-esim',
    slug: 'sample-thailand-esim',
    destination: 'thailand',
    category: 'esim',
    title: 'Thailand eSIM — Data Plan',
    summary: 'Mobile data in Thailand from the moment you land. Installs by QR code before you fly.',
    includes: ['Data on a local network', 'Hotspot allowed'],
    excludes: ['Phone calls and SMS'],
    how_to_use: 'We send a QR code by email and WhatsApp. Scan it in your phone settings before you fly; the plan starts when you first connect in Thailand.',
    features: ['instant_delivery'],
    attributes: { sample: true, coverage: 'Thailand', hotspot: true, needsUnlockedPhone: true },
    policy: { tiers: [], note: 'Refundable only if the QR code has not been scanned.' },
    availability: { leadHours: 0, dateRequired: false },
    options: [
      { name: '5 GB · 8 days', unit: 599 },
      { name: '15 GB · 15 days', unit: 1199 },
    ],
  },
];

async function seed() {
  const now = new Date().toISOString();
  const existing = await all('SELECT COUNT(*) AS n FROM act_destinations');
  if (Number(existing[0].n) === 0) {
    let order = 0;
    for (const [slug, name, country, tagline, tint] of DESTINATIONS) {
      await run(
        `INSERT INTO act_destinations (id, slug, name, country, tagline, tint, sort_order, published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        ['dst-' + slug, slug, name, country, tagline, tint, order++, now, now]
      );
    }
  }

  const products = await all('SELECT COUNT(*) AS n FROM act_products');
  if (Number(products[0].n) > 0) return;
  for (const s of SAMPLES) {
    await run(
      `INSERT INTO act_products (id, slug, destination_id, category, title, summary, description, duration_text,
         highlights, includes, excludes, itinerary, meeting_point, pickup_info, how_to_use, india_notes,
         images, features, attributes, cancellation_policy, supplier, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 'manual', 'draft', ?, ?)`,
      [
        s.id, s.slug, 'dst-' + s.destination, s.category, s.title, s.summary, s.duration_text || '',
        JSON.stringify(s.highlights || []), JSON.stringify(s.includes || []), JSON.stringify(s.excludes || []),
        JSON.stringify(s.itinerary || []), s.meeting_point || '', s.pickup_info || '', s.how_to_use || '',
        s.india_notes || '', JSON.stringify(s.features || []), JSON.stringify(s.attributes || {}),
        JSON.stringify(s.policy), now, now,
      ]
    );
    let i = 0;
    for (const o of s.options) {
      const perUnit = o.unit !== undefined;
      await run(
        `INSERT INTO act_options (id, product_id, name, description, pricing_unit, price_adult, price_child,
           price_senior, price_unit, availability, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${s.id}-o${i}`, s.id, o.name, o.description || '', perUnit ? 'per_unit' : 'per_person',
          perUnit ? null : o.adult, perUnit ? null : (o.child ?? null), perUnit ? null : (o.senior ?? null),
          perUnit ? o.unit : null, JSON.stringify({ ...EVERY_DAY, ...(s.availability || {}), times: o.times || [] }), i, now, now,
        ]
      );
      i += 1;
    }
  }
}

module.exports = { seed };
