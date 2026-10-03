const express = require('express');
const crypto = require('crypto');
const { all, one, run, db } = require('../db');
const { requireRole } = require('../auth');
const { listAdapters, getAdapter } = require('../suppliers');
const C = require('../catalog');

const router = express.Router();
router.use(requireRole('admin', 'staff'));

const newId = (prefix) => `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
const now = () => new Date().toISOString();

function bad(res, errors) {
  return res.status(400).json({ error: errors.join('. '), errors });
}

router.get('/suppliers', (req, res) => res.json(listAdapters()));

// ---------------------------------------------------------------- destinations
router.get('/destinations', async (req, res) => {
  const rows = await all('SELECT * FROM act_destinations ORDER BY sort_order, name');
  const counts = await all('SELECT destination_id, status, COUNT(*) AS n FROM act_products GROUP BY destination_id, status');
  res.json(rows.map((r) => ({
    ...C.destinationFromRow(r),
    published_products: counts.filter((c) => c.destination_id === r.id && c.status === 'published').reduce((s, c) => s + Number(c.n), 0),
    all_products: counts.filter((c) => c.destination_id === r.id).reduce((s, c) => s + Number(c.n), 0),
  })));
});

async function slugTaken(table, slug, exceptId) {
  const row = await one(`SELECT id FROM ${table} WHERE slug = ? AND id != ?`, [slug, exceptId || '']);
  return !!row;
}

router.post('/destinations', async (req, res) => {
  const { value, errors } = C.cleanDestination(req.body || {});
  if (errors.length) return bad(res, errors);
  if (await slugTaken('act_destinations', value.slug)) return bad(res, [`Another destination already uses the address "${value.slug}"`]);
  const id = newId('dst');
  const t = now();
  await run(
    `INSERT INTO act_destinations (id, slug, name, country, tagline, description, hero_image, tint, sort_order, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, value.slug, value.name, value.country, value.tagline, value.description, value.hero_image, value.tint, value.sort_order, value.published, t, t]
  );
  res.status(201).json(C.destinationFromRow(await one('SELECT * FROM act_destinations WHERE id = ?', [id])));
});

