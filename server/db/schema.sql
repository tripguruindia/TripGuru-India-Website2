-- Nepal portal schema for Turso (libSQL / SQLite dialect).
--
-- SQLite has no native JSON, DECIMAL, or BOOLEAN types: nested structures
-- (rates matrices, package day arrays, booking itineraries) are stored as
-- TEXT columns holding JSON, parsed/stringified in application code
-- (see src/serializers.js); money fields are REAL; booleans are INTEGER
-- 0/1. All statements are idempotent (IF NOT EXISTS) so this file can be
-- re-run safely on every deploy.

CREATE TABLE IF NOT EXISTS cities (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS hotels (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  category    TEXT,
  description TEXT,
  rates       TEXT NOT NULL -- JSON: {single,double,extra_adult,cwb,cnb} x {CP,MAP,AP}
);

CREATE TABLE IF NOT EXISTS vehicles (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  description            TEXT,
  capacity               INTEGER,
  daily_sightseeing_rate REAL,
  route_rates            TEXT NOT NULL -- JSON: {routeKey: number}
);

CREATE TABLE IF NOT EXISTS routes (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  description TEXT,
  price_adult  REAL,
  price_child  REAL
);

CREATE TABLE IF NOT EXISTS packages (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  description             TEXT,
  duration_nights         INTEGER,
  default_hotel_category  TEXT,
  default_vehicle_id      TEXT,
  starting_price_override REAL,
  cities                  TEXT NOT NULL, -- JSON array of city names
  days                    TEXT NOT NULL  -- JSON array of day objects
);

-- Singleton row, id is always 1.
CREATE TABLE IF NOT EXISTS settings (
  id                        INTEGER PRIMARY KEY CHECK (id = 1),
  markup_percent            REAL NOT NULL DEFAULT 15,
  b2c_markup_percent        REAL NOT NULL DEFAULT 15,
  b2b_markup_percent        REAL NOT NULL DEFAULT 10,
  b2b_admin_margin_percent  REAL NOT NULL DEFAULT 10,
  tax_percent               REAL NOT NULL DEFAULT 13,
  exchange_rate             REAL,
  popup_poster_url          TEXT,
  popup_poster_active       INTEGER NOT NULL DEFAULT 0
);

-- Bookings are created server-side via POST /api/nepal/bookings (Phase 2:
-- B2C/B2B wiring). agent_id is set by the server from the authenticated
-- B2B agent's own user id -- never trust a client-supplied agent_id.
CREATE TABLE IF NOT EXISTS bookings (
  id                        TEXT PRIMARY KEY,
  client_name               TEXT NOT NULL,
  email                     TEXT,
  phone                     TEXT,
  travel_date               TEXT,
  adults                    INTEGER DEFAULT 0,
  cwb                       INTEGER DEFAULT 0,
  cnb                       INTEGER DEFAULT 0,
  total_price               REAL,
  package_name              TEXT,
  status                    TEXT NOT NULL DEFAULT 'Confirmed',
  created_at                TEXT NOT NULL,
  itinerary_summary         TEXT,
  type                      TEXT NOT NULL,
  agent_id                  TEXT, -- FK to users.id, set server-side for B2B bookings
  agent_commission          REAL,
  vehicle_id                TEXT,
  hotel_category             TEXT,
  start_city                 TEXT,
  end_city                   TEXT,
  notes                     TEXT,
  markup_percent             REAL,
  b2b_admin_margin_percent   REAL,
  passengers                 TEXT, -- JSON
  itinerary                  TEXT, -- JSON
  rooms                      TEXT, -- JSON
  b2b_white_label            TEXT, -- JSON
  -- FK to users.id, set server-side when a logged-in B2C traveler checks
  -- out. Nullable -- anonymous/guest B2C checkout (no account) still
  -- works and just leaves this null, matching pre-Phase-2 behavior.
  -- Added via an additive ALTER TABLE in migrate.js for databases that
  -- already had a `bookings` table before this column existed.
  user_id                    TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT,
  country_code TEXT,
  phone        TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL,
  full_name      TEXT,
  phone          TEXT,
  country_code   TEXT,
  agency_name    TEXT,
  agency_address TEXT,
  agency_phone   TEXT,
  agency_email   TEXT,
  agency_website TEXT,
  wallet_balance REAL NOT NULL DEFAULT 0,
  address        TEXT,
  created_at     TEXT NOT NULL
);

-- Saved quotes: an agent's (or logged-in traveler's) work-in-progress
-- proposals, before any of them become a real booking.
--
-- Deliberately NOT stored in `bookings` with a draft status: a quote has no
-- commission owed, must not count toward an agent's sales volume, and is
-- edited repeatedly. Folding the two together would corrupt the dashboard
-- totals. On acceptance a quote is CONVERTED into a booking, and
-- `converted_booking_id` preserves the link so win rates stay measurable.
--
-- Ownership (agent_id / user_id) is always assigned server-side from the
-- authenticated session, never from the request body -- same rule that
-- governs bookings.agent_id.
CREATE TABLE IF NOT EXISTS quotes (
  id                    TEXT PRIMARY KEY,
  agent_id              TEXT,     -- FK to users.id, set for B2B quotes
  user_id               TEXT,     -- FK to users.id, set for B2C quotes
  client_name           TEXT,
  client_email          TEXT,
  client_phone          TEXT,
  country_code          TEXT,
  package_name          TEXT,
  travel_date           TEXT,
  total_price           REAL,
  -- Draft -> Sent -> Won | Lost. 'Won' is set by the convert endpoint.
  status                TEXT NOT NULL DEFAULT 'Draft',
  valid_until           TEXT,
  adults                INTEGER DEFAULT 0,
  cwb                   INTEGER DEFAULT 0,
  cnb                   INTEGER DEFAULT 0,
  vehicle_id            TEXT,
  hotel_category        TEXT,
  start_city            TEXT,
  end_city              TEXT,
  markup_percent            REAL,
  b2b_admin_margin_percent  REAL,
  offer_discount_per_pax    REAL DEFAULT 0,
  itinerary             TEXT,     -- JSON
  rooms                 TEXT,     -- JSON
  passengers            TEXT,     -- JSON
  notes                 TEXT,
  converted_booking_id  TEXT,     -- set when this quote became a booking
  last_sent_at          TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_agent ON quotes (agent_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user  ON quotes (user_id);
