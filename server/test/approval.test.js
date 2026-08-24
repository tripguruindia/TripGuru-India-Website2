// ---------------------------------------------------------------------------
// Agent approval + GST number -- end-to-end against a real server.
//
// Run it with:   npm test        (from the server/ directory)
//
// It boots the actual Express app against a THROWAWAY libSQL file in the OS
// temp directory, so it never touches Turso and needs no credentials. The
// file, the server and the env vars all go away when the run finishes.
//
// The test that matters most is the last one: an admin rejects an agent who is
// already signed in, and his EXISTING token stops working straight away. That
// is what proves approval is read from the database on every write rather than
// trusted from a token that lasts 30 days.
// ---------------------------------------------------------------------------
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const PORT = 5399;
const BASE = `http://localhost:${PORT}/api/nepal`;
const DB_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tripguru-test-')), 'test.db');
const ENV = {
  ...process.env,
  TURSO_DATABASE_URL: 'file:' + DB_FILE,
  TURSO_AUTH_TOKEN: 'local',
  JWT_SECRET: 'test-secret-not-used-anywhere-real',
  PORT: String(PORT),
};

let passed = 0;
let failed = 0;
function ok(condition, label, detail = '') {
  if (condition) {
    passed += 1;
    console.log('  \x1b[32mPASS\x1b[0m  ' + label);
  } else {
    failed += 1;
    console.log('  \x1b[31mFAIL\x1b[0m  ' + label + (detail ? '   -> ' + detail : ''));
  }
}

async function api(method, route, body, token) {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* some routes legitimately return no body */
  }
  return { status: res.status, data };
}

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, '..', 'src', script)], { env: ENV });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(out))));
  });
}

async function waitForServer(attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(BASE + '/public/db');
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('API server did not come up');
}

(async () => {
  let server;
  try {
    await run('migrate.js');

    // One admin, created directly -- there is no public route that makes one.
    const db = createClient({ url: ENV.TURSO_DATABASE_URL, authToken: 'local' });
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, role, wallet_balance, created_at, approval_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['usr-admin', 'admin@test.local', bcrypt.hashSync('admin1', 10), 'admin', 0, new Date().toISOString(), 'approved'],
    });

    server = spawn('node', [path.join(__dirname, '..', 'src', 'index.js')], { env: ENV });
    server.stderr.on('data', (d) => process.stderr.write(d));
    await waitForServer();

    console.log('\nB2B signup demands a GST number');
    let r = await api('POST', '/auth/signup', { email: 'nogst@test.local', password: 'abc123', role: 'b2b', agencyName: 'No GST Ltd' });
    ok(r.status === 400 && /gstNumber/i.test(r.data?.error || ''), 'signup without a GST number is refused', JSON.stringify(r));

    console.log('\nA new agent account starts pending, and keeps its GST number');
    r = await api('POST', '/auth/signup', {
      email: 'agent@test.local', password: 'abc123', role: 'b2b',
      agencyName: 'Himalaya Tours', gstNumber: '09ABCDE1234F1Z5',
    });
    const agentToken = r.data?.token;
    ok(r.status === 201, 'signup succeeds');
    ok(r.data?.user?.approvalStatus === 'pending', 'the account is pending, not live', String(r.data?.user?.approvalStatus));
    ok(r.data?.user?.gstNumber === '09ABCDE1234F1Z5', 'the GST number is stored and returned');

    console.log('\nA pending agent cannot trade');
    r = await api('POST', '/bookings', { type: 'B2B', client_name: 'C', email: 'c@test.local', phone: '1', total_price: 19360, markup_percent: 10 }, agentToken);
    ok(r.status === 403, 'creating a booking is refused', JSON.stringify(r));
    r = await api('POST', '/quotes', { client_name: 'C', client_email: 'c@test.local', client_phone: '1', total_price: 1000 }, agentToken);
    ok(r.status === 403, 'creating a quote is refused', JSON.stringify(r));

    console.log('\nA pending agent cannot approve himself');
    r = await api('PATCH', '/auth/me', { approvalStatus: 'approved', approval_status: 'approved', fullName: 'Sneaky' }, agentToken);
    ok(r.data?.user?.approvalStatus === 'pending', 'still pending after editing his own profile', String(r.data?.user?.approvalStatus));

    console.log('\nTraveller accounts are untouched by any of this');
    r = await api('POST', '/auth/signup', { email: 'traveller@test.local', password: 'abc123', role: 'b2c' });
    ok(r.data?.user?.approvalStatus === 'approved', 'a B2C account is live the moment it is made');
    const travellerToken = r.data?.token;
    r = await api('POST', '/bookings', { type: 'B2C', client_name: 'T', email: 't@test.local', phone: '1', total_price: 5000 }, travellerToken);
    ok(r.status === 201, 'a B2C booking still goes through');

    console.log('\nThe admin queue, and approving');
    r = await api('POST', '/auth/login', { email: 'admin@test.local', password: 'admin1' });
    const adminToken = r.data?.token;
    r = await api('GET', '/admin/users', null, adminToken);
    const pending = (r.data || []).filter((u) => u.approvalStatus === 'pending');
    ok(pending.length === 1, 'the admin sees exactly one agent waiting');
    const agentId = pending[0]?.id;
    r = await api('PATCH', `/admin/users/${agentId}/approval`, { status: 'approved' }, adminToken);
    ok(r.status === 200 && r.data?.approvalStatus === 'approved', 'the approval is saved');

    console.log('\nThe agent can now trade -- on the token he already had');
    r = await api('POST', '/bookings', { type: 'B2B', client_name: 'C', email: 'c@test.local', phone: '1', total_price: 19360, markup_percent: 10 }, agentToken);
    ok(r.status === 201, 'the booking goes through on his original token');
    ok(r.data?.agent_commission === 1760, 'his markup on a 19,360 total at 10% is 1,760', String(r.data?.agent_commission));

    console.log('\nRejecting an agent stops him mid-session');
    r = await api('PATCH', `/admin/users/${agentId}/approval`, { status: 'rejected', note: 'Documents not verified' }, adminToken);
    ok(r.status === 200, 'the rejection is saved');
    r = await api('POST', '/bookings', { type: 'B2B', client_name: 'C', email: 'c@test.local', phone: '1', total_price: 1000, markup_percent: 10 }, agentToken);
    ok(r.status === 403, 'the SAME token is refused straight away', JSON.stringify(r));
    r = await api('GET', '/auth/me', null, agentToken);
    ok(r.data?.user?.approvalStatus === 'rejected', 'he can see that he was rejected');
    ok(r.data?.user?.approvalNote === 'Documents not verified', 'and the reason why');

    console.log(`\n  ${passed} passed, ${failed} failed\n`);
  } catch (err) {
    console.error('\nTest run failed to complete:\n', err);
    failed += 1;
  } finally {
    if (server) server.kill();
    fs.rmSync(path.dirname(DB_FILE), { recursive: true, force: true });
  }
  process.exit(failed ? 1 : 0);
})();
