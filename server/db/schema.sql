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
  name TEXT NOT NULL UNIQUE,
  -- 'nepal' | 'india'. Which side of the border the city is on, which decides
  -- what kind of vehicle can run the trip: a run that starts AND ends in India
  -- is an Indian vehicle, one that stays inside Nepal is a Nepali one.
  -- Defaults to 'nepal' because all but a handful of border towns are.
  country TEXT NOT NULL DEFAULT 'nepal'
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
  route_rates            TEXT NOT NULL, -- JSON: {routeKey: number}
  -- 'nepal' | 'india'. An Indian vehicle is hired from a border town for the
  -- whole trip and is quoted ONLY from vehicle_packages -- it has no sector
  -- rates at all, so route_rates stays empty for one. A Nepali vehicle is
  -- picked up inside Nepal and can be priced either way.
  origin                 TEXT NOT NULL DEFAULT 'nepal'
);

CREATE TABLE IF NOT EXISTS routes (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);

-- Most activities are sold per head (an entry ticket, a paraglide), so
-- price_adult/price_child multiply by the party size. A full-day local
-- sightseeing run is not: it is one vehicle out for one day, and it costs
-- what that vehicle costs whether two people ride in it or twelve. Those
-- carry pricing_mode = 'per_vehicle' and are charged once from vehicle_rates,
-- keyed by vehicle id, ignoring price_adult/price_child entirely.
--
-- Both columns are added via ADDITIVE_COLUMNS in migrate.js -- this table
-- predates them on the live database.
-- Per-city defaults for a freshly built day: which hotel to put a party in at
-- each star rating, what meal plan to assume, and which activities to include
-- on each successive night in that city.
--
-- Keyed by city NAME rather than cities.id: every other table (hotels,
-- activities, days on a saved itinerary) refers to a city by its name, and a
-- second way of identifying a city is a second thing to keep in step.
--
-- night_plans is keyed by the night's INDEX within the stay, not by the length
-- of the stay: {"1": [...], "2": [...]}. A three-night stay takes nights 1, 2
-- and 3, so adding a fourth night later does not mean re-entering the first
-- three. It also handles the arrival day naturally -- night 1 light, night 2
-- the full sightseeing run.
--
-- Everything here is OPTIONAL. A city with no row, or a row with a field
-- unset, falls back to exactly what the builder did before this table existed,
-- so nothing changes until it is filled in from Admin.
CREATE TABLE IF NOT EXISTS city_defaults (
  city           TEXT PRIMARY KEY,
  -- JSON {"3-Star": "h-ktm-3", "4-Star": "h-ktm-4"} -- hotel id per rating.
  default_hotels TEXT,
  -- 'CP' | 'MAP' | 'AP'. Null means fall back to the old built-in rule.
  default_meals  TEXT,
  -- JSON {"1": ["a-id", ...], "2": [...]} keyed by night index within the stay.
  night_plans    TEXT
);

