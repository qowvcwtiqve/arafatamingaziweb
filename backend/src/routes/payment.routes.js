import { Router } from 'express';
import { initiatePayment, verifyBinancePayment, verifyCashfreePayment, getOrderStatus } from '../controllers/payment.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.post('/initiate', optionalAuth, initiatePayment);
router.post('/cashfree/verify', optionalAuth, verifyCashfreePayment);
router.post('/binance/verify', optionalAuth, verifyBinancePayment);
router.get('/status/:orderId', getOrderStatus);
export default router;
