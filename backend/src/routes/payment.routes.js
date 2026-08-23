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
} from '../controllers/payment.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public active payment methods for checkout & deposit
router.get('/methods', getActivePaymentMethods);

// Public coupon validation endpoint for checkout
router.post('/coupon/validate', validateCoupon);

// Direct wallet purchase (MongoDB stock pop)
router.post('/wallet-purchase', protect, walletPurchase);

// Gateway payments (Cashfree, Crypto, Binance, UPI)
router.post('/initiate', optionalAuth, initiatePayment);
router.post('/upi/submit', optionalAuth, submitUpiPayment);
router.post('/cashfree/verify', optionalAuth, verifyCashfreePayment);
router.post('/binance/verify', optionalAuth, verifyBinancePayment);
router.get('/status/:orderId', getOrderStatus);

export default router;
