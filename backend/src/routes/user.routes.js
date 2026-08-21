import { Router } from 'express';
import { query } from '../config/db.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/users/orders — buyer's order history
router.get('/orders', protect, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT o.id, o.order_number, o.total_amount, o.payment_status, o.payment_method, o.paid_at, o.created_at,
             json_agg(json_build_object(
               'title', oi.product_title, 'price', oi.price,
               'download_token', oi.download_token, 'download_token_expires', oi.download_token_expires,
               'delivered_content', oi.delivered_content, 'download_count', oi.download_count
             )) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id=o.id
      WHERE o.buyer_id=$1
      GROUP BY o.id ORDER BY o.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json({ orders: rows });
  } catch (err) { next(err); }
});

// GET /api/users/profile
router.get('/profile', protect, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id,name,email,role,avatar_url,balance,currency,all_time_topup,telegram_username,created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res, next) => {
  try {
    const { name, telegram_username, currency } = req.body;
    const { rows } = await query(
      'UPDATE users SET name=COALESCE($1,name), telegram_username=COALESCE($2,telegram_username), currency=COALESCE($3,currency), updated_at=NOW() WHERE id=$4 RETURNING id,name,email,currency,telegram_username',
      [name, telegram_username, currency, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/users/wallet/topup — Initiate Cashfree / Crypto topup
router.post('/wallet/topup', protect, async (req, res, next) => {
  try {
    const { amount, payment_method } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount' });
    }

    if (payment_method === 'cashfree') {
      const { createCashfreeOrder } = await import('../services/cashfree.service.js');
      const orderId = `TOPUP_${Date.now()}_${String(req.user.id).slice(0, 6)}`;
      const cfRes = await createCashfreeOrder({
        orderId,
        orderAmount: numAmount,
        customerEmail: req.user.email,
        returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?topup_status=check&order_id=${orderId}&amount=${numAmount}`,
      });

      if (cfRes.success && cfRes.paymentLink) {
        return res.json({
          success: true,
          orderId,
          payment_link: cfRes.paymentLink,
        });
      }
      return res.status(500).json({ error: cfRes.error || 'Failed to initiate Cashfree topup' });
    }

    if (payment_method === 'nowpayments') {
      const { createCryptoInvoice } = await import('../services/nowpayments.service.js');
      const orderId = `TOPUP_${Date.now()}_${String(req.user.id).slice(0, 6)}`;
      const { invoiceUrl, invoiceId } = await createCryptoInvoice({ orderId, amountINR: numAmount });
      return res.json({
        success: true,
        orderId: invoiceId,
        invoice_url: invoiceUrl,
      });
    }

    // Direct simulation credit for testing
    const { rows } = await query(
      'UPDATE users SET balance = balance + $1, all_time_topup = all_time_topup + $1 WHERE id=$2 RETURNING balance',
      [numAmount, req.user.id]
    );
    res.json({ success: true, balance: parseFloat(rows[0]?.balance || numAmount), message: `₹${numAmount} credited to wallet!` });
  } catch (err) { next(err); }
});

export default router;
