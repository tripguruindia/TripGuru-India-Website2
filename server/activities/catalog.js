// Shapes and rules for destinations, products and options: DB row <-> API,
// validation, and the checks a product must pass before it can go live.
const { categories } = require('../../src/activities/config/categories.json');

const CATEGORY_IDS = categories.map((c) => c.id);
const LIVE_CATEGORIES = categories.filter((c) => c.live).map((c) => c.id);
const STATUSES = ['draft', 'published', 'archived'];
const PRICING_UNITS = ['per_person', 'per_unit'];

// Destination slugs sit at the top of the section's URL space, beside its
// own pages, so these can never be a destination.
const RESERVED_SLUGS = new Set([
  'admin', 'search', 'cart', 'checkout', 'account', 'login', 'signup', 'agent', 'agents',
  'help', 'about', 'terms', 'privacy', 'refund-policy', 'cancellation-policy', 'contact',
  'api', 'booking', 'bookings', 'my-bookings', 'invoice', 'ticket', 'voucher',
  ...categories.map((c) => c.slug), ...CATEGORY_IDS,
]);

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parse(json, fallback) {
  if (json === null || json === undefined || json === '') return fallback;
  try {
    const v = JSON.parse(json);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

function str(v, max = 20000) {
  return String(v ?? '').trim().slice(0, max);
}

function strList(v, max = 60) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, 500)).filter(Boolean).slice(0, max);
}

