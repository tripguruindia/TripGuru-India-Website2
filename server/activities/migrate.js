const fs = require('fs');
const path = require('path');
const { db } = require('./db');

// New columns on tables that already exist go here: CREATE TABLE IF NOT
// EXISTS will not add them. Each is an ALTER TABLE whose "duplicate column"
// error is swallowed, so it is safe to run on every boot.
const ADDITIVE_COLUMNS = [];

function statements() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return sql.split(';').map((s) => s.trim()).filter(Boolean);
}

async function migrate() {
  const client = db();
  for (const sql of statements()) await client.execute(sql);
  for (const sql of ADDITIVE_COLUMNS) {
    try {
      await client.execute(sql);
    } catch (err) {
      if (!/duplicate column/i.test(String(err.message))) throw err;
    }
  }
}

module.exports = { migrate };

if (require.main === module) {
  require('dotenv').config();
  migrate()
    .then(() => console.log('activities: schema up to date'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
