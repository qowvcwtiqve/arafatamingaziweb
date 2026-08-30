import mongoose from 'mongoose';
import { readLocalDb, writeLocalDb } from '../config/db.js';

const DEFAULT_PAYMENT_SETTINGS = {
  upi_qr: {
    enabled: true,
    title: 'UPI / QR Code',
    desc: 'Instant UPI (Google Pay, PhonePe, Paytm, BHIM)',
    icon: 'qr_code_2',
    color: '#10B981',
    upi_id: 'quantumxd@upi',
    merchant_name: 'QuantumXD',
    qr_image_url: '/upi-qr.png',
    instructions: 'Scan QR code or pay to UPI ID, then enter your 12-digit UTR / Reference ID.',
  },
  cashfree: {
    enabled: true,
    title: 'Cashfree PG',
    desc: 'UPI (GPay/PhonePe), Cards & NetBanking',
    icon: 'credit_card',
    color: '#00A0E3',
    client_id: process.env.CF_CLIENT_ID || '',
    client_secret: process.env.CF_SECRET || '',
    env: process.env.CF_ENV || 'PRODUCTION',
    instructions: 'Instant automated payment via Cashfree secure gateway.',
  },
  binance: {
    enabled: true,
    title: 'Binance Pay',
    desc: 'Direct crypto transfer via Binance App (0% fee)',
    icon: 'payments',
    color: '#F0B90B',
    binance_pay_id: process.env.BINANCE_PAY_ID || '1133813547',
    api_key: process.env.BINANCE_API_KEY || '',
    api_secret: process.env.BINANCE_API_SECRET || '',
    instructions: 'Send USDT/crypto via Binance Pay ID, then submit your Binance Transaction / Order ID.',
  },
  nowpayments: {
    enabled: true,
    title: 'Crypto (NOWPayments)',
    desc: 'BTC, ETH, USDT, SOL + 100 cryptocurrencies',
    icon: 'currency_bitcoin',
    color: '#F7931A',
    api_key: process.env.NOWPAYMENTS_API_KEY || '',
    ipn_secret: process.env.NOWPAYMENTS_IPN_SECRET || '',
    sandbox: false,
    instructions: 'Automated crypto invoice with 100+ supported coins.',
  },
  wallet: {
    enabled: true,
    title: 'Account Wallet Balance',
    desc: '1-Click Instant Automated Checkout',
    icon: 'account_balance_wallet',
    color: '#8B5CF6',
    instructions: 'Deducted directly from your QuantumXD account balance.',
  },
};

/**
 * Get full payment settings (for Admin Panel)
 */
export const getPaymentSettings = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      const doc = await mongoose.connection.collection('system').findOne({ _id: 'payment_settings' });
      if (doc && doc.data) {
        return { ...DEFAULT_PAYMENT_SETTINGS, ...doc.data };
      }
    }
  } catch (err) {
    console.error('Error fetching payment settings from MongoDB:', err.message);
  }

  // Fallback to local_db.json
  const localDb = readLocalDb();
  if (localDb.payment_settings) {
    return { ...DEFAULT_PAYMENT_SETTINGS, ...localDb.payment_settings };
  }

  return DEFAULT_PAYMENT_SETTINGS;
};

/**
 * Save updated payment settings (from Admin Panel)
 */
export const savePaymentSettings = async (settings) => {
  const merged = { ...DEFAULT_PAYMENT_SETTINGS, ...settings };

  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.collection('system').updateOne(
        { _id: 'payment_settings' },
        { $set: { data: merged, updated_at: new Date() } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('Error saving payment settings to MongoDB:', err.message);
  }

  // Also update local_db.json
  const localDb = readLocalDb();
  localDb.payment_settings = merged;
  writeLocalDb(localDb);

  return merged;
};

/**
 * Get public payment methods (for Storefront Checkout & Deposit)
 * Excludes sensitive secrets like client_secret, api_key, api_secret.
 */
export const getPublicPaymentMethods = async () => {
  const settings = await getPaymentSettings();
  const methods = [];

  for (const [key, config] of Object.entries(settings)) {
    if (!config.enabled) continue;

    methods.push({
      id: key,
      label: config.title,
      desc: config.desc,
      icon: config.icon,
      color: config.color,
      instructions: config.instructions,
      upi_id: key === 'upi_qr' ? config.upi_id : undefined,
      merchant_name: key === 'upi_qr' ? config.merchant_name : undefined,
      qr_image_url: key === 'upi_qr' ? config.qr_image_url : undefined,
      binance_pay_id: key === 'binance' ? config.binance_pay_id : undefined,
    });
  }

  return methods;
};
