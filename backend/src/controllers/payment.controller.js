import { query } from '../config/db.js';
import { createCryptoInvoice } from '../services/nowpayments.service.js';
import { processBinanceOrder } from '../services/binance.service.js';
import { createCashfreeOrder, checkCashfreeStatus } from '../services/cashfree.service.js';
import { sendOrderConfirmationEmail } from '../services/email.service.js';
import axios from 'axios';

// GET USD→INR rate (cached in DB, refreshed every hour)
async function getUsdToInrRate() {
  const { rows } = await query(
    "SELECT rate, fetched_at FROM exchange_rate_cache WHERE from_currency='USD' AND to_currency='INR'"
  );
  const stale = !rows[0] || (Date.now() - new Date(rows[0].fetched_at).getTime()) > 3600000;

  if (stale) {
    try {
      const { data } = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
      const rate = data.rates?.INR || 84;
      await query(`
        INSERT INTO exchange_rate_cache (from_currency, to_currency, rate, fetched_at)
        VALUES ('USD','INR',$1,NOW())
        ON CONFLICT (from_currency,to_currency) DO UPDATE SET rate=$1, fetched_at=NOW()
      `, [rate]);
      return rate;
    } catch { return rows[0]?.rate || 84; }
  }
  return parseFloat(rows[0].rate);
}

function generateOrderNumber() {
  return 'QXD' + Date.now().toString(36).toUpperCase();
}

