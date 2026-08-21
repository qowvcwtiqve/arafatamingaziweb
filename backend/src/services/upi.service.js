import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { query } from '../config/db.js';
import { sendOrderConfirmationEmail } from './email.service.js';

// =====================================================
// UPI PAYMENT SERVICE
// Auto-detects Razorpay "Payment Successful" emails
// via Gmail IMAP and matches them to pending orders
// =====================================================

async function checkGmailForPayments() {
  return new Promise((resolve) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_APP_PASSWORD,
      host: process.env.EMAIL_IMAP_SERVER || 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const results = [];

    imap.once('error', (err) => {
      console.error('[UPI Poller] IMAP Error:', err.message);
      resolve([]);
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) { imap.end(); return resolve([]); }

        imap.search(['UNSEEN', ['SUBJECT', 'Payment successful']], (err, uids) => {
          if (err || !uids?.length) { imap.end(); return resolve([]); }

          const fetch = imap.fetch(uids, { bodies: '' });

          fetch.on('message', (msg) => {
            let buffer = '';
            msg.on('body', (stream) => stream.on('data', (chunk) => { buffer += chunk; }));
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                const from = parsed.from?.text || '';
                if (!from.toLowerCase().includes('razorpay')) return;

                const body = parsed.html || parsed.text || '';

                // Extract amount
                const amtMatch = body.match(/class="Amount__Unit">(\d+)<\/span><span class="Amount__Subunit"[^>]*>\.(\d+)<\/span>/);
                const fallbackMatch = body.match(/(?:₹|INR|Rs\.?)\s*([\d\.]+)/);
                const payIdMatch = body.match(/(pay_[a-zA-Z0-9]+)/);

                let amount = null;
                if (amtMatch) amount = parseFloat(`${amtMatch[1]}.${amtMatch[2]}`);
                else if (fallbackMatch) amount = parseFloat(fallbackMatch[1]);

                if (amount !== null && payIdMatch) {
                  results.push({ amount, pay_id: payIdMatch[1] });
                }
              } catch { /* parse error — skip */ }
            });
          });

          fetch.once('end', () => { imap.end(); });
          fetch.once('error', () => { imap.end(); resolve(results); });
        });
      });
    });

    imap.once('end', () => resolve(results));
    imap.connect();
  });
}

export async function processUpiPayments() {
  try {
    const payments = await checkGmailForPayments();
    if (!payments.length) return;

    for (const { amount, pay_id } of payments) {
      // Check if already processed (anti double-spend)
      const processed = await query(
        'SELECT id FROM processed_payment_ids WHERE payment_id=$1',
        [pay_id]
      );
      if (processed.rows[0]) continue;

      // Find matching pending UPI order (exact amount match within 0.01)
      const { rows } = await query(`
        SELECT id, buyer_id, base_amount, unique_amount FROM orders
        WHERE payment_method='upi' AND payment_status='pending'
          AND ABS(unique_amount - $1) < 0.01
          AND (timeout_at IS NULL OR timeout_at > NOW())
        LIMIT 1
      `, [amount]);

      if (!rows[0]) continue;

      const order = rows[0];
      const creditAmount = parseFloat(order.base_amount);

      // Mark payment processed
      await query('INSERT INTO processed_payment_ids (payment_id, gateway) VALUES ($1,$2) ON CONFLICT DO NOTHING', [pay_id, 'upi']);

      // Mark order paid
      await query(`
        UPDATE orders SET payment_status='paid', gateway_payment_id=$1, paid_at=NOW(), updated_at=NOW()
        WHERE id=$2
      `, [pay_id, order.id]);

      // Generate download tokens for order items
      await generateDownloadTokens(order.id);

      // Credit wallet balance
      if (order.buyer_id) {
        await query(`
          UPDATE users SET balance=balance+$1, all_time_topup=all_time_topup+$1, updated_at=NOW()
          WHERE id=$2
        `, [creditAmount, order.buyer_id]);

        // Log deposit
        await query(`
          INSERT INTO deposits (user_id, order_id, amount, gateway, transaction_id)
          VALUES ($1,$2,$3,'upi',$4)
        `, [order.buyer_id, order.id, creditAmount, pay_id]);
      }

      // Send confirmation email
      await sendOrderConfirmationEmail(order.id);

      console.log(`[UPI Poller] Order ${order.id} marked PAID — Amount: ₹${amount}`);
    }
  } catch (err) {
    console.error('[UPI Poller] processUpiPayments error:', err.message);
  }
}

// Expire timed-out pending orders
export async function expireTimedOutOrders() {
  try {
    const { rows } = await query(`
      UPDATE orders SET payment_status='expired', updated_at=NOW()
      WHERE payment_status='pending' AND timeout_at < NOW()
      RETURNING id, buyer_id, payment_method
    `);
    if (rows.length) {
      console.log(`[Payment Checker] Expired ${rows.length} pending orders`);
    }
  } catch (err) {
    console.error('[Payment Checker] expireTimedOutOrders error:', err.message);
  }
}

// Generate signed download tokens for all items in an order
export async function generateDownloadTokens(orderId) {
  const { default: { randomUUID } } = await import('crypto');
  const { rows: items } = await query(
    'SELECT id FROM order_items WHERE order_id=$1',
    [orderId]
  );

  for (const item of items) {
    const token = randomUUID().replace(/-/g, '');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await query(`
      UPDATE order_items SET download_token=$1, download_token_expires=$2 WHERE id=$3
    `, [token, expires, item.id]);
  }
}
