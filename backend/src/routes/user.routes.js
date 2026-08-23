import { Router } from 'express';
import { query } from '../config/db.js';
import { protect } from '../middleware/auth.middleware.js';
import Sale from '../models/sale.model.js';

const router = Router();

import Product from '../models/product.model.js';

// GET /api/users/orders — buyer's order history
router.get('/orders', protect, async (req, res, next) => {
  try {
    const orders = await Sale.find({ user_id: req.user.id })
      .sort({ purchase_ts: -1 })
      .limit(50)
      .lean();

    // Map to the format the frontend expects (or similar)
    const formattedOrders = orders.map(o => ({
      id: o.sale_id,
      order_number: o.sale_id,
      total_amount: o.price * (o.quantity || 1),
      payment_status: o.status,
      status: o.status,
      payment_method: 'wallet',
      credentials: o.credentials || '',
      paid_at: new Date(o.purchase_ts * 1000).toISOString(),
      created_at: new Date(o.purchase_ts * 1000).toISOString(),
      items: [{
        title: o.product_name,
        price: o.price,
        delivered_content: o.credentials,
        variant_name: o.variant_name
      }]
    }));

    res.json({ orders: formattedOrders });
  } catch (err) { next(err); }
});

// GET /api/users/orders/:id — single order receipt & credentials detail
router.get('/orders/:id', protect, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const sale = await Sale.findOne({ sale_id: orderId }).lean();
    if (!sale) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ensure authorized user (or admin)
    if (sale.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to view this order' });
    }

    // Fetch live product for rules and media
    const product = await Product.findById(sale.product_id).lean();
    const rules = product?.rules || sale.admin_notes || 'Follow all standard login guidelines.';

    const formatted = {
      order_id: sale.sale_id,
      id: sale.sale_id,
      product_id: sale.product_id,
      product_name: sale.product_name,
      variant_name: sale.variant_name,
      pool_id: sale.pool_id,
      status: sale.status,
      price: sale.price,
      quantity: sale.quantity || 1,
      total_amount: sale.price * (sale.quantity || 1),
      credentials: sale.credentials || '',
      rules: rules,
      purchase_ts: sale.purchase_ts,
      purchase_date: new Date(sale.purchase_ts * 1000).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      end_ts: sale.end_ts,
      expiry_date: sale.end_ts
        ? new Date(sale.end_ts * 1000).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Lifetime / Non-expiring',
      user_email: sale.user_email || req.user.email,
      user_name: sale.user_name || req.user.name,
      images: product?.website_meta?.images || [],
      delivery_process: product?.delivery_process || 'auto',
      delivery_time: product?.delivery_time || 'Instant',
      support_username: 'qxdbotowner',
    };

    res.json({ success: true, order: formatted });
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
