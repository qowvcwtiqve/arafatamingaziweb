import nodemailer from 'nodemailer';
import { query } from '../config/db.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendOrderConfirmationEmail(orderId) {
  try {
    const { rows: orders } = await query(`
      SELECT o.*, u.email, u.name FROM orders o
      LEFT JOIN users u ON u.id = o.buyer_id
      WHERE o.id=$1
    `, [orderId]);
    const order = orders[0];
    if (!order?.email) return;

    const { rows: items } = await query(`
      SELECT oi.*, p.title AS product_title
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id=$1
    `, [orderId]);

    const downloadLinks = items.map(item => {
      const link = `${process.env.FRONTEND_URL}/download/${item.download_token}`;
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #1a1a2e;">${item.product_title}</td>
          <td style="padding:12px;border-bottom:1px solid #1a1a2e;">₹${item.price}</td>
          <td style="padding:12px;border-bottom:1px solid #1a1a2e;">
            ${item.download_token
              ? `<a href="${link}" style="color:#6E3AFF;font-weight:bold;">Download</a>`
              : item.delivered_content || 'N/A'}
          </td>
        </tr>`;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order Confirmed — QuantumXD Store</title></head>
<body style="margin:0;padding:0;background:#080B14;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0;">
  <div style="max-width:600px;margin:40px auto;background:#0d1117;border:1px solid rgba(110,58,255,0.3);border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6E3AFF,#00D4FF);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:-0.5px;">Order Confirmed</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Thank you for your purchase!</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#94a3b8;">Hi <strong style="color:#e2e8f0;">${order.name || 'Customer'}</strong>,</p>
      <p style="color:#94a3b8;">Your payment has been verified and your order is ready.</p>
      <p style="color:#94a3b8;"><strong>Order #:</strong> <span style="color:#6E3AFF;font-family:monospace;">${order.order_number}</span></p>
      <table width="100%" style="border-collapse:collapse;margin:24px 0;background:#0a0e1a;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#6E3AFF22;">
            <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6E3AFF;">Product</th>
            <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6E3AFF;">Price</th>
            <th style="padding:12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6E3AFF;">Download</th>
          </tr>
        </thead>
        <tbody>${downloadLinks}</tbody>
      </table>
      <div style="background:#6E3AFF11;border:1px solid rgba(110,58,255,0.2);border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#94a3b8;font-size:13px;">Download links expire in <strong style="color:#00D4FF;">30 days</strong> and can be used up to 5 times.</p>
      </div>
      <p style="color:#64748b;font-size:12px;margin-top:32px;">
        Need help? Contact us at <a href="mailto:${process.env.SMTP_USER}" style="color:#6E3AFF;">${process.env.SMTP_USER}</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: order.email,
      subject: `Order Confirmed #${order.order_number} — QuantumXD Store`,
      html,
    });

    console.log(`[Email] Order confirmation sent to ${order.email}`);
  } catch (err) {
    console.error('[Email] sendOrderConfirmationEmail error:', err.message);
  }
}
