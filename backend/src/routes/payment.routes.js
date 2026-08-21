import { Router } from 'express';
import {
  initiatePayment,
  walletPurchase,
  verifyBinancePayment,
  verifyCashfreePayment,
  getOrderStatus,
} from '../controllers/payment.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Direct wallet purchase (MongoDB stock pop)
router.post('/wallet-purchase', protect, walletPurchase);

// Gateway payments (Cashfree, Crypto, Binance)
router.post('/initiate', optionalAuth, initiatePayment);
router.post('/cashfree/verify', optionalAuth, verifyCashfreePayment);
router.post('/binance/verify', optionalAuth, verifyBinancePayment);
router.get('/status/:orderId', getOrderStatus);

export default router;
