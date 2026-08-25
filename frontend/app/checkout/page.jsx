'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const DEFAULT_METHODS = [
  {
    id: 'upi_qr',
    label: 'UPI / QR Code',
    desc: 'Instant UPI (Google Pay, PhonePe, Paytm, BHIM)',
    icon: 'qr_code_2',
    color: '#10B981',
    note: 'Scan QR or pay to UPI ID, submit 12-digit UTR',
  },
  {
    id: 'cashfree',
    label: 'Cashfree PG',
    desc: 'UPI (GPay/PhonePe), Cards & NetBanking',
    icon: 'credit_card',
    color: '#00A0E3',
    note: 'Instant automated delivery via Cashfree',
  },
  {
    id: 'nowpayments',
    label: 'Crypto (NOWPayments)',
    desc: 'BTC, ETH, USDT, SOL + 100 more',
    icon: 'currency_bitcoin',
    color: '#F7931A',
    note: 'Automated crypto invoice • 3 hour timeout',
  },
  {
    id: 'binance',
    label: 'Binance Pay',
    desc: 'Direct transfer via Binance App (0% fee)',
    icon: 'payments',
    color: '#F0B90B',
    note: 'Min $1 • Submit TX ID after payment',
  },
  {
    id: 'wallet',
    label: 'Wallet Balance',
    desc: '1-Click Instant Automated Checkout',
    icon: 'account_balance_wallet',
    color: '#8B5CF6',
    note: 'Deducted directly from your account',
  },
];

