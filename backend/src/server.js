import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import downloadRoutes from './routes/download.routes.js';
import realtimeRoutes, { initRealtimeWatcher } from './routes/realtime.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { connectMongoDB } from './config/mongodb.js';

// Payment background checkers
import { processUpiPayments, expireTimedOutOrders } from './services/upi.service.js';
import { processNowPaymentsOrders } from './services/nowpayments.service.js';

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// SECURITY & MIDDLEWARE
// =====================================================
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) and any localhost/LAN origin
    callback(null, true);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Stricter rate limit for auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// =====================================================
// ROUTES
// =====================================================
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/realtime', realtimeRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================
app.use(notFound);
app.use(errorHandler);

// =====================================================
// START SERVER
// =====================================================
// Connect to MongoDB Atlas (bot's database)
connectMongoDB().then(() => {
  initRealtimeWatcher();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 QuantumXD Backend running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB:  ${process.env.DATABASE_URL ? 'Connected' : 'NOT CONFIGURED — set DATABASE_URL in .env'}`);
  console.log(`   UPI: ${process.env.EMAIL_USER || 'NOT SET'}`);
  console.log(`   NowPayments: ${process.env.NOWPAYMENTS_API_KEY ? 'Configured' : 'NOT SET'}`);

  // =====================================================
  // BACKGROUND PAYMENT CHECKER (every 60 seconds)
  // Same logic as your Telegram bot's payment_checker_task
  // =====================================================
  const interval = parseInt(process.env.PAYMENT_CHECKER_INTERVAL_MS || 60000);

  setInterval(async () => {
    console.log('[Payment Checker] Running...');
    await expireTimedOutOrders();
    await processUpiPayments();
    await processNowPaymentsOrders();
  }, interval);

  console.log(`\n   Payment checker running every ${interval / 1000}s`);
  console.log(`   UPI: Gmail IMAP polling`);
  console.log(`   Crypto: NowPayments API polling`);
  console.log(`   Binance: Manual TX ID verification\n`);
});

export default app;
