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
