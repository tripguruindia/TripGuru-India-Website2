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

-- Read-only via the admin API in Phase 0; write path lands with B2C/B2B wiring.
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
  -- Real FK to users.id once bookings are created server-side (Phase 2).
  -- The legacy client hardcodes a fake agent id today -- see server/README.md.
  agent_id                  TEXT,
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
  b2b_white_label            TEXT  -- JSON
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
