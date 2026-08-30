import { Router } from 'express';
import { query } from '../config/db.js';
import { protect } from '../middleware/auth.middleware.js';
import Sale from '../models/sale.model.js';

const router = Router();

import Product from '../models/product.model.js';

// GET /api/users/orders — buyer's order history
router.get('/orders', protect, async (req, res, next) => {
  try {
    const sales = await Sale.find({
      $or: [
        { user_id: req.user.id },
        { user_email: req.user.email?.toLowerCase() }
      ]
    })
      .sort({ purchase_ts: -1 })
      .limit(50)
      .lean();

    const { rows: sqlOrders } = await query(
      'SELECT * FROM orders WHERE buyer_id=$1 OR buyer_email=$2 ORDER BY created_at DESC LIMIT 50',
      [req.user.id, req.user.email]
    );

    const saleIds = new Set(sales.map(s => s.sale_id));
    const mergedOrders = [];

    // 1. Add MongoDB sales
    sales.forEach(s => {
      mergedOrders.push({
        id: s.sale_id,
        order_number: s.sale_id,
        total_amount: s.price * (s.quantity || 1),
        payment_status: s.status,
        status: s.status,
        delivery_method: s.delivery_method || 'instant',
        payment_method: s.payment_method || 'Online',
        credentials: s.credentials || '',
        paid_at: new Date(s.purchase_ts * 1000).toISOString(),
        created_at: new Date(s.purchase_ts * 1000).toISOString(),
        items: [{
          title: s.product_name,
          price: s.price,
          delivered_content: s.credentials,
          variant_name: s.variant_name
        }]
      });
    });

    // 2. Add any SQL orders not yet in sales list
    (sqlOrders || []).forEach(ord => {
      if (!saleIds.has(ord.id) && !saleIds.has(ord.sale_id)) {
        mergedOrders.push({
          id: ord.id,
          order_number: ord.order_number || ord.id,
          total_amount: ord.total_amount,
          payment_status: ord.order_status || (ord.payment_status === 'paid' ? 'Delivered' : ord.payment_status === 'under_review' ? 'Pending' : 'Processing'),
          status: ord.order_status || (ord.payment_status === 'paid' ? 'Delivered' : ord.payment_status === 'under_review' ? 'Pending' : 'Processing'),
          payment_method: ord.payment_method || 'Online',
          credentials: ord.delivered_items || '',
          paid_at: ord.paid_at || ord.created_at,
          created_at: ord.created_at || new Date().toISOString(),
          items: [{
            title: ord.product_title || 'Digital Product',
            price: ord.total_amount,
            delivered_content: ord.delivered_items,
            variant_name: ord.variant_name || 'Standard'
          }]
        });
      }
    });

    // Sort newest first
    mergedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ orders: mergedOrders });
  } catch (err) { next(err); }
});

