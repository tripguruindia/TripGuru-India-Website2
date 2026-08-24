// Applies db/schema.sql to the configured Turso database. Every statement
// is CREATE TABLE IF NOT EXISTS, so this is safe to run on every deploy
// (Render build step) -- there is no separate "migration history" to
// track for Phase 0's fixed schema.
//
// Phase 2 (B2C/B2B wiring) added a `bookings.user_id` column. CREATE TABLE
// IF NOT EXISTS doesn't add columns to a table that already exists (the
// live database's `bookings` table predates this column), so that one
// column needs an explicit additive ALTER TABLE below. It's wrapped so a
// "duplicate column" error (the column already exists, from a prior run)
// is swallowed -- any other error still fails the migration -- keeping
// this safe to re-run on every deploy like the rest of this file.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const client = require('./db');

const ADDITIVE_COLUMNS = [
  { table: 'bookings', column: 'user_id', ddl: 'ALTER TABLE bookings ADD COLUMN user_id TEXT' },
  // Whole-vehicle activities (full-day local sightseeing): charged once from
  // vehicle_rates rather than per head. See the activities comment in
  // schema.sql. Existing rows default to per_person, so nothing reprices.
  {
    table: 'activities',
    column: 'pricing_mode',
    ddl: "ALTER TABLE activities ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'per_person'",
  },
  { table: 'activities', column: 'vehicle_rates', ddl: 'ALTER TABLE activities ADD COLUMN vehicle_rates TEXT' },
  // Charging GST is now a switch, not just a rate. Defaults to 1 so the live
  // settings row keeps charging GST exactly as it did before this column
  // existed -- turning it off has to be a deliberate act in Admin.
  {
    table: 'settings',
    column: 'tax_enabled',
    ddl: 'ALTER TABLE settings ADD COLUMN tax_enabled INTEGER NOT NULL DEFAULT 1',
  },
  // An agent's own logo, so their branding follows the account rather than
  // living in one browser's localStorage.
  { table: 'users', column: 'agency_logo', ddl: 'ALTER TABLE users ADD COLUMN agency_logo TEXT' },
  // A B2B account has to be approved by an admin before it can trade. The
  // default is 'approved', NOT 'pending': every account that already exists
  // when this column arrives is a real, working account, and defaulting to
  // pending would lock every current agent out of the portal on deploy.
  // Only a fresh B2B signup writes 'pending', and it does so explicitly.
  {
    table: 'users',
    column: 'approval_status',
    ddl: "ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'",
  },
  { table: 'users', column: 'approval_note', ddl: 'ALTER TABLE users ADD COLUMN approval_note TEXT' },
  // GST registration number, collected at B2B signup.
  { table: 'users', column: 'gst_number', ddl: 'ALTER TABLE users ADD COLUMN gst_number TEXT' },
  // Whether a vehicle-billed activity is already paid for when the trip is on
  // a whole-trip vehicle package. Defaults to 1 (covered), because the basic
  // local sightseeing a package includes is the common case -- only genuine
  // extras (an early Sarangkot run, a Pumdikot detour) are marked otherwise.
  // Irrelevant until a package rate exists, so this changes no live price.
  {
    table: 'activities',
    column: 'covered_by_vehicle_package',
    ddl: 'ALTER TABLE activities ADD COLUMN covered_by_vehicle_package INTEGER NOT NULL DEFAULT 1',
  },
];

async function applyAdditiveColumns() {
  for (const { table, column, ddl } of ADDITIVE_COLUMNS) {
    try {
      await client.execute(ddl);
      console.log(`Added column ${table}.${column}.`);
    } catch (err) {
      if (/duplicate column name/i.test(err.message || '')) {
        console.log(`Column ${table}.${column} already exists, skipping.`);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  console.log('Applying db/schema.sql to Turso...');
  await client.executeMultiple(sql);
  await applyAdditiveColumns();
  console.log('Schema up to date.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => client.close());