// POST /api/payments/initiate
export const initiatePayment = async (req, res, next) => {
  try {
    const { items, payment_method, coupon_code, email } = req.body;
    if (!items?.length || !payment_method) return res.status(400).json({ error: 'Items and payment_method required' });
    if (!['cashfree', 'nowpayments', 'binance', 'wallet', 'upi'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Fetch product prices
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      let price, title, variantName, deliveredContent, stockKey;

      if (item.variant_id) {
        const { rows } = await query(`
          SELECT pv.*, p.title, p.is_infinite_stock AS p_infinite, p.infinite_stock_item AS p_item
          FROM product_variants pv JOIN products p ON p.id=pv.product_id
          WHERE pv.id=$1 AND p.status='active'
        `, [item.variant_id]);
        if (!rows[0]) return res.status(404).json({ error: `Variant ${item.variant_id} not found` });
        const v = rows[0];
        price = parseFloat(v.price);
        title = v.title;
        variantName = v.name;

        // Get stock item
        if (v.is_infinite_stock && v.infinite_stock_item) {
          deliveredContent = v.infinite_stock_item;
        } else if (v.stock_keys?.length) {
          stockKey = v.stock_keys[0];
          deliveredContent = stockKey;
          await query('UPDATE product_variants SET stock_keys=stock_keys[2:] WHERE id=$1', [item.variant_id]);
        } else {
          return res.status(400).json({ error: `Out of stock: ${v.name}` });
        }
      } else {
        const { rows } = await query(`
          SELECT * FROM products WHERE id=$1 AND status='active'
        `, [item.product_id]);
        if (!rows[0]) return res.status(404).json({ error: `Product ${item.product_id} not found` });
        const p = rows[0];
        price = parseFloat(p.sale_price || p.price);
        title = p.title;

        if (p.is_infinite_stock && p.infinite_stock_item) {
          deliveredContent = p.infinite_stock_item;
        } else if (p.stock_keys?.length) {
          deliveredContent = p.stock_keys[0];
          await query('UPDATE products SET stock_keys=stock_keys[2:] WHERE id=$1', [item.product_id]);
        }
      }

      totalAmount += price;
      orderItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        product_title: title,
        variant_name: variantName || null,
        price,
        delivered_content: deliveredContent || null,
      });
    }

    // Coupon validation
    let discountAmount = 0;
    if (coupon_code) {
      const { rows } = await query(`
        SELECT * FROM coupons WHERE code=$1 AND is_active=true
          AND (expires_at IS NULL OR expires_at > NOW())
          AND used_count < max_uses
      `, [coupon_code.toUpperCase()]);
      if (rows[0]) {
        const c = rows[0];
        if (totalAmount >= parseFloat(c.min_order_amount || 0)) {
          discountAmount = c.discount_type === 'percent'
            ? totalAmount * (parseFloat(c.discount_value) / 100)
            : parseFloat(c.discount_value);
          discountAmount = Math.min(discountAmount, totalAmount);
          await query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [c.id]);
        }
      }
    }

    const finalAmount = parseFloat((totalAmount - discountAmount).toFixed(2));
    const usdToInr = await getUsdToInrRate();
    const orderNumber = generateOrderNumber();
    let timeoutMinutes = 60;
    let paymentStatus = 'pending';

    // 1. Check if Wallet Payment
    if (payment_method === 'wallet') {
      if (!req.user) return res.status(401).json({ error: 'Please login to pay with wallet balance' });
      const { rows: uRows } = await query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
      const currentBalance = parseFloat(uRows[0]?.balance || 0);
      if (currentBalance < finalAmount) {
        return res.status(400).json({ error: `Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Please top up first.` });
      }
      // Deduct balance
      await query('UPDATE users SET balance = balance - $1 WHERE id=$2', [finalAmount, req.user.id]);
      paymentStatus = 'paid';
    }

    if (payment_method === 'nowpayments') {
      timeoutMinutes = parseInt(process.env.CRYPTO_TIMEOUT_MINUTES || 180);
    }

    const timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Create order in DB
    const { rows: orderRows } = await query(`
      INSERT INTO orders (order_number, buyer_id, buyer_email, total_amount, discount_amount,
        coupon_code, payment_method, payment_status, base_amount, timeout_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      orderNumber,
      req.user?.id || null,
      req.user?.email || email || null,
      finalAmount,
      discountAmount,
      coupon_code || null,
      payment_method,
      paymentStatus,
      finalAmount,
      timeoutAt,
    ]);
    const order = orderRows[0];

    // Insert order items
    const createdItems = [];
    for (const item of orderItems) {
      const { rows: itemRows } = await query(`
        INSERT INTO order_items (order_id, product_id, variant_id, product_title, variant_name, price, delivered_content)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `, [order.id, item.product_id, item.variant_id, item.product_title, item.variant_name, item.price, item.delivered_content]);
      createdItems.push(itemRows[0]);
    }

    // Response structure
    const responseData = {
      order_id: order.id,
      order_number: orderNumber,
      total_amount: finalAmount,
      discount_amount: discountAmount,
      payment_method,
      payment_status: paymentStatus,
    };

    // 2. Cashfree Payment Gateway (Cards, UPI, NetBanking)
    if (payment_method === 'cashfree') {
      const cfRes = await createCashfreeOrder({
        orderId: order.id,
        orderAmount: finalAmount,
        customerEmail: req.user?.email || email || 'customer@quantumxd.store',
      });
      if (cfRes.success && cfRes.paymentLink) {
        responseData.payment_link = cfRes.paymentLink;
        await query('UPDATE orders SET gateway_payment_id=$1, invoice_url=$2 WHERE id=$3', [
          cfRes.orderId,
          cfRes.paymentLink,
          order.id,
        ]);
      } else {
        return res.status(500).json({ error: cfRes.error || 'Failed to initiate Cashfree payment' });
      }
    }

    // 3. NowPayments (Crypto)
    else if (payment_method === 'nowpayments') {
      const { invoiceUrl, invoiceId } = await createCryptoInvoice({ orderId: order.id, amountINR: finalAmount });
      responseData.invoice_url = invoiceUrl;
      responseData.timeout_at = timeoutAt;
      responseData.fee_percent = parseFloat(process.env.CRYPTO_FEE_PERCENT || 5);
      await query('UPDATE orders SET gateway_payment_id=$1, invoice_url=$2 WHERE id=$3', [invoiceId, invoiceUrl, order.id]);
    }

    // 4. Binance Pay
    else if (payment_method === 'binance') {
      responseData.binance_pay_id = process.env.BINANCE_PAY_ID || '1133813547';
      responseData.min_usd = parseFloat(process.env.BINANCE_MIN_USD || 1);
      responseData.usd_to_inr = usdToInr;
    }

    // 5. Wallet Direct Payment
    else if (payment_method === 'wallet') {
      responseData.message = 'Payment successful from wallet balance!';
      responseData.items = createdItems;
    }

    res.status(201).json(responseData);
  } catch (err) { next(err); }
};

// POST /api/payments/cashfree/verify — check Cashfree payment status
export const verifyCashfreePayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const statusRes = await checkCashfreeStatus(order_id);
    if (statusRes.isPaid) {
      await query("UPDATE orders SET payment_status='paid', paid_at=NOW() WHERE id=$1", [order_id]);
      return res.json({ success: true, payment_status: 'paid', message: 'Payment confirmed!' });
    }
    res.json({ success: false, payment_status: statusRes.txStatus || 'pending' });
  } catch (err) { next(err); }
};

// POST /api/payments/binance/verify — submit tx ID
export const verifyBinancePayment = async (req, res, next) => {
  try {
    const { order_id, tx_id } = req.body;
    if (!order_id || !tx_id) return res.status(400).json({ error: 'order_id and tx_id required' });

    const result = await processBinanceOrder(order_id, tx_id);
    if (!result.success) return res.status(400).json({ error: result.error });

    res.json({ message: 'Payment verified', ...result });
  } catch (err) { next(err); }
};

// GET /api/payments/status/:orderId
export const getOrderStatus = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT o.id, o.order_number, o.payment_status, o.paid_at,
             json_agg(json_build_object(
               'title', oi.product_title,
               'price', oi.price,
               'download_token', oi.download_token
             )) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id=o.id
      WHERE o.id=$1
      GROUP BY o.id
    `, [req.params.orderId]);
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};
