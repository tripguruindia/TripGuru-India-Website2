const { createClient } = require('@libsql/client');

// The activities section has its own database settings so it can move to its
// own database (and its own domain) by changing two env vars. Until those are
// set it shares the Nepal portal's Turso database -- every table here is
// prefixed act_, so nothing collides.
const url = process.env.ACTIVITIES_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.ACTIVITIES_DATABASE_TOKEN || process.env.TURSO_AUTH_TOKEN;

let client = null;
function db() {
  if (!client) {
    if (!url) throw new Error('No database configured for the activities section');
    client = createClient({ url, authToken });
  }
  return client;
}

async function all(sql, args = []) {
  const r = await db().execute({ sql, args });
  return r.rows;
}

async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

async function run(sql, args = []) {
  return db().execute({ sql, args });
}

module.exports = { db, all, one, run };
