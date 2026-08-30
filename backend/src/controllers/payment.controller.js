/**
 * Payment Controller
 * Handles purchase flow for website orders.
 * Uses MongoDB Atlas (bot's database) for products/stock.
 * Website orders stored in: website_sales MongoDB collection.
 * Website user balances stored in: local db.js (SQL emulator).
 */

import { query } from '../config/db.js';
import { createCryptoInvoice } from '../services/nowpayments.service.js';
import { processBinanceOrder } from '../services/binance.service.js';
import { createCashfreeOrder, checkCashfreeStatus } from '../services/cashfree.service.js';
import { sendOrderConfirmationEmail } from '../services/email.service.js';
import { getPaymentSettings, getPublicPaymentMethods } from '../services/paymentSettings.service.js';
import {
  getProductById,
  atomicPopStock,
  getStockCount,
} from '../services/botdb.service.js';
import Sale from '../models/sale.model.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// ─── Utility ──────────────────────────────────────────────────────────────────

export function generateSaleId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `QXD-${rand}`;
}

async function getUsdToInrRate() {
  try {
    const { rows } = await query(
      "SELECT rate, fetched_at FROM exchange_rate_cache WHERE from_currency='USD' AND to_currency='INR'"
    );
    const stale = !rows[0] || Date.now() - new Date(rows[0].fetched_at).getTime() > 3600000;
    if (stale) {
      const { data } = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 });
      const rate = data.rates?.INR || 84;
      await query(`
        INSERT INTO exchange_rate_cache (from_currency,to_currency,rate,fetched_at)
        VALUES ('USD','INR',$1,NOW())
        ON CONFLICT (from_currency,to_currency) DO UPDATE SET rate=$1, fetched_at=NOW()
      `, [rate]);
      return rate;
    }
    return parseFloat(rows[0].rate);
  } catch { return 84; }
}

