const express = require('express');
const client = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { serializeWalletTransaction } = require('../serializers');

const router = express.Router();

async function all(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rs.rows;
}

async function one(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

// ---------------------------------------------------------------------------
// GET /wallet/mine -- an agent's own wallet: current balance (the cached
// running total on users.wallet_balance, kept in sync by
// POST /admin/users/:id/wallet) plus the full transaction history behind it.
// b2b only -- B2C travelers and admin accounts have no wallet.
// ---------------------------------------------------------------------------
router.get('/mine', requireAuth, requireRole('b2b'), async (req, res) => {
  const user = await one('SELECT wallet_balance FROM users WHERE id = ?', [req.user.id]);
  const rows = await all(
    'SELECT * FROM wallet_transactions WHERE agent_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({
    balance: user ? user.wallet_balance : 0,
    transactions: rows.map(serializeWalletTransaction),
  });
});

module.exports = router;
