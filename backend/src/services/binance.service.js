import axios from 'axios';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { generateDownloadTokens } from './upi.service.js';
import { sendOrderConfirmationEmail } from './email.service.js';

// Verify a Binance Pay transaction by Order ID or Transaction ID
export async function verifyBinanceTransaction(txId) {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || apiKey === 'YOUR_BINANCE_API_KEY_HERE') {
    throw new Error('Binance API keys not configured. Please set BINANCE_API_KEY and BINANCE_API_SECRET in .env');
  }

  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto.createHmac('sha256', apiSecret)
    .update(queryString).digest('hex');

  const url = `https://api.binance.com/sapi/v1/pay/transactions?${queryString}&signature=${signature}`;

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
}

// Process a Binance Pay order after user submits TX ID
export async function processBinanceOrder(orderId, txId) {
  const txn = await verifyBinanceTransaction(txId);
  if (!txn) return { success: false, error: 'Transaction not found or invalid' };

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

  // Update order
  const { rows: orderRows } = await query(`
    UPDATE orders SET payment_status='paid', gateway_payment_id=$1, paid_at=NOW(), updated_at=NOW()
    WHERE id=$2 RETURNING buyer_id, base_amount
  `, [txn.transactionId || txn.orderId, orderId]);

  if (!orderRows[0]) return { success: false, error: 'Order not found' };

  await generateDownloadTokens(orderId);

  const { buyer_id } = orderRows[0];
  if (buyer_id) {
    await query(`UPDATE users SET balance=balance+$1, all_time_topup=all_time_topup+$1, updated_at=NOW() WHERE id=$2`, [creditINR, buyer_id]);
    await query(`INSERT INTO deposits (user_id, order_id, amount, gateway, transaction_id) VALUES ($1,$2,$3,'binance',$4)`,
      [buyer_id, orderId, creditINR, txn.transactionId || txn.orderId]);
  }

  await sendOrderConfirmationEmail(orderId);

  return { success: true, amountUsd: txn.amountUsd, creditINR };
}
