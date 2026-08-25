import axios from 'axios';
import querystring from 'querystring';
import { getPaymentSettings } from './paymentSettings.service.js';

const getCfConfig = async () => {
  let cf = {};
  try {
    const settings = await getPaymentSettings();
    cf = settings?.cashfree || {};
  } catch (_) {}

  return {
    appId: cf.client_id || process.env.CF_CLIENT_ID || '13189604096003c23c53718d3280698131',
    secretKey: cf.client_secret || process.env.CF_SECRET || 'cfsk_ma_prod_a02505b8be151e6c5f2187e1d147ec61_da93f571',
    env: (cf.env || process.env.CF_ENV || 'PRODUCTION').toUpperCase(),
  };
};

const getBaseUrl = async () => {
  const { env } = await getCfConfig();
  return env === 'SANDBOX' || env === 'TEST' ? 'https://test.cashfree.com' : 'https://api.cashfree.com';
};

/**
 * Creates a Cashfree payment order (v1/v2 API matching old bot)
 */
export async function createCashfreeOrder({ orderId, orderAmount, customerEmail, customerPhone, returnUrl }) {
  const { appId, secretKey } = await getCfConfig();
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/api/v1/order/create`;

  const payload = {
    appId,
    secretKey,
    orderId: orderId || `ORD_${Date.now()}`,
    orderAmount: parseFloat(orderAmount).toFixed(2),
    orderCurrency: 'INR',
    customerEmail: customerEmail || 'customer@quantumxd.store',
    customerPhone: customerPhone || '9999999999',
    returnUrl: returnUrl || `${process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://quantumxd.store'}/api/payments/cashfree/return?order_id=${orderId}`,
    notifyUrl: `${process.env.BACKEND_URL || process.env.FRONTEND_URL || 'https://quantumxd.store'}/api/payments/cashfree/webhook`,
  };

  try {
    const response = await axios.post(url, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const data = response.data;
    if (data.status === 'OK' && data.paymentLink) {
      return {
        success: true,
        paymentLink: data.paymentLink,
        orderId: payload.orderId,
        data,
      };
    }

    console.error('Cashfree order creation error:', data);
    return {
      success: false,
      error: data.reason || 'Failed to create Cashfree payment link',
      data,
    };
  } catch (err) {
    console.error('Cashfree exception:', err.response?.data || err.message);
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Checks Cashfree order status
 */
export async function checkCashfreeStatus(orderId) {
  const { appId, secretKey } = await getCfConfig();
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/api/v1/order/info/status`;

  const payload = {
    appId,
    secretKey,
    orderId,
  };

  try {
    const response = await axios.post(url, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const data = response.data;
    if (data.status === 'OK' && data.txStatus === 'SUCCESS') {
      return { isPaid: true, txStatus: 'SUCCESS', data };
    }
    return { isPaid: false, txStatus: data.txStatus || data.status, data };
  } catch (err) {
    console.error('Cashfree status check exception:', err.response?.data || err.message);
    return { isPaid: false, error: err.message };
  }
}