// GET /api/users/orders/:id — single order receipt & credentials detail
router.get('/orders/:id', protect, async (req, res, next) => {
  try {
    const orderId = req.params.id;
    let sale = await Sale.findOne({ sale_id: orderId }).lean();

    if (!sale) {
      // Check SQL orders table
      const { rows } = await query(
        'SELECT * FROM orders WHERE id=$1 OR order_number=$1 OR sale_id=$1',
        [orderId]
      );
      if (rows && rows[0]) {
        const ord = rows[0];
        // If order was paid but sale record wasn't created, fulfill now
        if (ord.payment_status === 'paid' && !ord.sale_id) {
          const { fulfillPaidOrder } = await import('../controllers/payment.controller.js');
          const result = await fulfillPaidOrder(ord.id);
          sale = await Sale.findOne({ sale_id: result.sale_id || ord.id }).lean();
        } else if (ord.sale_id) {
          sale = await Sale.findOne({ sale_id: ord.sale_id }).lean();
        }

        if (!sale) {
          // Construct fallback sale representation from orders table
          const product = await Product.findById(ord.meta_product_id).lean();
          const rules = product?.rules || 'Follow all standard login guidelines.';
          return res.json({
            success: true,
            order: {
              order_id: ord.id,
              id: ord.id,
              order_number: ord.order_number || ord.id,
              product_id: ord.meta_product_id,
              product_name: product?.name || 'Digital Product',
              variant_name: 'Standard',
              status: ord.order_status || (ord.payment_status === 'paid' ? 'Delivered' : ord.payment_status === 'under_review' ? 'Pending' : 'Processing'),
              price: ord.total_amount,
              quantity: ord.meta_qty || 1,
              total_amount: ord.total_amount,
              credentials: ord.delivered_items || '',
              rules: rules,
              purchase_ts: Math.floor(new Date(ord.created_at || Date.now()).getTime() / 1000),
              purchase_date: new Date(ord.created_at || Date.now()).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              user_email: ord.buyer_email || req.user.email,
              user_name: req.user.name,
              images: product?.website_meta?.images || [],
              delivery_process: product?.delivery_process || 'auto',
              delivery_time: product?.delivery_time || 'Instant',
              support_username: 'qxdbotowner',
            }
          });
        }
      }
    }

    if (!sale) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Ensure authorized user (or admin)
    // For guest orders: allow access if the sale's email matches the logged-in user's email
    const isOwner = sale.user_id === req.user.id;
    const isEmailMatch = sale.user_email?.toLowerCase() === req.user.email?.toLowerCase();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isEmailMatch && !isAdmin) {
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

// GET /api/users/deposits
router.get('/deposits', protect, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, user_id, amount, currency, gateway, transaction_id, status, created_at FROM deposits WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ success: true, deposits: rows || [] });
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

// POST /api/users/wallet/topup — Initiate Cashfree / Crypto / UPI / Binance topup
router.post('/wallet/topup', protect, async (req, res, next) => {
  try {
    const { amount, payment_method } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount' });
    }

    const { getPaymentSettings } = await import('../services/paymentSettings.service.js');
    const settings = await getPaymentSettings();

    if (payment_method === 'cashfree') {
      const { createCashfreeOrder } = await import('../services/cashfree.service.js');
      const orderId = `TOPUP_${Date.now()}_${String(req.user.id).slice(0, 6)}`;
      const cfRes = await createCashfreeOrder({
        orderId,
        orderAmount: numAmount,
        customerEmail: req.user.email,
        returnUrl: `${process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://quantumxd.store'}/api/payments/cashfree/return?order_id=${orderId}&amount=${numAmount}`,
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

    if (payment_method === 'upi_qr' || payment_method === 'upi') {
      const upiConfig = settings.upi_qr || {};
      const orderId = `TOPUP_UPI_${Date.now()}_${String(req.user.id).slice(0, 6)}`;
      return res.json({
        success: true,
        orderId,
        upi_id: upiConfig.upi_id || 'quantumxd@upi',
        merchant_name: upiConfig.merchant_name || 'QuantumXD Store',
        qr_image_url: upiConfig.qr_image_url || '/upi-qr.png',
        amount: numAmount,
        instructions: upiConfig.instructions || 'Pay to UPI ID or QR, then submit your 12-digit UTR.'
      });
    }

    if (payment_method === 'binance') {
      const binanceConfig = settings.binance || {};
      const orderId = `TOPUP_BINANCE_${Date.now()}_${String(req.user.id).slice(0, 6)}`;
      return res.json({
        success: true,
        orderId,
        binance_pay_id: binanceConfig.binance_pay_id || '1133813547',
        amount: numAmount,
        instructions: binanceConfig.instructions || 'Transfer via Binance Pay ID, then submit your Transaction ID.'
      });
    }

    // Direct simulation credit fallback for test
    const { rows } = await query(
      'UPDATE users SET balance = balance + $1, all_time_topup = all_time_topup + $1 WHERE id=$2 RETURNING balance',
      [numAmount, req.user.id]
    );
    res.json({ success: true, balance: parseFloat(rows[0]?.balance || numAmount), message: `₹${numAmount} credited to wallet!` });
  } catch (err) { next(err); }
});

// POST /api/users/wallet/submit-manual-deposit
router.post('/wallet/submit-manual-deposit', protect, async (req, res, next) => {
  try {
    const { order_id, transaction_id, gateway, amount } = req.body;
    if (!transaction_id || !String(transaction_id).trim()) {
      return res.status(400).json({ error: 'Please enter your Transaction / UTR ID' });
    }

    const depId = `dep-${Date.now()}`;
    await query(
      `INSERT INTO deposits (id, user_id, amount, currency, gateway, transaction_id, status, created_at)
       VALUES ($1, $2, $3, 'INR', $4, $5, 'pending', NOW())`,
      [depId, req.user.id, parseFloat(amount || 0), gateway || 'upi', String(transaction_id).trim()]
    );

    res.json({
      success: true,
      message: 'Deposit proof submitted! It will be verified and credited to your wallet shortly.'
    });
  } catch (err) { next(err); }
});

export default router;