// ─── POST /api/payments/wallet-purchase ───────────────────────────────────────
// Direct wallet purchase — atomic stock pop from MongoDB
export const walletPurchase = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Please login to purchase' });

    let { product_id, variant_id, quantity = 1, items } = req.body;
    if (items && Array.isArray(items) && items.length > 0) {
      product_id = product_id || items[0].product_id;
      variant_id = variant_id || items[0].variant_id;
      quantity = quantity || items[0].quantity || 1;
    }

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }
    const qty = Math.max(1, parseInt(quantity));

    // 1. Fetch product from MongoDB
    const product = await getProductById(product_id);
    if (!product || !product.is_active) {
      return res.status(404).json({ error: 'Product not found or inactive' });
    }

    // 2. Find variant (fallback to first variant if not explicitly provided)
    let variant = product.variants?.find((v) => v.id === variant_id);
    if (!variant && product.variants && product.variants.length > 0) {
      variant = product.variants[0];
      variant_id = variant.id;
    }
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const poolId = variant.pool_id;
    const isPreorder = Boolean(variant.is_preorder || variant.delivery_method === 'preorder' || (/pre[- ]?order/i.test(variant.name || '')));
    const isManual = !isPreorder && Boolean(
      variant.delivery_method === 'manual' ||
      String(variant.delivery_time || '').toLowerCase().includes('manual') ||
      String(variant.name || '').toLowerCase().includes('manual') ||
      String(product.delivery_process || '').toLowerCase().includes('manual')
    );
    const isInfinite = variant.is_infinite;
    const stockCount = variant.stock;
    const deliveryMethod = isPreorder ? 'preorder' : isManual ? 'manual' : isInfinite ? 'infinite' : 'auto';
    const saleStatus = isPreorder ? 'Pre-Order' : isManual ? 'Pending' : 'Delivered';

    // 3. Check stock (only for automated instant delivery)
    if (!isInfinite && !isPreorder && !isManual && stockCount < qty) {
      return res.status(400).json({ error: 'Out of stock' });
    }

    // 4. Calculate price & apply coupon if provided
    const unitPrice = variant.price;
    const baseTotal = parseFloat((unitPrice * qty).toFixed(2));
    let discountAmount = 0;

    let { coupon_code } = req.body;
    if (coupon_code) {
      try {
        const { rows } = await query('SELECT * FROM coupons WHERE code=$1', [String(coupon_code).trim().toUpperCase()]);
        const c = rows[0];
        if (c && c.is_active !== false && (!c.expires_at || new Date(c.expires_at) > new Date()) && (!c.max_uses || c.used_count < c.max_uses) && (!c.min_order_amount || baseTotal >= parseFloat(c.min_order_amount))) {
          discountAmount = c.discount_type === 'percent'
            ? (baseTotal * parseFloat(c.discount_value)) / 100
            : parseFloat(c.discount_value);
          discountAmount = Math.min(discountAmount, baseTotal);
          await query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [c.id]);
        }
      } catch (_) {}
    }

    const totalPrice = parseFloat((baseTotal - discountAmount).toFixed(2));

    // 5. Check user wallet balance (from local db.js)
    const { rows: uRows } = await query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
    const currentBalance = parseFloat(uRows[0]?.balance || 0);
    if (currentBalance < totalPrice) {
      return res.status(400).json({
        error: `Insufficient wallet balance (₹${currentBalance.toFixed(2)}). Need ₹${totalPrice}. Please top up first.`,
      });
    }

    // 6. Deduct balance atomically (SQL emulator)
    await query('UPDATE users SET balance=balance-$1 WHERE id=$2', [totalPrice, req.user.id]);

    // 7. Deliver: atomically pop stock from MongoDB
    const deliveredItems = [];

    if (!isPreorder && !isManual) {
      for (let i = 0; i < qty; i++) {
        if (isInfinite) {
          const Product = (await import('../models/product.model.js')).default;
          const raw = await Product.findById(product_id).lean();
          const pool = (raw?.stock_pools || {})[poolId] || [];
          deliveredItems.push(pool[0] || 'Infinite Stock Item');
        } else {
          const item = await atomicPopStock(product_id, poolId);
          if (!item) {
            // Refund if stock ran out mid-purchase (race condition)
            await query('UPDATE users SET balance=balance+$1 WHERE id=$2', [unitPrice, req.user.id]);
            break;
          }
          deliveredItems.push(item);
        }
      }
    }

    // 8. Create sale records in website_sales collection
    const now = Math.floor(Date.now() / 1000);
    const endTs = variant.duration > 0 ? now + variant.duration * 30 * 24 * 3600 : null;
    const { rows: userRows } = await query('SELECT name,email FROM users WHERE id=$1', [req.user.id]);
    const userName = userRows[0]?.name || 'Customer';
    const userEmail = userRows[0]?.email || '';

    const createdSales = [];
    const actualQty = deliveredItems.length || qty;

    for (let i = 0; i < (isPreorder || isManual ? qty : actualQty); i++) {
      const sale = await Sale.create({
        sale_id: generateSaleId(),
        source: 'website',
        product_id,
        variant_id,
        pool_id: poolId,
        product_name: product.website_meta?.title || product.name,
        variant_name: variant.name,
        price: unitPrice,
        original_price: unitPrice,
        quantity: 1,
        user_id: req.user.id,
        user_email: userEmail,
        user_name: userName,
        credentials: deliveredItems[i] || '',
        status: saleStatus,
        delivery_method: deliveryMethod,
        purchase_ts: now,
        end_ts: endTs,
      });
      createdSales.push(sale);
    }

    // 9. Get updated balance
    const { rows: newURows } = await query('SELECT balance FROM users WHERE id=$1', [req.user.id]);
    const newBalance = parseFloat(newURows[0]?.balance || 0);

    return res.json({
      success: true,
      payment_status: 'paid',
      sale_ids: createdSales.map((s) => s.sale_id),
      order_id: createdSales[0]?.sale_id,
      credentials: deliveredItems.join('\n\n'),
      is_preorder: isPreorder,
      is_manual: isManual,
      new_balance: newBalance,
      rules: variant.rules || '',
      delivery_time: variant.delivery_time || 'Instant',
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/coupon/validate ─────────────────────────────────────
export const validateCoupon = async (req, res, next) => {
  try {
    const { code, cart_total = 0 } = req.body;
    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'Please enter a coupon code' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const { rows } = await query('SELECT * FROM coupons WHERE code=$1', [cleanCode]);
    const coupon = rows[0];

    if (!coupon) {
      return res.status(404).json({ error: `Coupon code "${cleanCode}" does not exist` });
    }

    if (coupon.is_active === false) {
      return res.status(400).json({ error: `Coupon code "${cleanCode}" is no longer active` });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: `Coupon code "${cleanCode}" has expired` });
    }

    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: `Coupon code "${cleanCode}" has reached its maximum usage limit` });
    }

    const orderAmount = parseFloat(cart_total) || 0;
    if (coupon.min_order_amount && orderAmount < parseFloat(coupon.min_order_amount)) {
      return res.status(400).json({
        error: `Minimum order amount of ₹${parseFloat(coupon.min_order_amount).toFixed(2)} required for coupon "${cleanCode}"`,
      });
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percent') {
      discountAmount = (orderAmount * parseFloat(coupon.discount_value)) / 100;
    } else {
      discountAmount = parseFloat(coupon.discount_value);
    }
    discountAmount = Math.min(discountAmount, orderAmount);
    discountAmount = parseFloat(discountAmount.toFixed(2));

    const finalAmount = Math.max(0, parseFloat((orderAmount - discountAmount).toFixed(2)));

    res.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: parseFloat(coupon.discount_value),
      discount_amount: discountAmount,
      final_total: finalAmount,
      message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount.toFixed(2)}`,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/methods ──────────────────────────────────────────────
export const getActivePaymentMethods = async (req, res, next) => {
  try {
    const methods = await getPublicPaymentMethods();
    res.json({ success: true, methods });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
// For non-wallet payments (Cashfree, Crypto, Binance, UPI) or wallet delegation
export const initiatePayment = async (req, res, next) => {
  try {
    let { product_id, variant_id, quantity = 1, payment_method, coupon_code, email, items } = req.body;

    if (items && Array.isArray(items) && items.length > 0) {
      product_id = product_id || items[0].product_id;
      variant_id = variant_id || items[0].variant_id;
      quantity = quantity || items[0].quantity || 1;
    }

    if (payment_method === 'wallet') {
      req.body.product_id = product_id;
      req.body.variant_id = variant_id;
      req.body.quantity = quantity;
      return walletPurchase(req, res, next);
    }

    if (!product_id || !payment_method) {
      return res.status(400).json({ error: 'product_id and payment_method required' });
    }
    if (!['cashfree', 'nowpayments', 'binance', 'upi', 'upi_qr', 'wallet'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if payment method is enabled in Admin settings
    const settings = await getPaymentSettings();
    const settingKey = (payment_method === 'upi' || payment_method === 'upi_qr') ? 'upi_qr' : payment_method;
    if (settings[settingKey] && settings[settingKey].enabled === false) {
      return res.status(400).json({
        error: `${settings[settingKey].title || payment_method} is currently disabled by administrator.`
      });
    }

    const qty = Math.max(1, parseInt(quantity));

    // Fetch product
    const product = await getProductById(product_id);
    if (!product || !product.is_active) return res.status(404).json({ error: 'Product not found' });

    let variant = product.variants?.find((v) => v.id === variant_id);
    if (!variant && product.variants && product.variants.length > 0) {
      variant = product.variants[0];
      variant_id = variant.id;
    }
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const unitPrice = variant.price;
    let totalAmount = parseFloat((unitPrice * qty).toFixed(2));

    // Coupon check (local coupons from db.js)
    let discountAmount = 0;
    if (coupon_code) {
      try {
        const { rows } = await query(`SELECT * FROM coupons WHERE code=$1`, [coupon_code.toUpperCase()]);
        if (rows[0]) {
          const c = rows[0];
          discountAmount =
            c.discount_type === 'percent'
              ? totalAmount * (parseFloat(c.discount_value) / 100)
              : parseFloat(c.discount_value);
          discountAmount = Math.min(discountAmount, totalAmount);
          await query('UPDATE coupons SET used_count=used_count+1 WHERE id=$1', [c.id]);
        }
      } catch (_) {}
    }

    const finalAmount = parseFloat((totalAmount - discountAmount).toFixed(2));
    const usdToInr = await getUsdToInrRate();
    const orderId = generateSaleId();
    const orderNumber = orderId;

    // Create pending order record (local db.js orders table)
    const { rows: orderRows } = await query(`
      INSERT INTO orders (id, order_number, buyer_id, buyer_email, total_amount, discount_amount,
        coupon_code, payment_method, payment_status, base_amount, timeout_at,
        meta_product_id, meta_variant_id, meta_qty)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      orderId,
      orderNumber,
      req.user?.id || null,
      req.user?.email || email || null,
      finalAmount,
      discountAmount,
      coupon_code || null,
      payment_method,
      'pending',
      finalAmount,
      new Date(Date.now() + 3 * 60 * 60 * 1000),
      product_id,
      variant_id,
      qty,
    ]);
    const order = orderRows[0] || { id: orderId, order_number: orderNumber };

    const responseData = {
      order_id: order.id,
      order_number: orderNumber,
      total_amount: finalAmount,
      discount_amount: discountAmount,
      payment_method,
      payment_status: 'pending',
    };

    if (payment_method === 'cashfree') {
      const cfRes = await createCashfreeOrder({
        orderId: order.id,
        orderAmount: finalAmount,
        customerEmail: req.user?.email || email || 'customer@quantumxd.store',
      });
      if (cfRes.success && cfRes.paymentLink) {
        responseData.payment_link = cfRes.paymentLink;
        await query('UPDATE orders SET gateway_payment_id=$1, invoice_url=$2 WHERE id=$3', [
          cfRes.orderId, cfRes.paymentLink, order.id,
        ]);
      } else {
        return res.status(500).json({ error: cfRes.error || 'Cashfree payment failed' });
      }
    } else if (payment_method === 'nowpayments') {
      const { invoiceUrl, invoiceId } = await createCryptoInvoice({ orderId: order.id, amountINR: finalAmount });
      responseData.invoice_url = invoiceUrl;
      responseData.timeout_at = new Date(Date.now() + 180 * 60 * 1000);
      await query('UPDATE orders SET gateway_payment_id=$1, invoice_url=$2 WHERE id=$3', [invoiceId, invoiceUrl, order.id]);
    } else if (payment_method === 'binance') {
      const binanceCfg = settings.binance || {};
      responseData.binance_pay_id = binanceCfg.binance_pay_id || process.env.BINANCE_PAY_ID || '1133813547';
      responseData.usd_to_inr = usdToInr;
    } else if (payment_method === 'upi' || payment_method === 'upi_qr') {
      const upiCfg = settings.upi_qr || {};
      responseData.upi_id = upiCfg.upi_id || 'quantumxd@upi';
      responseData.merchant_name = upiCfg.merchant_name || 'QuantumXD Store';
      responseData.qr_image_url = upiCfg.qr_image_url || '/upi-qr.png';
      responseData.instructions = upiCfg.instructions || 'Scan QR code or pay to UPI ID, then submit your 12-digit UTR.';
    }

    res.status(201).json(responseData);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/upi/submit ───────────────────────────────────────────
