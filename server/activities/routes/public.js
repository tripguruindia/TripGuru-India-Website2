const express = require('express');
const { all, one } = require('../db');
const { loadUser } = require('../auth');
const C = require('../catalog');

const router = express.Router();

async function optionsFor(productIds) {
  if (!productIds.length) return new Map();
  const rows = await all(
    `SELECT * FROM act_options WHERE product_id IN (${productIds.map(() => '?').join(',')}) ORDER BY sort_order`,
    productIds
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.product_id)) map.set(r.product_id, []);
    map.get(r.product_id).push(r);
  }
  return map;
}

// Cards for a set of product rows, with their destination attached.
async function cards(rows) {
  const opts = await optionsFor(rows.map((r) => r.id));
  const dests = new Map((await all('SELECT * FROM act_destinations')).map((d) => [d.id, d]));
  return rows.map((r) => C.productCard(C.productFromRow(r, opts.get(r.id) || [], dests.get(r.destination_id))));
}

router.get('/destinations', async (req, res) => {
  const rows = await all('SELECT * FROM act_destinations WHERE published = 1 ORDER BY sort_order, name');
  const counts = await all(
    `SELECT destination_id, category, COUNT(*) AS n FROM act_products WHERE status = 'published' GROUP BY destination_id, category`
  );
  res.json(rows.map((r) => {
    const mine = counts.filter((c) => c.destination_id === r.id);
    return {
      ...C.destinationFromRow(r),
      productCount: mine.reduce((s, c) => s + Number(c.n), 0),
      categoryCounts: Object.fromEntries(mine.map((c) => [c.category, Number(c.n)])),
    };
  }));
});

router.get('/destinations/:slug', async (req, res) => {
  const d = await one('SELECT * FROM act_destinations WHERE slug = ? AND published = 1', [req.params.slug]);
  if (!d) return res.status(404).json({ error: 'Destination not found' });
  const rows = await all(
    `SELECT * FROM act_products WHERE destination_id = ? AND status = 'published' ORDER BY sort_order, title`,
    [d.id]
  );
  res.json({ ...C.destinationFromRow(d), products: await cards(rows) });
});

// Listing with optional filters: ?destination=slug&category=tour&q=text
router.get('/products', async (req, res) => {
  const where = ["p.status = 'published'", 'd.published = 1'];
  const args = [];
  if (req.query.destination) {
    where.push('d.slug = ?');
    args.push(String(req.query.destination));
  }
  if (req.query.category) {
    where.push('p.category = ?');
    args.push(String(req.query.category));
  }
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q) {
    where.push('(p.title LIKE ? OR p.summary LIKE ? OR d.name LIKE ? OR d.country LIKE ? OR d.tagline LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like, like);
  }
  const rows = await all(
    `SELECT p.* FROM act_products p JOIN act_destinations d ON d.id = p.destination_id
     WHERE ${where.join(' AND ')} ORDER BY p.sort_order, p.title LIMIT 200`,
    args
  );
  res.json(await cards(rows));
});

// One product. Drafts are visible only to staff, through ?preview=1, so the
// team can check a product before it goes live.
router.get('/products/:slug', async (req, res) => {
  const r = await one('SELECT * FROM act_products WHERE slug = ?', [req.params.slug]);
  let visible = r && r.status === 'published';
  if (r && !visible && req.query.preview) {
    const user = await loadUser(req);
    visible = !!user && ['admin', 'staff'].includes(user.role);
  }
  if (!visible) return res.status(404).json({ error: 'Not found' });
  const d = await one('SELECT * FROM act_destinations WHERE id = ?', [r.destination_id]);
  const opts = await all('SELECT * FROM act_options WHERE product_id = ? ORDER BY sort_order', [r.id]);
  const product = C.productFromRow(r, opts, d);
  delete product.supplierRef;
  const related = await all(
    `SELECT * FROM act_products WHERE destination_id = ? AND status = 'published' AND id != ? ORDER BY sort_order LIMIT 4`,
    [r.destination_id, r.id]
  );
  res.json({ ...product, related: await cards(related) });
});

module.exports = router;