router.patch('/destinations/:id', async (req, res) => {
  const existing = await one('SELECT * FROM act_destinations WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { value, errors } = C.cleanDestination({ ...C.destinationFromRow(existing), ...(req.body || {}) });
  if (errors.length) return bad(res, errors);
  if (await slugTaken('act_destinations', value.slug, existing.id)) return bad(res, [`Another destination already uses the address "${value.slug}"`]);
  await run(
    `UPDATE act_destinations SET slug = ?, name = ?, country = ?, tagline = ?, description = ?, hero_image = ?, tint = ?,
       sort_order = ?, published = ?, updated_at = ? WHERE id = ?`,
    [value.slug, value.name, value.country, value.tagline, value.description, value.hero_image, value.tint, value.sort_order, value.published, now(), existing.id]
  );
  res.json(C.destinationFromRow(await one('SELECT * FROM act_destinations WHERE id = ?', [existing.id])));
});

router.delete('/destinations/:id', async (req, res) => {
  const used = await one('SELECT COUNT(*) AS n FROM act_products WHERE destination_id = ?', [req.params.id]);
  if (Number(used.n) > 0) {
    return res.status(409).json({ error: 'This destination still has products. Move or delete them first, or hide the destination instead.' });
  }
  await run('DELETE FROM act_destinations WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// -------------------------------------------------------------------- products
async function loadFull(id) {
  const r = await one('SELECT * FROM act_products WHERE id = ?', [id]);
  if (!r) return null;
  const d = await one('SELECT * FROM act_destinations WHERE id = ?', [r.destination_id]);
  const opts = await all('SELECT * FROM act_options WHERE product_id = ? ORDER BY sort_order', [id]);
  return C.productFromRow(r, opts, d, { withCost: true });
}

router.get('/products', async (req, res) => {
  const rows = await all('SELECT * FROM act_products ORDER BY updated_at DESC');
  const opts = await all('SELECT * FROM act_options ORDER BY sort_order');
  const dests = new Map((await all('SELECT * FROM act_destinations')).map((d) => [d.id, d]));
  res.json(rows.map((r) => {
    const p = C.productFromRow(r, opts.filter((o) => o.product_id === r.id), dests.get(r.destination_id), { withCost: true });
    return {
      id: p.id, slug: p.slug, title: p.title, category: p.category, status: p.status,
      destination: p.destination, fromPrice: p.fromPrice, optionCount: p.options.length,
      supplier: p.supplier, sample: !!p.attributes.sample, updatedAt: p.updatedAt,
    };
  }));
});

router.get('/products/:id', async (req, res) => {
  const p = await loadFull(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// Create or replace a product together with its options, in one go: the
// editor saves the whole form, so a half-saved product never exists.
async function saveProduct(req, res, existing) {
  const body = req.body || {};
  const { value, errors } = C.cleanProduct(body);
  const optionInputs = Array.isArray(body.options) ? body.options.slice(0, 40) : [];
  const options = optionInputs.map((o, i) => C.cleanOption(o || {}, i));
  options.forEach((o) => errors.push(...o.errors));
  if (errors.length) return bad(res, errors);
  if (!getAdapter(value.supplier)) return bad(res, ['Unknown supplier']);

  const destination = await one('SELECT * FROM act_destinations WHERE id = ?', [value.destination_id]);
  if (!destination) return bad(res, ['Choose a destination']);
  if (await slugTaken('act_products', value.slug, existing?.id)) {
    return bad(res, [`Another product already uses the address "${value.slug}"`]);
  }
  if (value.status === 'published') {
    const problems = C.publishProblems(value, options.map((o) => o.value), destination);
    if (problems.length) return bad(res, problems.map((p) => `Cannot publish: ${p}`));
  }

  const id = existing?.id || newId('prd');
  const t = now();
  const cols = Object.keys(value);
  const tx = await db().transaction('write');
  try {
    if (existing) {
      await tx.execute({
        sql: `UPDATE act_products SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`,
        args: [...cols.map((c) => value[c]), t, id],
      });
    } else {
      await tx.execute({
        sql: `INSERT INTO act_products (id, ${cols.join(', ')}, created_at, updated_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?)`,
        args: [id, ...cols.map((c) => value[c]), t, t],
      });
    }

    const before = (await tx.execute({ sql: 'SELECT id FROM act_options WHERE product_id = ?', args: [id] })).rows.map((r) => r.id);
    const kept = new Set();
    for (const { value: o } of options) {
      const optCols = Object.keys(o).filter((c) => c !== 'id');
      if (o.id && before.includes(o.id)) {
        kept.add(o.id);
        await tx.execute({
          sql: `UPDATE act_options SET ${optCols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND product_id = ?`,
          args: [...optCols.map((c) => o[c]), t, o.id, id],
        });
      } else {
        await tx.execute({
          sql: `INSERT INTO act_options (id, product_id, ${optCols.join(', ')}, created_at, updated_at)
                VALUES (?, ?, ${optCols.map(() => '?').join(', ')}, ?, ?)`,
          args: [newId('opt'), id, ...optCols.map((c) => o[c]), t, t],
        });
      }
    }
    // An option removed in the editor is deleted -- unless something was
    // booked on it, in which case it is only switched off so the booking
    // still points at a real row.
    for (const oldId of before.filter((x) => !kept.has(x))) {
      const used = (await tx.execute({ sql: 'SELECT COUNT(*) AS n FROM act_booking_items WHERE option_id = ?', args: [oldId] })).rows[0];
      if (Number(used.n) > 0) await tx.execute({ sql: 'UPDATE act_options SET active = 0, updated_at = ? WHERE id = ?', args: [t, oldId] });
      else await tx.execute({ sql: 'DELETE FROM act_options WHERE id = ?', args: [oldId] });
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  } finally {
    tx.close();
  }
  res.status(existing ? 200 : 201).json(await loadFull(id));
}

router.post('/products', (req, res) => saveProduct(req, res, null));

router.put('/products/:id', async (req, res) => {
  const existing = await one('SELECT id FROM act_products WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  return saveProduct(req, res, existing);
});

router.delete('/products/:id', async (req, res) => {
  const used = await one('SELECT COUNT(*) AS n FROM act_booking_items WHERE product_id = ?', [req.params.id]);
  if (Number(used.n) > 0) {
    await run("UPDATE act_products SET status = 'archived', updated_at = ? WHERE id = ?", [now(), req.params.id]);
    return res.json({ ok: true, archived: true });
  }
  await run('DELETE FROM act_options WHERE product_id = ?', [req.params.id]);
  await run('DELETE FROM act_products WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