function CheckoutContent() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [availableMethods, setAvailableMethods] = useState(DEFAULT_METHODS);
  const [paymentMethod, setPaymentMethod] = useState('upi_qr');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [binanceTxId, setBinanceTxId] = useState('');
  const [upiUtr, setUpiUtr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState(null); // 'pending' | 'under_review' | 'paid'

  const searchParams = useSearchParams();
  const cfStatus = searchParams ? searchParams.get('cf_status') : null;
  const queryOrderId = searchParams ? searchParams.get('order_id') : null;

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) * (i.quantity || 1)), 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user?.email) setEmail(user.email);
  }, [user]);

  // Fetch active payment methods from backend
  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const { data } = await api.get('/payments/methods');
        if (data.methods && data.methods.length > 0) {
          setAvailableMethods(data.methods);
          if (!data.methods.some((m) => m.id === paymentMethod)) {
            setPaymentMethod(data.methods[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading payment methods:', err);
      }
    };
    fetchMethods();
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderData && !cfStatus) {
      router.push('/products');
    }
  }, [mounted, items, orderData, cfStatus, router]);

  // Handle redirect from Cashfree with immediate verification
  useEffect(() => {
    if (cfStatus === 'check' && queryOrderId) {
      setOrderData((prev) => prev || { order_id: queryOrderId, order_number: queryOrderId });
      setStatus('pending');
      setPaymentMethod('cashfree');

      api.post('/payments/cashfree/verify', { order_id: queryOrderId })
        .then(({ data }) => {
          if (data.payment_status === 'paid' || data.success) {
            setStatus('paid');
            setOrderData({ order_id: data.order_id || queryOrderId, order_number: data.order_id || queryOrderId });
            clearCart();
            toast.success('Payment verified successfully!');
          }
        })
        .catch(console.error);
    }
  }, [cfStatus, queryOrderId]);

  // Poll order status after payment initiated (for automated gateways)
  useEffect(() => {
    if (!orderData?.order_id || status === 'paid' || status === 'under_review') return;
    const checkStatus = async () => {
      try {
        if (paymentMethod === 'cashfree') {
          const { data } = await api.post('/payments/cashfree/verify', { order_id: orderData.order_id });
          if (data.payment_status === 'paid' || data.success) {
            setStatus('paid');
            setOrderData({ order_id: data.order_id || orderData.order_id, order_number: data.order_id || orderData.order_id });
            clearCart();
            return;
          }
        }
        const { data } = await api.get(`/payments/status/${orderData.order_id}`);
        if (data.payment_status === 'paid') {
          setStatus('paid');
          clearCart();
        }
      } catch { /* ignore */ }
    };

    const timer = setInterval(checkStatus, 3000);
    return () => clearInterval(timer);
  }, [orderData?.order_id, status, paymentMethod, clearCart]);

  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return toast.error('Please enter a coupon code');
    setValidatingCoupon(true);
    try {
      const { data } = await api.post('/payments/coupon/validate', {
        code: coupon.trim(),
        cart_total: subtotal,
      });
      if (data.valid) {
        setAppliedCouponCode(data.code);
        setCouponDiscount(data.discount_amount);
        toast.success(data.message || `Coupon "${data.code}" applied!`);
      }
    } catch (err) {
      setAppliedCouponCode('');
      setCouponDiscount(0);
      toast.error(err.response?.data?.error || 'Invalid or expired coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon('');
    setAppliedCouponCode('');
    setCouponDiscount(0);
    toast.success('Coupon removed');
  };

  const handleInitiatePayment = async () => {
    if (!email) return toast.error('Email is required to receive your product delivery');
    
    if (paymentMethod === 'wallet') {
      if (!user) return toast.error('Please sign in to use your wallet balance');
      if ((user.balance || 0) < total) {
        return toast.error(`Insufficient wallet balance (₹${(user.balance || 0).toFixed(2)}). Please top up first.`);
      }
    }

    setLoading(true);
    try {
      const first = items[0] || {};
      const { data } = await api.post('/payments/initiate', {
        product_id: first.product_id,
        variant_id: first.variant_id,
        quantity: first.quantity || 1,
        items: items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity || 1 })),
        payment_method: paymentMethod,
        coupon_code: coupon || undefined,
        email,
      });

      setOrderData(data);

      if (data.payment_status === 'paid') {
        setStatus('paid');
        clearCart();
        toast.success('Paid successfully with wallet balance!');
      } else if (data.payment_link) {
        setStatus('pending');
        window.open(data.payment_link, '_blank');
        toast.success('Cashfree payment window opened!');
      } else if (data.invoice_url) {
        setStatus('pending');
        window.open(data.invoice_url, '_blank');
        toast.success('Crypto payment window opened!');
      } else {
        setStatus('pending');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBinance = async () => {
    if (!binanceTxId.trim()) return toast.error('Enter your Binance transaction ID');
    setVerifying(true);
    try {
      const res = await api.post('/payments/binance/verify', { order_id: orderData.order_id, tx_id: binanceTxId.trim() });
      if (res.data.payment_status === 'paid' || (res.data.success && !res.data.under_review)) {
        setStatus('paid');
        clearCart();
        toast.success('Binance payment verified!');
      } else {
        setStatus('under_review');
        clearCart();
        toast.success('Binance transaction ID submitted for review!');
      }
    } catch (err) {
      try {
        await api.post('/payments/upi/submit', { order_id: orderData.order_id, utr_number: `BINANCE_${binanceTxId.trim()}` });
        setStatus('under_review');
        clearCart();
        toast.success('Binance transaction proof submitted! Order is under review.');
      } catch (_) {
        toast.error(err.response?.data?.error || 'Failed to submit Binance proof');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitUpiUtr = async () => {
    if (!upiUtr.trim() || upiUtr.trim().length < 6) {
      return toast.error('Please enter a valid 12-digit UPI UTR / Reference ID');
    }
    setVerifying(true);
    try {
      const { data } = await api.post('/payments/upi/submit', {
        order_id: orderData.order_id,
        utr_number: upiUtr.trim(),
      });
      setStatus('under_review');
      clearCart();
      toast.success('UTR submitted successfully! Order is under review.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit UPI UTR');
    } finally {
      setVerifying(false);
    }
  };

  // === UNDER REVIEW STATE (UPI UTR Submitted) ===
  if (status === 'under_review') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 'calc(var(--header-height) + 40px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 500, background: 'var(--color-surface)', padding: 32, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
            border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: '#10B981',
          }}>
            <span className="icon" style={{ fontSize: 44 }}>verified</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--color-text)' }}>
            UPI Payment Submitted!
          </h1>
          <p style={{ color: 'var(--color-primary-light)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            Order #{orderData?.order_number}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Your 12-digit UTR (<strong>{upiUtr}</strong>) has been received. Our admin / automated bot is verifying the transfer. Credentials will be dispatched to <strong>{email}</strong> shortly.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={orderData?.order_id ? `/dashboard/order/${orderData.order_id}` : '/dashboard'} className="btn btn--primary" style={{ gap: 6 }}>
              <span className="icon icon--sm">receipt_long</span>
              <span>View My Orders</span>
            </Link>
            <Link href="/products" className="btn btn--ghost">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // === PAID STATE ===
  if (status === 'paid') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 'calc(var(--header-height) + 40px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, background: 'var(--color-surface)', padding: 32, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
            border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: '#10B981',
          }}>
            <span className="icon" style={{ fontSize: 40 }}>check_circle</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, marginBottom: 12, color: 'var(--color-text)' }}>Payment Successful!</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 700 }}>Order #{orderData?.order_number}</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 32, fontSize: 14 }}>
            Your digital product has been unlocked and delivered to <strong>{email}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={orderData?.order_id ? `/dashboard/order/${orderData.order_id}` : '/dashboard'} className="btn btn--primary" style={{ gap: 6 }}>
              <span className="icon icon--sm">receipt_long</span>
              <span>View in My Orders</span>
            </Link>
            <Link href="/products" className="btn btn--ghost">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 40px)', paddingBottom: 80 }}>
      <div className="container">
        
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 24 }}>
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/products">Products</Link>
          <span>/</span>
          <span style={{ color: 'var(--color-text)' }}>Secure Checkout</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 800, marginBottom: 32, color: 'var(--color-text)' }}>
          Secure Checkout
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          
          {/* LEFT: Delivery & Payment Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Delivery Email */}
            <div className="card card--elevated" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>email</span>
                Delivery Email
              </h3>
              <div className="form-group">
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <p className="form-hint">Digital license keys and download links will be sent here immediately.</p>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="card card--elevated" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>local_offer</span>
                Have a Coupon Code?
              </h3>
              
              {appliedCouponCode ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="icon icon--sm icon--filled" style={{ color: '#10B981' }}>verified</span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                        {appliedCouponCode} APPLIED
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        You are saving ₹{couponDiscount.toFixed(2)} on this order
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="btn btn--outline btn--sm"
                    style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. FLASH50"
                    value={coupon}
                    onChange={e => setCoupon(e.target.value.toUpperCase())}
                    style={{ flex: 1, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon}
                    style={{ fontWeight: 700, minWidth: 80 }}
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            {!orderData && (
              <div className="card card--elevated" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                  <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>payments</span>
                  Select Payment Method
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {availableMethods.map(m => {
                    const isWallet = m.id === 'wallet';
                    const walletBal = user?.balance || 0;
                    const isSelected = paymentMethod === m.id;

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
                          background: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)',
                          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                          transition: 'var(--transition-fast)',
                          boxShadow: isSelected ? '0 0 16px rgba(79, 70, 229, 0.2)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 42, height: 42, borderRadius: 10, background: `${m.color || '#4F46E5'}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color || '#4F46E5', flexShrink: 0
                        }}>
                          <span className="icon icon--lg icon--filled">{m.icon || 'payments'}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                            {m.label || m.title}
                            {isWallet && (
                              <span style={{ fontSize: 12, color: walletBal >= total ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                                (₹{walletBal.toFixed(2)})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{m.desc}</div>
                          {m.note && <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 3 }}>{m.note}</div>}
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {isSelected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn--primary btn--full"
                  style={{ marginTop: 24, height: 48, fontSize: 16, fontWeight: 700 }}
                  onClick={handleInitiatePayment}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (
                    <>
                      <span className="icon icon--md">lock</span>
                      Pay ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0 })} Now
                    </>
                  )}
                </button>
              </div>
            )}

            {/* === UPI / QR CODE PENDING PANEL === */}
            {orderData && (paymentMethod === 'upi' || paymentMethod === 'upi_qr') && status === 'pending' && (
              <div className="card card--elevated" style={{ padding: 24, border: '1px solid #10B981' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--md icon--filled">qr_code_2</span>
                  Complete UPI Payment (₹{total.toLocaleString('en-IN')})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24, padding: 20, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                  {/* Dynamic QR Code */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${encodeURIComponent(orderData.upi_id || 'quantumxd@upi')}&pn=${encodeURIComponent(orderData.merchant_name || 'QuantumXD')}&am=${total}&cu=INR`}
                    alt="UPI QR Code"
                    style={{ width: 180, height: 180, borderRadius: 12, background: '#fff', padding: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                  />

                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>UPI ID (Click to Copy):</div>
                    <div
                      onClick={() => {
                        navigator.clipboard.writeText(orderData.upi_id || 'quantumxd@upi');
                        toast.success('UPI ID copied to clipboard!');
                      }}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        background: 'var(--color-surface)',
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px dashed var(--color-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{orderData.upi_id || 'quantumxd@upi'}</span>
                      <span className="icon icon--sm icon--cyan">content_copy</span>
                    </div>
                  </div>

                  <a
                    href={`upi://pay?pa=${encodeURIComponent(orderData.upi_id || 'quantumxd@upi')}&pn=${encodeURIComponent(orderData.merchant_name || 'QuantumXD')}&am=${total}&cu=INR`}
                    className="btn btn--outline btn--sm"
                    style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  >
                    <span className="icon icon--sm">smartphone</span>
                    Pay via GPay / PhonePe / Paytm App
                  </a>
                </div>

                {/* UTR Submission Box */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
                    Enter 12-Digit UPI UTR / Reference ID
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 423456789012"
                      value={upiUtr}
                      onChange={e => setUpiUtr(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn btn--primary"
                      onClick={handleSubmitUpiUtr}
                      disabled={verifying}
                      style={{ fontWeight: 700, padding: '0 20px' }}
                    >
                      {verifying ? 'Submitting...' : 'Submit UTR'}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 6 }}>
                    Find this 12-digit number in your Google Pay / PhonePe / Paytm transaction receipt.
                  </p>
                </div>
              </div>
            )}

            {/* === CASHFREE PENDING PANEL === */}
            {orderData && paymentMethod === 'cashfree' && status === 'pending' && (
              <div className="card card--elevated" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, color: '#00A0E3', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--md">credit_card</span>
                  Complete Cashfree Payment
                </h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  A secure Cashfree payment window was opened. Please complete your payment using UPI (GPay, PhonePe), Cards, or NetBanking.
                </p>
                <a
                  href={orderData.payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary btn--full"
                  style={{ marginBottom: 16 }}
                >
                  <span className="icon icon--md">open_in_new</span>
                  Reopen Cashfree Payment Page
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: 'var(--color-warning)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                  Waiting for Cashfree confirmation... This page updates automatically.
                </div>
              </div>
            )}

            {/* === CRYPTO PENDING PANEL === */}
            {orderData && paymentMethod === 'nowpayments' && status === 'pending' && (
              <div className="card card--elevated" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, color: '#F7931A', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--md">currency_bitcoin</span>
                  Complete Crypto Payment
                </h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Click below to open NowPayments invoice and choose your preferred cryptocurrency.
                </p>
                <a
                  href={orderData.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary btn--full"
                >
                  <span className="icon icon--md">open_in_new</span>
                  Open Crypto Invoice
                </a>
              </div>
            )}

            {/* === BINANCE PAY PANEL === */}
            {orderData && paymentMethod === 'binance' && status === 'pending' && (
              <div className="card card--elevated" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 20, color: '#F0B90B', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--md">payments</span>
                  Binance Pay Transfer
                </h3>
                <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Binance Pay ID:</div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: '#F0B90B' }}>
                    {orderData.binance_pay_id || '1133813547'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter Transaction ID / Order ID"
                    value={binanceTxId}
                    onChange={e => setBinanceTxId(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn--primary"
                    onClick={handleVerifyBinance}
                    disabled={verifying}
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: Order Summary */}
          <div>
            <div className="card card--elevated" style={{ padding: 24, position: 'sticky', top: 'calc(var(--header-height) + 20px)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}>
                <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>receipt</span>
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div style={{ minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                        {item.title} {item.quantity > 1 && <span style={{ color: 'var(--color-primary-light)' }}>x{item.quantity}</span>}
                      </div>
                      {item.variant_name && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{item.variant_name}</div>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, flexShrink: 0, color: 'var(--color-text)' }}>₹{(parseFloat(item.price) * (item.quantity || 1)).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#10B981' }}>
                    <span>Discount</span>
                    <span>-₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
                  <span style={{ color: 'var(--color-text)' }}>Total</span>
                  <span style={{ color: 'var(--color-primary-light)' }}>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-spinner"></div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
