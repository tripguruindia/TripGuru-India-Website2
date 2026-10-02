-- ---------------------------------------------------------------------------
-- Activities section (tours, tickets, transfers, eSIMs; trains and insurance
-- later). Every table is prefixed act_ so it can share a database with the
-- Nepal portal today and be copied out to its own database later without a
-- single name colliding. No brand name appears anywhere here on purpose: the
-- brand is temporary and lives only in src/activities/config/brand.json.
--
-- Every statement is CREATE ... IF NOT EXISTS and is applied on every boot by
-- server/activities/migrate.js. A new COLUMN on an existing table needs an
-- entry in ADDITIVE_COLUMNS there, exactly as in the Nepal server.
--
-- Money is whole rupees (INTEGER). Prices shown to travellers are final and
-- GST-inclusive; see act_bookings for how the split is recorded.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS act_destinations (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT '',
  tagline       TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  hero_image    TEXT NOT NULL DEFAULT '',
  tint          TEXT NOT NULL DEFAULT '#2F5D8C',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  published     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- One row per thing a traveller can buy. `category` decides which screen and
-- which extra fields apply; the cart, bookings and suppliers never branch on
-- it, which is what lets trains and insurance arrive without a rebuild.
--   tour | ticket | transfer | esim | train | insurance
-- `attributes` holds the category-specific facts (eSIM data and validity, a
-- transfer's vehicle and luggage, a rail pass's class) as JSON.
CREATE TABLE IF NOT EXISTS act_products (
  id                  TEXT PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  destination_id      TEXT NOT NULL,
  category            TEXT NOT NULL,
  title               TEXT NOT NULL,
  summary             TEXT NOT NULL DEFAULT '',
  description         TEXT NOT NULL DEFAULT '',
  duration_text       TEXT NOT NULL DEFAULT '',
  highlights          TEXT NOT NULL DEFAULT '[]',
  includes            TEXT NOT NULL DEFAULT '[]',
  excludes            TEXT NOT NULL DEFAULT '[]',
  itinerary           TEXT NOT NULL DEFAULT '[]',
  meeting_point       TEXT NOT NULL DEFAULT '',
  pickup_info         TEXT NOT NULL DEFAULT '',
  how_to_use          TEXT NOT NULL DEFAULT '',
  india_notes         TEXT NOT NULL DEFAULT '',
  images              TEXT NOT NULL DEFAULT '[]',
  features            TEXT NOT NULL DEFAULT '[]',
  attributes          TEXT NOT NULL DEFAULT '{}',
  child_age_min       INTEGER NOT NULL DEFAULT 3,
  child_age_max       INTEGER NOT NULL DEFAULT 11,
  senior_age_min      INTEGER NOT NULL DEFAULT 60,
  cancellation_policy TEXT NOT NULL DEFAULT '{"tiers":[]}',
  supplier            TEXT NOT NULL DEFAULT 'manual',
  supplier_ref        TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'draft',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS act_products_destination ON act_products(destination_id, status);

-- The choices on a product page ("Standard camp" / "Premium camp", "5 GB /
-- 7 days"). Selling prices are what a traveller pays, GST included. Net rates
-- are what an agent pays (Phase 3); 0 means "no agent rate set".
-- A price of NULL means that traveller type is not sold on this option.
CREATE TABLE IF NOT EXISTS act_options (
  id                TEXT PRIMARY KEY,
  product_id        TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  pricing_unit      TEXT NOT NULL DEFAULT 'per_person',
  price_adult       INTEGER,
  price_child       INTEGER,
  price_senior      INTEGER,
  price_unit        INTEGER,
  net_adult         INTEGER NOT NULL DEFAULT 0,
  net_child         INTEGER NOT NULL DEFAULT 0,
  net_senior        INTEGER NOT NULL DEFAULT 0,
  net_unit          INTEGER NOT NULL DEFAULT 0,
  min_pax           INTEGER NOT NULL DEFAULT 1,
  max_pax           INTEGER NOT NULL DEFAULT 20,
  availability      TEXT NOT NULL DEFAULT '{}',
  active            INTEGER NOT NULL DEFAULT 1,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS act_options_product ON act_options(product_id);

-- Accounts for all three sections. role: admin | staff | traveller | agent.
-- Agents belong to an agency (Phase 3); several logins per agency are the
-- "team logins". Kept apart from the Nepal portal's users on purpose.
CREATE TABLE IF NOT EXISTS act_users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL,
  agency_id       TEXT,
  agency_role     TEXT NOT NULL DEFAULT '',
  approval_status TEXT NOT NULL DEFAULT 'approved',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS act_agencies (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  gst_number      TEXT NOT NULL DEFAULT '',
  logo            TEXT NOT NULL DEFAULT '',
  phone           TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  default_markup  REAL NOT NULL DEFAULT 0,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approval_note   TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL
);

-- Every rupee in or out of an agency wallet, never edited, only appended.
-- The balance is the sum of this table, so it can always be explained.
CREATE TABLE IF NOT EXISTS act_wallet_ledger (
  id          TEXT PRIMARY KEY,
  agency_id   TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  kind        TEXT NOT NULL,
  reference   TEXT NOT NULL DEFAULT '',
  note        TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS act_wallet_agency ON act_wallet_ledger(agency_id, created_at);

-- A booking is one checkout; it holds one or more items, each of any
-- category. Payment, invoice and refund rows hang off the booking.
-- GST under the agent model: only TripGuru's service fee is taxed, so the
-- booking records both the pass-through cost and the fee it was charged on.
CREATE TABLE IF NOT EXISTS act_bookings (
  id              TEXT PRIMARY KEY,
  reference       TEXT NOT NULL UNIQUE,
  user_id         TEXT,
  agency_id       TEXT,
  channel         TEXT NOT NULL DEFAULT 'b2c',
  status          TEXT NOT NULL DEFAULT 'pending_payment',
  contact         TEXT NOT NULL DEFAULT '{}',
  customer_gstin  TEXT NOT NULL DEFAULT '',
  total_amount    INTEGER NOT NULL DEFAULT 0,
  cost_amount     INTEGER NOT NULL DEFAULT 0,
  service_fee     INTEGER NOT NULL DEFAULT 0,
  gst_amount      INTEGER NOT NULL DEFAULT 0,
  agent_markup    INTEGER NOT NULL DEFAULT 0,
  payment_status  TEXT NOT NULL DEFAULT 'unpaid',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS act_booking_items (
  id                  TEXT PRIMARY KEY,
  booking_id          TEXT NOT NULL,
  product_id          TEXT NOT NULL,
  option_id           TEXT NOT NULL,
  category            TEXT NOT NULL,
  title               TEXT NOT NULL,
  option_name         TEXT NOT NULL DEFAULT '',
  travel_date         TEXT NOT NULL DEFAULT '',
  pax                 TEXT NOT NULL DEFAULT '{}',
  details             TEXT NOT NULL DEFAULT '{}',
  line_total          INTEGER NOT NULL DEFAULT 0,
  line_cost           INTEGER NOT NULL DEFAULT 0,
  cancellation_policy TEXT NOT NULL DEFAULT '{"tiers":[]}',
  supplier            TEXT NOT NULL DEFAULT 'manual',
  supplier_ref        TEXT NOT NULL DEFAULT '',
  fulfilment_status   TEXT NOT NULL DEFAULT 'pending',
  voucher             TEXT NOT NULL DEFAULT '{}',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS act_items_booking ON act_booking_items(booking_id);

CREATE TABLE IF NOT EXISTS act_payments (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL,
  gateway       TEXT NOT NULL,
  gateway_ref   TEXT NOT NULL DEFAULT '',
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL,
  raw           TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS act_refunds (
  id            TEXT PRIMARY KEY,
  booking_id    TEXT NOT NULL,
  item_id       TEXT,
  amount        INTEGER NOT NULL,
  reason        TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'requested',
  gateway_ref   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Invoice numbers must be continuous with no gaps (a GST rule), so they come
-- from a counter per financial year rather than from booking ids.
CREATE TABLE IF NOT EXISTS act_invoices (
  id              TEXT PRIMARY KEY,
  booking_id      TEXT NOT NULL,
  invoice_number  TEXT NOT NULL UNIQUE,
  financial_year  TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'invoice',
  data            TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS act_counters (
  name   TEXT PRIMARY KEY,
  value  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS act_settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