-- A whole-trip rate for the vehicle, instead of adding up sector by sector.
--
-- How Nepal actually works: a party leaves an Indian border town (Gorakhpur,
-- Raxaul) in an Indian vehicle, tours Nepal, and the same vehicle brings them
-- back to a border town -- so the vehicle is hired for the trip, not for each
-- leg, and the empty return run is part of what is being paid for. The other
-- case is a Nepali vehicle picked up inside Nepal. Both are quoted as a
-- package: "Hiace, Gorakhpur to Gorakhpur, Kathmandu + Pokhara, 6 days".
--
-- `cities` is the set of OVERNIGHT cities, stored as a JSON array. Matching is
-- order-independent -- Kathmandu then Pokhara is the same road as Pokhara then
-- Kathmandu -- so one row covers a circuit however the agent enters it.
-- Somewhere visited for a few hours without an overnight is NOT part of the
-- key; it is charged as its own extra, like any other detour.
--
-- No row for a combination means the trip prices sector by sector exactly as
-- it always did, and the builder says so rather than failing quietly.
CREATE TABLE IF NOT EXISTS vehicle_packages (
  id         TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  start_city TEXT NOT NULL,
  end_city   TEXT NOT NULL,
  cities     TEXT NOT NULL, -- JSON array of overnight city names
  days       INTEGER NOT NULL,
  rate       REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS activities (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  city        TEXT,
  description TEXT,
  price_adult  REAL,
  price_child  REAL,
  pricing_mode TEXT NOT NULL DEFAULT 'per_person', -- 'per_person' | 'per_vehicle'
  vehicle_rates TEXT, -- JSON: {vehicleId: number}, used when per_vehicle
  -- Already paid for when the trip is on a whole-trip vehicle package? The
  -- basic local sightseeing a package covers is 1; a genuine extra run such
  -- as Sarangkot at sunrise is 0 and still charges on top.
  covered_by_vehicle_package INTEGER NOT NULL DEFAULT 1
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
  tax_percent               REAL NOT NULL DEFAULT 5,
  -- Whether GST is charged at all. Separate from a 0% rate on purpose: with
  -- this off the quote prints no GST line, so nothing claims a tax was
  -- collected. Existing rows default to 1 so nothing changes on migrate.
  tax_enabled               INTEGER NOT NULL DEFAULT 1,
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
  -- Data URL of the agency's own logo, shown on the vouchers they send their
  -- clients. Added via ADDITIVE_COLUMNS for databases that predate it.
  agency_logo    TEXT,
  -- Whether this account may actually trade. A B2B signup creates a 'pending'
  -- account that an admin has to approve before it can quote or book; every
  -- other account (B2C, admin, and every account that predates this column)
  -- is 'approved', which is why the default is not 'pending'. Rejecting an
  -- agent sets 'rejected' and, optionally, a reason in approval_note.
  approval_status TEXT NOT NULL DEFAULT 'approved',
  approval_note   TEXT,
  -- The agency's GST registration number, collected at B2B signup but
  -- OPTIONAL -- an agent may register without one and add it later from his
  -- profile. Shown in the agent's profile and on the internal copy of the
  -- voucher only.
  gst_number     TEXT,
  wallet_balance REAL NOT NULL DEFAULT 0,
  address        TEXT,
  created_at     TEXT NOT NULL
);

-- Airports. Deliberately NOT a column on `cities`: one airport can serve
-- several cities (Bhairahawa/Gautam Buddha serves Lumbini, Butwal and
-- Bhairahawa), and an airport's name often differs from the city it serves
-- (Chitwan is served by Bharatpur Airport). `cities` is a JSON array of the
-- city names this airport serves.
--
-- The airport↔hotel transfer PRICE is not stored here -- it lives in
-- vehicles.route_rates under the per-city key `<citykey>_airport_transfer`,
-- because the drive from one shared airport differs per city. This table
-- only answers "does this city have air access, and via which airport",
-- which is what decides whether the quote builder offers a flight leg.
CREATE TABLE IF NOT EXISTS airports (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  code   TEXT,
  cities TEXT NOT NULL -- JSON array of city names served
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

-- Wallet ledger: the real credit/debit history behind an agent's wallet
-- balance (users.wallet_balance is a cached running total, kept in sync by
-- the /admin/users/:id/wallet endpoint that writes this table -- it is never
-- set directly). Entries are added by an admin only; there is no automatic
-- crediting on booking creation, since a booking's commission isn't
-- necessarily paid out yet.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id         TEXT PRIMARY KEY,
  agent_id   TEXT NOT NULL, -- FK to users.id
  type       TEXT NOT NULL, -- 'credit' | 'debit'
  amount     REAL NOT NULL, -- always positive; sign implied by type
  reason     TEXT NOT NULL,
  created_by TEXT,          -- FK to users.id, the admin who logged it
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_agent ON wallet_transactions (agent_id);
