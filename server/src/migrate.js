// Applies db/schema.sql to the configured Turso database. Every statement
// is CREATE TABLE IF NOT EXISTS, so this is safe to run on every deploy
// (Render build step) -- there is no separate "migration history" to
// track for Phase 0's fixed schema.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const client = require('./db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  console.log('Applying db/schema.sql to Turso...');
  await client.executeMultiple(sql);
  console.log('Schema up to date.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => client.close());
