import axios from 'axios';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { generateDownloadTokens } from './upi.service.js';
import { sendOrderConfirmationEmail } from './email.service.js';
import { getPaymentSettings } from './paymentSettings.service.js';

// Verify a Binance Pay transaction by Order ID or Transaction ID
export async function verifyBinanceTransaction(txId) {
  let apiKey = process.env.BINANCE_API_KEY;
  let apiSecret = process.env.BINANCE_API_SECRET;
  try {
    const settings = await getPaymentSettings();
    if (settings?.binance?.api_key) apiKey = settings.binance.api_key;
    if (settings?.binance?.api_secret) apiSecret = settings.binance.api_secret;
  } catch (_) {}

  if (!apiKey || apiKey === 'YOUR_BINANCE_API_KEY_HERE' || !apiSecret) {
    return null;
  }

  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(queryString).digest('hex');

  const url = `https://api.binance.com/sapi/v1/pay/transactions?${queryString}&signature=${signature}`;

  try {
    const { data } = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 8000,
    });

    if (data?.code !== '000000' || !data?.success) return null;

    const txIdClean = txId.trim().toLowerCase();
    const txn = data.data?.find((t) => {
      return String(t.orderId).toLowerCase() === txIdClean
        || String(t.transactionId).toLowerCase() === txIdClean;
    });

    if (!txn) return null;

    return {
      amountUsd: parseFloat(txn.amount || 0),
      currency: txn.currency,
      orderId: String(txn.orderId),
      transactionId: String(txn.transactionId || ''),
    };
  } catch (err) {
    console.error('Binance transaction query error:', err.response?.data || err.message);
    return null;
  }
}

// Process a Binance Pay order after user submits TX ID
export async function processBinanceOrder(orderId, txId) {
  const txn = await verifyBinanceTransaction(txId);
  if (!txn) {
    // Save under review for manual admin verification if API check could not verify automatically
    await query(
      "UPDATE orders SET gateway_payment_id=$1, payment_status='under_review' WHERE id=$2",
      [String(txId).trim(), orderId]
    );
    return {
      success: true,
      under_review: true,
      message: 'Binance transaction submitted. Admin will verify and activate your order shortly.'
    };
  }

  const minUsd = parseFloat(process.env.BINANCE_MIN_USD || 1);
  if (txn.amountUsd < minUsd) {
    return { success: false, error: `Minimum deposit is $${minUsd}. Your transaction was $${txn.amountUsd}` };
  }

  // Anti double-spend
  const processed = await query(
    'SELECT id FROM processed_payment_ids WHERE payment_id=$1 OR payment_id=$2',
    [txn.orderId, txn.transactionId]
  );
  if (processed.rows[0]) return { success: false, error: 'Transaction already claimed' };

  // Get USD → INR rate
  const { rows: rateRows } = await query(
    'SELECT rate FROM exchange_rate_cache WHERE from_currency=$1 AND to_currency=$2',
    ['USD', 'INR']
  );
  const usdToInr = rateRows[0]?.rate || 84;
  const creditINR = txn.amountUsd * usdToInr;

  // Mark processed
  await query('INSERT INTO processed_payment_ids (payment_id, gateway) VALUES ($1,$2) ON CONFLICT DO NOTHING', [txn.orderId, 'binance']);
  if (txn.transactionId) {
    await query('INSERT INTO processed_payment_ids (payment_id, gateway) VALUES ($1,$2) ON CONFLICT DO NOTHING', [txn.transactionId, 'binance']);
  }

  // Fulfill order
  const { fulfillPaidOrder } = await import('../controllers/payment.controller.js');
  const fulfillment = await fulfillPaidOrder(orderId);

  const { rows: orderRows } = await query('SELECT buyer_id, base_amount FROM orders WHERE id=$1', [orderId]);
  const buyer_id = orderRows[0]?.buyer_id;
  if (buyer_id) {
    await query(`UPDATE users SET balance=balance+$1, all_time_topup=all_time_topup+$1, updated_at=NOW() WHERE id=$2`, [creditINR, buyer_id]);
    await query(`INSERT INTO deposits (user_id, order_id, amount, gateway, transaction_id) VALUES ($1,$2,$3,'binance',$4)`,
      [buyer_id, orderId, creditINR, txn.transactionId || txn.orderId]);
  }

  await sendOrderConfirmationEmail(orderId);

  return {
    success: true,
    amountUsd: txn.amountUsd,
    creditINR,
    credentials: fulfillment.credentials,
    sale_id: fulfillment.sale_id,
  };
}