export const submitUpiPayment = async (req, res, next) => {
  try {
    const { order_id, utr_number } = req.body;
    if (!order_id || !utr_number) {
      return res.status(400).json({ error: 'order_id and utr_number are required' });
    }
    const cleanUtr = String(utr_number).trim();
    if (cleanUtr.length < 6) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UPI UTR / Reference ID' });
    }

    await query(
      "UPDATE orders SET gateway_payment_id=$1, payment_status='under_review' WHERE id=$2",
      [cleanUtr, order_id]
    );

    res.json({
      success: true,
      message: 'UPI Reference ID submitted successfully. Order is under verification.',
      payment_status: 'under_review',
      utr: cleanUtr,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Shared Fulfill Paid Order ───────────────────────────────────────────────
export const fulfillPaidOrder = async (orderId) => {
  try {
    const { rows: orderRows } = await query('SELECT * FROM orders WHERE id=$1 OR order_number=$1', [orderId]);
    if (!orderRows || !orderRows[0]) {
      return { success: false, error: 'Order not found' };
    }
    const order = orderRows[0];
    if (order.delivered_items && order.sale_id) {
      const existingSale = await Sale.findOne({ sale_id: order.sale_id }).lean();
      const status = existingSale?.status || order.order_status || 'Delivered';
      return { success: true, order, sale_id: order.sale_id, credentials: order.delivered_items, status };
    }

    const product_id = String(order.meta_product_id || order.product_id || 'p-devtest-item');
    const variant_id = String(order.meta_variant_id || order.variant_id || 'var-test-instant');
    const qty = Math.max(1, parseInt(order.meta_qty || 1));

    const product = await getProductById(product_id);
    const variant = product?.variants?.find((v) => v.id === variant_id) || product?.variants?.[0];
    const poolId = variant?.pool_id || product?.default_pool_id || 'main';

    const isPreorder = Boolean(
      variant?.is_preorder ||
      variant?.delivery_method === 'preorder' ||
      product?.preorder_pools?.[poolId] ||
      (/pre[- ]?order/i.test(variant?.name || '')) ||
      (/pre[- ]?order/i.test(variant?.id || '')) ||
      (/pre[- ]?order/i.test(poolId || ''))
    );
    const isManual = !isPreorder && Boolean(
      variant?.delivery_method === 'manual' ||
      String(variant?.delivery_time || '').toLowerCase().includes('manual') ||
      String(variant?.name || '').toLowerCase().includes('manual') ||
      String(variant?.id || '').toLowerCase().includes('manual') ||
      String(product?.delivery_process || '').toLowerCase().includes('manual')
    );
    const isInfinite = variant?.is_infinite || product?.is_infinite;
    const deliveryMethod = isPreorder ? 'preorder' : isManual ? 'manual' : isInfinite ? 'infinite' : 'auto';
    const saleStatus = isPreorder ? 'Pre-Order' : isManual ? 'Pending' : 'Delivered';

    const deliveredItems = [];
    if (!isPreorder && !isManual) {
      for (let i = 0; i < qty; i++) {
        if (isInfinite) {
          const Product = (await import('../models/product.model.js')).default;
          const raw = await Product.findById(product_id).lean();
          const pool = (raw?.stock_pools || {})[poolId] || [];
          deliveredItems.push(pool[0] || 'Infinite Stock Item');
        } else {
          const item = await atomicPopStock(product_id, poolId);
          if (item) {
            deliveredItems.push(item);
          }
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const endTs = variant?.duration > 0 ? now + variant.duration * 30 * 24 * 3600 : null;
    const saleId = order.id || generateSaleId();

    // Look up buyer details from users table for proper attribution
    let buyerName = 'Customer';
    let buyerEmail = order.buyer_email || 'customer@quantumxd.store';
    const buyerId = order.buyer_id || null;
    if (buyerId) {
      try {
        const { rows: userRows } = await query('SELECT name, email FROM users WHERE id=$1', [buyerId]);
        if (userRows[0]) {
          buyerName = userRows[0].name || 'Customer';
          buyerEmail = userRows[0].email || buyerEmail;
        }
      } catch (_) {}
    }

    const sale = await Sale.create({
      sale_id: saleId,
      source: 'website',
      product_id: product_id || product?.id || 'p-devtest-item',
      variant_id: variant_id || variant?.id || 'var-test-instant',
      pool_id: poolId || 'main',
      product_name: product?.website_meta?.title || product?.name || 'Product',
      variant_name: variant?.name || 'Standard',
      price: parseFloat(order.total_amount || 0),
      original_price: parseFloat(order.base_amount || order.total_amount || 0),
      quantity: qty,
      user_id: buyerId || 'guest',
      user_email: buyerEmail,
      user_name: buyerName,
      credentials: deliveredItems.join('\n\n') || '',
      status: saleStatus,
      delivery_method: deliveryMethod,
      purchase_ts: now,
      end_ts: endTs,
    });

    const credsString = deliveredItems.join('\n\n');
    await query(
      "UPDATE orders SET payment_status='paid', paid_at=NOW(), order_status=$1, delivered_items=$2, sale_id=$3 WHERE id=$4",
      [saleStatus, credsString, saleId, order.id]
    );

    return {
      success: true,
      order,
      sale_id: saleId,
      credentials: credsString,
      status: sale.status,
    };
  } catch (err) {
    console.error('Error fulfilling paid order:', err);
    return { success: false, error: err.message };
  }
};

// ─── POST /api/payments/cashfree/verify ──────────────────────────────────────
export const verifyCashfreePayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });
    const statusRes = await checkCashfreeStatus(order_id);
    if (statusRes.isPaid) {
      const fulfillment = await fulfillPaidOrder(order_id);
      return res.json({
        success: true,
        payment_status: 'paid',
        order_id: fulfillment.sale_id || order_id,
        credentials: fulfillment.credentials,
      });
    }
    res.json({ success: false, payment_status: statusRes.txStatus || 'pending' });
  } catch (err) { next(err); }
};

// ─── POST /api/payments/binance/verify ───────────────────────────────────────
export const verifyBinancePayment = async (req, res, next) => {
  try {
    const { order_id, tx_id } = req.body;
    if (!order_id || !tx_id) return res.status(400).json({ error: 'order_id and tx_id required' });
    const result = await processBinanceOrder(order_id, tx_id);
    if (!result.success) return res.status(400).json({ error: result.error });
    res.json({ message: 'Payment verified', ...result });
  } catch (err) { next(err); }
};

// ─── GET /api/payments/status/:orderId ───────────────────────────────────────
export const getOrderStatus = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, order_number, payment_status, paid_at, delivered_items, sale_id FROM orders WHERE id=$1 OR order_number=$1 OR sale_id=$1',
      [req.params.orderId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};


