import axios from 'axios';
import { query } from '../config/db.js';
import { generateDownloadTokens } from './upi.service.js';
import { sendOrderConfirmationEmail } from './email.service.js';
import { getPaymentSettings } from './paymentSettings.service.js';

const NP_API = 'https://api.nowpayments.io/v1';

const getHeaders = async () => {
  let key = process.env.NOWPAYMENTS_API_KEY;
  try {
    const settings = await getPaymentSettings();
    if (settings?.nowpayments?.api_key) key = settings.nowpayments.api_key;
  } catch (_) {}
  return { 'x-api-key': key || 'N4A03H3-9F94S9W-M37G1W0-9R529A1' };
};

// Create a NowPayments invoice for crypto payment
export async function createCryptoInvoice({ orderId, amountINR, userId }) {
  const billAmount = parseFloat((amountINR * (1 + parseFloat(process.env.CRYPTO_FEE_PERCENT || 5) / 100)).toFixed(2));
  const orderDesc = `QuantumXD Order ${orderId}`;
  const headers = await getHeaders();

  const { data } = await axios.post(`${NP_API}/invoice`, {
    price_amount: billAmount,
    price_currency: 'inr',
    order_id: orderId,
    order_description: orderDesc,
    ipn_callback_url: `${process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://quantumxd.store'}/api/payments/nowpayments/webhook`,
  }, { headers });

  return {
    invoiceUrl: data.invoice_url,
    invoiceId: data.id,
    billAmount,
  };
}

// Poll NowPayments status for a specific payment
export async function checkNowPaymentsStatus(paymentId) {
  try {
    const headers = await getHeaders();
    const { data } = await axios.get(`${NP_API}/payment/${paymentId}`, { headers });
    return data.payment_status; // 'waiting','confirming','confirmed','sending','finished','failed','refunded','expired'
  } catch {
    return null;
  }
}

// Process all pending crypto payments
export async function processNowPaymentsOrders() {
  try {
    const { rows } = await query(`
      SELECT id, buyer_id, base_amount, gateway_payment_id
      FROM orders
      WHERE payment_method='nowpayments' AND payment_status='pending'
        AND gateway_payment_id IS NOT NULL
        AND (timeout_at IS NULL OR timeout_at > NOW())
    `);

    for (const order of rows) {
      const status = await checkNowPaymentsStatus(order.gateway_payment_id);
      if (!status) continue;

      if (['finished', 'sending', 'confirmed'].includes(status)) {
        const { fulfillPaidOrder } = await import('../controllers/payment.controller.js');
        await fulfillPaidOrder(order.id);

        if (order.buyer_id) {
          const creditAmount = parseFloat(order.base_amount);
          await query(`UPDATE users SET balance=balance+$1, all_time_topup=all_time_topup+$1, updated_at=NOW() WHERE id=$2`, [creditAmount, order.buyer_id]);
          await query(`INSERT INTO deposits (user_id, order_id, amount, gateway, transaction_id) VALUES ($1,$2,$3,'nowpayments',$4)`,
            [order.buyer_id, order.id, creditAmount, order.gateway_payment_id]);
        }

        await sendOrderConfirmationEmail(order.id);
        console.log(`[NowPayments] Order ${order.id} marked PAID and fulfilled`);

      } else if (['failed', 'refunded', 'expired'].includes(status)) {
        await query(`UPDATE orders SET payment_status='failed', updated_at=NOW() WHERE id=$1`, [order.id]);
        console.log(`[NowPayments] Order ${order.id} marked FAILED (${status})`);
      }
    }
  } catch (err) {
    console.error('[NowPayments] processOrders error:', err.message);
  }
}
