import { Router } from 'express';
import {
  initiatePayment,
  walletPurchase,
  verifyBinancePayment,
  verifyCashfreePayment,
  submitUpiPayment,
  getActivePaymentMethods,
  validateCoupon,
  getOrderStatus,
  fulfillPaidOrder,
} from '../controllers/payment.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public active payment methods for checkout & deposit
router.get('/methods', getActivePaymentMethods);

// Public coupon validation endpoint for checkout
router.post('/coupon/validate', validateCoupon);

// Direct wallet purchase (MongoDB stock pop)
router.post('/wallet-purchase', protect, walletPurchase);

// Gateway payments — LOGIN REQUIRED (protect middleware enforces authentication)
router.post('/initiate', protect, initiatePayment);
router.post('/upi/submit', protect, submitUpiPayment);
router.post('/cashfree/verify', protect, verifyCashfreePayment);
router.post('/binance/verify', protect, verifyBinancePayment);
router.get('/status/:orderId', protect, getOrderStatus);

// Cashfree Return URL (Converts Cashfree POST form redirect to 302 GET redirect for Next.js)
router.all('/cashfree/return', async (req, res) => {
  const orderId = req.body?.orderId || req.query?.order_id || req.body?.order_id || req.query?.orderId;
  const isTopup = String(orderId || '').startsWith('TOPUP_');

  // Fulfill if paid
  if (orderId && !isTopup) {
    try {
      const { checkCashfreeStatus } = await import('../services/cashfree.service.js');
      const statusRes = await checkCashfreeStatus(orderId);
      if (statusRes.isPaid) {
        await fulfillPaidOrder(orderId);
      }
    } catch (e) {
      console.error('Error in cashfree return auto-fulfill:', e);
    }
  }

  const targetUrl = isTopup
    ? `${process.env.FRONTEND_URL || 'https://quantumxd.store'}/dashboard?tab=wallet&topup_status=check&order_id=${encodeURIComponent(orderId || '')}`
    : `${process.env.FRONTEND_URL || 'https://quantumxd.store'}/checkout?cf_status=check&order_id=${encodeURIComponent(orderId || '')}`;

  return res.redirect(302, targetUrl);
});

// Cashfree Webhook
router.post('/cashfree/webhook', async (req, res) => {
  try {
    const orderId = req.body?.orderId || req.body?.order_id;
    const txStatus = req.body?.txStatus;
    if (orderId && txStatus === 'SUCCESS') {
      await fulfillPaidOrder(orderId);
    }
  } catch (err) {
    console.error('Cashfree webhook error:', err);
  }
  res.status(200).send('OK');
});

export default router;
