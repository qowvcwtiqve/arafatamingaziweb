'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
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
    label: 'Crypto',
    desc: 'BTC, ETH, USDT, SOL + 100 more',
    icon: 'currency_bitcoin',
    color: '#F7931A',
    note: '5% network fee • 3 hour timeout',
  },
  {
    id: 'binance',
    label: 'Binance Pay',
    desc: 'Direct transfer via Binance App',
    icon: 'payments',
    color: '#F0B90B',
    note: 'Min $1 • Submit TX ID after payment',
  },
  {
    id: 'wallet',
    label: 'Wallet Balance',
    desc: '1-Click Instant Checkout',
    icon: 'account_balance_wallet',
    color: '#10B981',
    note: 'Deducted directly from your account',
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState('cashfree');
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [binanceTxId, setBinanceTxId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState(null); // 'pending' | 'paid'

  const subtotal = items.reduce((s, i) => s + parseFloat(i.price), 0);
  const total = Math.max(0, subtotal - couponDiscount);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user?.email) setEmail(user.email);
  }, [user]);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderData) {
      router.push('/products');
    }
  }, [mounted, items, orderData, router]);

  // Poll order status after payment initiated
  useEffect(() => {
    if (!orderData || status === 'paid') return;
    const timer = setInterval(async () => {
      try {
        if (paymentMethod === 'cashfree') {
          const { data } = await api.post('/payments/cashfree/verify', { order_id: orderData.order_id });
          if (data.payment_status === 'paid') {
            setStatus('paid');
            clearCart();
            clearInterval(timer);
            return;
          }
        }
        const { data } = await api.get(`/payments/status/${orderData.order_id}`);
        if (data.payment_status === 'paid') {
          setStatus('paid');
          clearCart();
          clearInterval(timer);
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [orderData, status, paymentMethod, clearCart]);

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      // Simulate coupon discount
      if (coupon.toUpperCase() === 'SAVE10') {
        setCouponDiscount(subtotal * 0.1);
        toast.success('Coupon SAVE10 applied! 10% discount');
      } else if (coupon.toUpperCase() === 'FIRSTBUY') {
        setCouponDiscount(Math.min(100, subtotal));
        toast.success('Coupon FIRSTBUY applied! ₹100 discount');
      } else {
        toast.error('Invalid coupon code');
      }
    } catch {
      toast.error('Could not apply coupon');
    }
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
      const { data } = await api.post('/payments/initiate', {
        items: items.map(i => ({ product_id: i.product_id, variant_id: i.variant_id })),
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
      await api.post('/payments/binance/verify', { order_id: orderData.order_id, tx_id: binanceTxId });
      setStatus('paid');
      clearCart();
      toast.success('Payment verified!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transaction not found');
    } finally {
      setVerifying(false);
    }
  };

  // === PAID STATE ===
  if (status === 'paid') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 'calc(var(--header-height) + 40px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
            border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', color: '#10b981',
          }}>
            <span className="icon" style={{ fontSize: 40 }}>check_circle</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Payment Successful!</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 8 }}>Order #{orderData?.order_number}</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>
            Your digital product has been unlocked and delivered to <strong>{email}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/dashboard" className="btn btn--primary">
              <span className="icon icon--sm">folder</span>
              View My Downloads
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

        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
          Secure Checkout
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          
          {/* LEFT: Delivery & Payment Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Delivery Email */}
            <div className="card card--elevated" style={{ padding: 24 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>local_offer</span>
                Have a Coupon Code?
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SAVE10"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value.toUpperCase())}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn--outline" onClick={handleApplyCoupon}>
                  Apply
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            {!orderData && (
              <div className="card card--elevated" style={{ padding: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>payments</span>
                  Select Payment Method
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PAYMENT_METHODS.map(m => {
                    const isWallet = m.id === 'wallet';
                    const walletBal = user?.balance || 0;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
                          background: paymentMethod === m.id ? 'rgba(110,58,255,0.08)' : 'var(--color-surface-2)',
                          border: `1px solid ${paymentMethod === m.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                          transition: 'var(--transition-fast)',
                          boxShadow: paymentMethod === m.id ? 'var(--shadow-glow)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, background: `${m.color}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, flexShrink: 0
                        }}>
                          <span className="icon icon--lg">{m.icon}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {m.label}
                            {isWallet && (
                              <span style={{ fontSize: 12, color: walletBal >= total ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                (₹{walletBal.toFixed(2)})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{m.desc}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 3 }}>{m.note}</div>
                        </div>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: `2px solid ${paymentMethod === m.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {paymentMethod === m.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  className="btn btn--primary btn--full"
                  style={{ marginTop: 24, height: 48, fontSize: 16 }}
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
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="icon icon--md" style={{ color: 'var(--color-primary-light)' }}>receipt</span>
                Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <div style={{ minWidth: 0, paddingRight: 8 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </div>
                      {item.variant_name && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{item.variant_name}</div>
                      )}
                    </div>
                    <div style={{ fontWeight: 600, flexShrink: 0 }}>₹{parseFloat(item.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-text-muted)' }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#10b981' }}>
                    <span>Discount</span>
                    <span>-₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
                  <span>Total</span>
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
