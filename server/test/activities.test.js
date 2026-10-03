// ---------------------------------------------------------------------------
// Activities section -- end-to-end against a real server.
//
// Run it with:   npm test        (from the server/ directory)
//
// Boots the actual Express app against a THROWAWAY libSQL file, exactly like
// approval.test.js: no Turso, no credentials, nothing left behind.
//
// What it guards: drafts never reach travellers; a product cannot go live
// without a price; destination addresses cannot collide with the section's
// own pages; and Admin is closed to anyone who is not staff -- including a
// Nepal portal token, which must not open this section.
// ---------------------------------------------------------------------------
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const jwt = require('jsonwebtoken');

const PORT = 5398;
const BASE = `http://localhost:${PORT}/api/activities`;
const DB_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'activities-test-')), 'test.db');
const ENV = {
  ...process.env,
  TURSO_DATABASE_URL: 'file:' + DB_FILE,
  TURSO_AUTH_TOKEN: 'local',
  JWT_SECRET: 'test-secret-not-used-anywhere-real',
  ACTIVITIES_ADMIN_EMAIL: 'Boss@Test.local',
  ACTIVITIES_ADMIN_PASSWORD: 'correct-horse-1',
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
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
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

async function waitForServer(attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(BASE + '/health');
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('API server did not come up');
}

const product = (destinationId, extra = {}) => ({
  title: 'Phi Phi Islands Day Trip by Speedboat',
  category: 'tour',
  destinationId,
  summary: 'A day on the water.',
  features: ['hotel_pickup', 'veg'],
  cancellationPolicy: { tiers: [{ hours: 24, refund: 100 }] },
  options: [{ name: 'Join-in', prices: { adult: 3200, child: 2400, senior: null }, cost: { adult: 2700 }, availability: { weekdays: [1, 3, 5] } }],
  ...extra,
});

(async () => {
  let server;
  try {
    await run('migrate.js');
    server = spawn('node', [path.join(__dirname, '..', 'src', 'index.js')], { env: ENV });
    server.stderr.on('data', (d) => process.stderr.write(d));
    await waitForServer();

    console.log('\nFirst boot');
    let r = await api('GET', '/public/destinations');
    ok(r.status === 200 && r.data.length === 8, 'the eight launch destinations are there', String(r.data?.length));
    ok(r.data.every((d) => d.productCount === 0), 'and the sample products are not counted -- they are drafts');
    r = await api('GET', '/public/products/sample-desert-safari-bbq-dinner');
    ok(r.status === 404, 'a draft sample cannot be opened by a traveller');
    r = await api('GET', '/public/products/sample-desert-safari-bbq-dinner?preview=1');
    ok(r.status === 404, 'not even with ?preview=1, without a staff login');

    console.log('\nThe first admin comes from env vars');
    r = await api('POST', '/auth/login', { email: 'boss@test.local', password: 'wrong' });
    ok(r.status === 401, 'a wrong password is refused');
    r = await api('POST', '/auth/login', { email: 'boss@test.local', password: 'correct-horse-1' });
    ok(r.status === 200 && r.data.user.role === 'admin', 'the right one signs in, email case ignored');
    const admin = r.data.token;

    console.log('\nAdmin is closed to everyone else');
    r = await api('GET', '/admin/products');
    ok(r.status === 401, 'no token: refused');
    const nepalToken = jwt.sign({ id: 'usr-admin', role: 'admin' }, ENV.JWT_SECRET);
    r = await api('GET', '/admin/products', null, nepalToken);
    ok(r.status === 401, 'a Nepal portal admin token does not open it');

    console.log('\nStaff can preview a draft');
    r = await api('GET', '/public/products/sample-desert-safari-bbq-dinner?preview=1', null, admin);
    ok(r.status === 200 && r.data.options.length === 2, 'the sample opens for the admin with both options');
    ok(r.data.supplierRef === undefined, 'the supplier reference is not sent to the page');
    ok(r.data.options.every((o) => o.cost === undefined), 'nor is what TripGuru pays the operator');

    console.log('\nCreating a product');
    const dests = (await api('GET', '/admin/destinations', null, admin)).data;
    const thailand = dests.find((d) => d.slug === 'thailand');
    r = await api('POST', '/admin/products', product(thailand.id, { status: 'published', options: [{ name: 'No price' }] }), admin);
    ok(r.status === 400 && /price/.test(r.data.error), 'it cannot be published without a price', JSON.stringify(r.data));
    r = await api('POST', '/admin/products', product(thailand.id, { status: 'published', category: 'insurance' }), admin);
    ok(r.status === 400 && /not open for sale/.test(r.data.error), 'nor in a category that is still Coming soon');
    r = await api('POST', '/admin/products', product(thailand.id, { status: 'published' }), admin);
    ok(r.status === 201, 'with a price it publishes', JSON.stringify(r.data));
    const created = r.data;
    ok(created.slug === 'phi-phi-islands-day-trip-by-speedboat', 'its web address is made from the title', created.slug);
    ok(created.options[0].prices.senior === null, 'a blank senior price stays "not sold", not zero');
    ok(created.options[0].cost.adult === 2700, 'Admin keeps the operator cost');
    r = await api('GET', '/public/products/phi-phi-islands-day-trip-by-speedboat');
    ok(r.status === 200 && r.data.options[0].cost === undefined, 'the live page never carries it');

    r = await api('GET', '/public/destinations/thailand');
    ok(r.data.products.length === 1, 'it appears on the Thailand page');
    ok(r.data.products[0].fromPrice.amount === 3200, 'with its "from" price');
    ok(r.data.products[0].freeCancellation === true, 'and free cancellation flagged');
    r = await api('GET', '/public/products?q=phi');
    ok(r.data.length === 1, 'search finds it');

    console.log('\nEditing keeps the option and its id');
    const optId = created.options[0].id;
    r = await api('PUT', `/admin/products/${created.id}`, {
      ...product(thailand.id, { status: 'published' }),
      options: [{ ...created.options[0], prices: { adult: 3500, child: 2400 } }, { name: 'Private boat', pricingUnit: 'per_unit', prices: { unit: 18000 } }],
    }, admin);
    ok(r.status === 200 && r.data.options.length === 2, 'saved with a second option', JSON.stringify(r.data));
    ok(r.data.options[0].id === optId && r.data.options[0].prices.adult === 3500, 'the first option was updated in place');
    r = await api('PUT', `/admin/products/${created.id}`, { ...product(thailand.id), options: [] }, admin);
    ok(r.status === 200 && r.data.options.length === 0 && r.data.status === 'draft', 'options can be removed when it goes back to draft');
    r = await api('GET', '/public/destinations/thailand');
    ok(r.data.products.length === 0, 'and a draft drops off the public page');

    console.log('\nWeb addresses');
    r = await api('POST', '/admin/destinations', { name: 'Search' }, admin);
    ok(r.status === 400, '"search" cannot be a destination -- the site uses it');
    r = await api('POST', '/admin/destinations', { name: 'Maldives', country: 'Maldives' }, admin);
    ok(r.status === 201 && r.data.slug === 'maldives', 'a normal destination is created');
    r = await api('POST', '/admin/destinations', { name: 'Maldives' }, admin);
    ok(r.status === 400, 'two destinations cannot share one address');
    r = await api('DELETE', `/admin/destinations/${thailand.id}`, null, admin);
    ok(r.status === 409, 'a destination with products cannot be deleted');

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
