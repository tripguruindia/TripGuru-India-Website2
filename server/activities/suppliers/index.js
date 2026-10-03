// ---------------------------------------------------------------------------
// Supplier adapters -- the one place the rest of the code talks to whoever
// actually runs the activity.
//
// Every product row carries `supplier` (an adapter id) and `supplier_ref`
// (that supplier's own id for it). Booking, cancelling and checking
// availability always go through the product's adapter, so plugging in
// GlobalTix or Headout later is writing one file here and registering it;
// the cart, checkout, bookings and Admin do not change.
//
// An adapter is an object with:
//   id, label, categories          what it is and what it can sell
//   configured()                   true once its API keys are present
//   checkAvailability(item)        -> { available, message? }
//   book(item)                     -> { status: 'confirmed'|'pending', supplierRef?, voucher? }
//   cancel(item)                   -> { status: 'cancelled'|'pending', refundable? }
//   importProducts?()              optional: pull a catalogue into act_products
//
// `item` is a booking item: { product, option, travelDate, pax, details }.
//
// Phase 1 has one working adapter, `manual`: TripGuru's own team books with
// the operator by hand, so every booking comes back `pending` and Admin
// marks it confirmed. The others are registered so Admin can show them, but
// refuse to act until they are built and their keys are set.
// ---------------------------------------------------------------------------

const manual = {
  id: 'manual',
  label: 'Our team (booked by hand)',
  categories: ['tour', 'ticket', 'transfer', 'esim', 'train', 'insurance'],
  configured: () => true,
  async checkAvailability() {
    return { available: true };
  },
  async book() {
    return { status: 'pending' };
  },
  async cancel() {
    return { status: 'pending' };
  },
};

function notBuilt(id, label, categories, envKeys) {
  const configured = () => envKeys.every((k) => !!process.env[k]);
  const refuse = async () => {
    const err = new Error(`${label} is not connected yet`);
    err.status = 503;
    err.publicMessage = `${label} is not connected yet`;
    throw err;
  };
  return { id, label, categories, envKeys, configured, connected: false, checkAvailability: refuse, book: refuse, cancel: refuse };
}

const ADAPTERS = [
  manual,
  notBuilt('globaltix', 'GlobalTix', ['ticket', 'tour'], ['GLOBALTIX_USERNAME', 'GLOBALTIX_PASSWORD']),
  notBuilt('headout', 'Headout', ['ticket', 'tour'], ['HEADOUT_API_KEY']),
  notBuilt('viator', 'Viator', ['tour', 'ticket'], ['VIATOR_API_KEY']),
  notBuilt('rail', 'Rail partner (Rail Europe / 12Go)', ['train'], ['RAIL_API_KEY']),
  notBuilt('insurance', 'Insurance partner', ['insurance'], ['INSURANCE_API_KEY']),
];

const byId = new Map(ADAPTERS.map((a) => [a.id, a]));

function getAdapter(id) {
  return byId.get(id) || null;
}

function listAdapters() {
  return ADAPTERS.map((a) => ({
    id: a.id,
    label: a.label,
    categories: a.categories,
    connected: a.connected !== false,
    configured: a.configured(),
  }));
}

module.exports = { getAdapter, listAdapters };