// A price is whole rupees, or null for "this traveller type is not sold".
function price(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function int(v, fallback, min = 0, max = 100000) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------------------
// Cancellation policy: tiers of "cancel at least N hours before -> R% back".
// Anything later than the last tier refunds nothing. No tiers = non-refundable.
// ---------------------------------------------------------------------------
function cleanPolicy(p) {
  const tiers = Array.isArray(p?.tiers) ? p.tiers : [];
  const clean = tiers
    .map((t) => ({ hours: int(t.hours, 0, 0, 24 * 365), refund: int(t.refund, 0, 0, 100) }))
    .filter((t) => t.refund > 0)
    .sort((a, b) => b.hours - a.hours);
  return { tiers: clean, note: str(p?.note, 1000) };
}

function refundPercent(policy, hoursBefore) {
  for (const t of [...(policy?.tiers || [])].sort((a, b) => b.hours - a.hours)) {
    if (hoursBefore >= t.hours) return t.refund;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Availability on an option: which days it runs, which are shut, how much
// notice it needs, and the start times if it has them.
// ---------------------------------------------------------------------------
function cleanAvailability(a) {
  const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
  return {
    weekdays: Array.isArray(a?.weekdays) ? [...new Set(a.weekdays.map(Number).filter((d) => d >= 0 && d <= 6))].sort() : [],
    closed: Array.isArray(a?.closed) ? [...new Set(a.closed.filter(isDate))].sort() : [],
    from: isDate(a?.from) ? a.from : '',
    until: isDate(a?.until) ? a.until : '',
    leadHours: int(a?.leadHours, 24, 0, 24 * 60),
    times: strList(a?.times, 24).filter((t) => /^\d{2}:\d{2}$/.test(t)),
    dateRequired: a?.dateRequired !== false,
  };
}

function optionFromRow(r, { withNet = false } = {}) {
  const o = {
    id: r.id,
    name: r.name,
    description: r.description,
    pricingUnit: r.pricing_unit,
    prices: {
      adult: r.price_adult,
      child: r.price_child,
      senior: r.price_senior,
      unit: r.price_unit,
    },
    minPax: r.min_pax,
    maxPax: r.max_pax,
    availability: cleanAvailability(parse(r.availability, {})),
    active: !!r.active,
    sortOrder: r.sort_order,
  };
  if (withNet) o.net = { adult: r.net_adult, child: r.net_child, senior: r.net_senior, unit: r.net_unit };
  return o;
}

// The lowest price a card can honestly say "from": the cheapest sold adult
// price, or the cheapest unit price for things sold per vehicle / per pack.
function fromPrice(options) {
  const live = options.filter((o) => o.active);
  const candidates = live
    .map((o) => (o.pricingUnit === 'per_unit' ? o.prices.unit : o.prices.adult))
    .filter((p) => p !== null && p !== undefined && p > 0);
  if (!candidates.length) return null;
  const min = Math.min(...candidates);
  const opt = live.find((o) => (o.pricingUnit === 'per_unit' ? o.prices.unit : o.prices.adult) === min);
  return { amount: min, per: opt.pricingUnit === 'per_unit' ? 'unit' : 'adult' };
}

function productFromRow(r, options = [], destination = null, { withNet = false } = {}) {
  const opts = options.map((o) => optionFromRow(o, { withNet }));
  return {
    id: r.id,
    slug: r.slug,
    destinationId: r.destination_id,
    destination: destination ? { id: destination.id, slug: destination.slug, name: destination.name, country: destination.country } : null,
    category: r.category,
    title: r.title,
    summary: r.summary,
    description: r.description,
    durationText: r.duration_text,
    highlights: parse(r.highlights, []),
    includes: parse(r.includes, []),
    excludes: parse(r.excludes, []),
    itinerary: parse(r.itinerary, []),
    meetingPoint: r.meeting_point,
    pickupInfo: r.pickup_info,
    howToUse: r.how_to_use,
    indiaNotes: r.india_notes,
    images: parse(r.images, []),
    features: parse(r.features, []),
    attributes: parse(r.attributes, {}),
    ages: { childMin: r.child_age_min, childMax: r.child_age_max, seniorMin: r.senior_age_min },
    cancellationPolicy: cleanPolicy(parse(r.cancellation_policy, {})),
    supplier: r.supplier,
    supplierRef: r.supplier_ref,
    status: r.status,
    sortOrder: r.sort_order,
    options: opts.filter((o) => withNet || o.active),
    fromPrice: fromPrice(opts),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// What a listing needs -- no long text, no options.
function productCard(p) {
  return {
    id: p.id,
    slug: p.slug,
    destination: p.destination,
    category: p.category,
    title: p.title,
    summary: p.summary,
    durationText: p.durationText,
    image: p.images[0] || '',
    features: p.features,
    freeCancellation: p.cancellationPolicy.tiers.some((t) => t.refund === 100),
    freeCancellationHours: Math.min(...p.cancellationPolicy.tiers.filter((t) => t.refund === 100).map((t) => t.hours).concat([Infinity])),
    fromPrice: p.fromPrice,
    attributes: p.attributes,
  };
}

function destinationFromRow(r) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    country: r.country,
    tagline: r.tagline,
    description: r.description,
    heroImage: r.hero_image,
    tint: r.tint,
    sortOrder: r.sort_order,
    published: !!r.published,
  };
}

// ---------------------------------------------------------------------------
// Input cleaning. Returns { value, errors }.
// ---------------------------------------------------------------------------
function cleanDestination(body) {
  const errors = [];
  const name = str(body.name, 120);
  if (!name) errors.push('Name is required');
  const slug = slugify(body.slug || name);
  if (!slug) errors.push('Web address is required');
  if (RESERVED_SLUGS.has(slug)) errors.push(`"${slug}" is used by the site itself — choose another web address`);
  return {
    errors,
    value: {
      slug,
      name,
      country: str(body.country, 120),
      tagline: str(body.tagline, 200),
      description: str(body.description, 5000),
      hero_image: str(body.heroImage, 2000),
      tint: /^#[0-9a-fA-F]{6}$/.test(body.tint || '') ? body.tint : '#2F5D8C',
      sort_order: int(body.sortOrder, 0, -1000, 1000),
      published: body.published === false ? 0 : 1,
    },
  };
}

function cleanItinerary(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => ({ time: str(s?.time, 40), text: str(s?.text, 1000) }))
    .filter((s) => s.text)
    .slice(0, 40);
}

function cleanAttributes(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  const out = {};
  for (const [k, val] of Object.entries(v).slice(0, 40)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(k)) continue;
    if (typeof val === 'boolean' || typeof val === 'number') out[k] = val;
    else if (Array.isArray(val)) out[k] = strList(val, 100);
    else out[k] = str(val, 1000);
  }
  return out;
}

function cleanProduct(body) {
  const errors = [];
  const title = str(body.title, 200);
  if (!title) errors.push('Title is required');
  const category = str(body.category, 40);
  if (!CATEGORY_IDS.includes(category)) errors.push('Choose a category');
  const status = STATUSES.includes(body.status) ? body.status : 'draft';
  const slug = slugify(body.slug || title);
  if (!slug) errors.push('Web address is required');
  const images = strList(body.images, 20).filter((u) => /^https:\/\//i.test(u));
  return {
    errors,
    value: {
      slug,
      destination_id: str(body.destinationId, 80),
      category,
      title,
      summary: str(body.summary, 400),
      description: str(body.description, 20000),
      duration_text: str(body.durationText, 80),
      highlights: JSON.stringify(strList(body.highlights)),
      includes: JSON.stringify(strList(body.includes)),
      excludes: JSON.stringify(strList(body.excludes)),
      itinerary: JSON.stringify(cleanItinerary(body.itinerary)),
      meeting_point: str(body.meetingPoint, 3000),
      pickup_info: str(body.pickupInfo, 3000),
      how_to_use: str(body.howToUse, 3000),
      india_notes: str(body.indiaNotes, 3000),
      images: JSON.stringify(images),
      features: JSON.stringify(strList(body.features, 30)),
      attributes: JSON.stringify(cleanAttributes(body.attributes)),
      child_age_min: int(body.ages?.childMin, 3, 0, 30),
      child_age_max: int(body.ages?.childMax, 11, 0, 30),
      senior_age_min: int(body.ages?.seniorMin, 60, 40, 100),
      cancellation_policy: JSON.stringify(cleanPolicy(body.cancellationPolicy)),
      supplier: str(body.supplier, 40) || 'manual',
      supplier_ref: str(body.supplierRef, 200),
      status,
      sort_order: int(body.sortOrder, 0, -1000, 1000),
    },
  };
}

function cleanOption(body, index) {
  const errors = [];
  const name = str(body.name, 160);
  if (!name) errors.push(`Option ${index + 1} needs a name`);
  const pricingUnit = PRICING_UNITS.includes(body.pricingUnit) ? body.pricingUnit : 'per_person';
  const p = body.prices || {};
  const n = body.net || {};
  return {
    errors,
    value: {
      id: str(body.id, 80) || null,
      name,
      description: str(body.description, 2000),
      pricing_unit: pricingUnit,
      price_adult: price(p.adult),
      price_child: price(p.child),
      price_senior: price(p.senior),
      price_unit: price(p.unit),
      net_adult: price(n.adult) ?? 0,
      net_child: price(n.child) ?? 0,
      net_senior: price(n.senior) ?? 0,
      net_unit: price(n.unit) ?? 0,
      min_pax: int(body.minPax, 1, 1, 100),
      max_pax: int(body.maxPax, 20, 1, 500),
      availability: JSON.stringify(cleanAvailability(body.availability || {})),
      active: body.active === false ? 0 : 1,
      sort_order: index,
    },
  };
}

// A product may only go live if a traveller could actually buy it.
function publishProblems(product, options, destination) {
  const problems = [];
  if (!destination) problems.push('It needs a destination');
  if (!LIVE_CATEGORIES.includes(product.category)) problems.push('This category is not open for sale yet');
  const sellable = options.filter((o) => o.active && (
    o.pricing_unit === 'per_unit' ? o.price_unit > 0 : o.price_adult > 0
  ));
  if (!sellable.length) problems.push('It needs at least one active option with a price');
  return problems;
}

module.exports = {
  CATEGORY_IDS,
  LIVE_CATEGORIES,
  RESERVED_SLUGS,
  slugify,
  parse,
  cleanPolicy,
  refundPercent,
  cleanAvailability,
  optionFromRow,
  productFromRow,
  productCard,
  destinationFromRow,
  cleanDestination,
  cleanProduct,
  cleanOption,
  publishProblems,
};
