import axios from 'axios';
import querystring from 'querystring';

const getCfConfig = () => ({
  appId: process.env.CF_CLIENT_ID || '13189604096003c23c53718d3280698131',
  secretKey: process.env.CF_SECRET || 'cfsk_ma_prod_a02505b8be151e6c5f2187e1d147ec61_da93f571',
  env: (process.env.CF_ENV || 'PRODUCTION').toUpperCase(),
});

const getBaseUrl = () => {
  const { env } = getCfConfig();
  return env === 'SANDBOX' ? 'https://test.cashfree.com' : 'https://api.cashfree.com';
};

/**
 * Creates a Cashfree payment order (v1/v2 API matching old bot)
 */
export async function createCashfreeOrder({ orderId, orderAmount, customerEmail, customerPhone, returnUrl }) {
  const { appId, secretKey } = getCfConfig();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/v1/order/create`;

  const payload = {
    appId,
    secretKey,
    orderId: orderId || `ORD_${Date.now()}`,
    orderAmount: parseFloat(orderAmount).toFixed(2),
    orderCurrency: 'INR',
    customerEmail: customerEmail || 'customer@quantumxd.store',
    customerPhone: customerPhone || '9999999999',
    returnUrl: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout?cf_status=check&order_id=${orderId}`,
    notifyUrl: `${process.env.FRONTEND_URL?.replace('3000', '5000') || 'http://localhost:5000'}/api/payments/cashfree/webhook`,
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
  const { appId, secretKey } = getCfConfig();
  const baseUrl = getBaseUrl();
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
