'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STATUS_COLORS = { paid: 'success', pending: 'pending', failed: 'failed', expired: 'expired' };

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    api.get('/users/orders').then(({ data }) => setOrders(data.orders || [])).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
          {/* Sidebar */}
          <aside>
            <div className="card card--elevated" style={{ padding: 20, position: 'sticky', top: 90 }}>
              {/* Avatar */}
              <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, margin: '0 auto 12px' }}>
                  {user.name?.[0]}
                </div>
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16 }}>{user.name}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-faint)', marginTop: 4 }}>{user.email}</p>
              </div>

              {/* Balance */}
              <div style={{ background: 'var(--gradient-primary-soft)', border: '1px solid rgba(110,58,255,0.2)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--color-accent)' }}>
                  ₹{parseFloat(user.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Nav */}
              {['orders', 'profile', 'support'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: 'none',
                    background: activeTab === tab ? 'rgba(110,58,255,0.1)' : 'transparent',
                    color: activeTab === tab ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, transition: 'var(--transition-fast)',
                    textTransform: 'capitalize',
                  }}
                >
                  <span className="icon icon--sm">{tab === 'orders' ? 'receipt' : tab === 'profile' ? 'person' : 'support_agent'}</span>
                  {tab}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div>
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
                  My Orders
                </h2>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="empty-state">
                    <span className="icon empty-state__icon">receipt_long</span>
                    <h3 className="empty-state__title">No orders yet</h3>
                    <p className="empty-state__desc">Your purchases will appear here</p>
                    <Link href="/products" className="btn btn--primary">Browse Products</Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {orders.map(order => (
                      <div key={order.id} className="card card--elevated" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>
                              #{order.order_number}
                            </p>
                            <p style={{ fontSize: 13, color: 'var(--color-text-faint)', marginTop: 2 }}>
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`status status--${STATUS_COLORS[order.payment_status] || 'pending'}`}>
                              {order.payment_status}
                            </span>
                            <p style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>
                              ₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>

                        {/* Items */}
                        {order.items?.filter(Boolean).map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{item.title}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {order.payment_status === 'paid' && item.download_token && (
                                <a
                                  href={`${process.env.NEXT_PUBLIC_API_URL}/api/download/${item.download_token}`}
                                  target="_blank"
                                  className="btn btn--primary btn--sm"
                                  rel="noopener noreferrer"
                                >
                                  <span className="icon icon--sm">download</span>
                                  Download
                                </a>
                              )}
                              {order.payment_status === 'paid' && item.delivered_content && !item.download_token && (
                                <span style={{ fontSize: 13, fontFamily: 'monospace', background: 'var(--color-surface-3)', padding: '4px 10px', borderRadius: 6, color: 'var(--color-accent)' }}>
                                  {item.delivered_content}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && <ProfileTab user={user} />}

            {/* SUPPORT TAB */}
            {activeTab === 'support' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Support</h2>
                <div className="grid grid--2" style={{ gap: 16 }}>
                  {[
                    { icon: 'send', title: 'Telegram Support', desc: 'Fastest response. Available 24/7.', href: 'https://t.me/your_support_username', label: 'Open Telegram' },
                    { icon: 'email', title: 'Email Support', desc: 'For detailed issues. Reply within 24h.', href: 'mailto:digitalshoppei@gmail.com', label: 'Send Email' },
                  ].map(s => (
                    <div key={s.title} className="card card--elevated" style={{ padding: 24 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gradient-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', marginBottom: 16 }}>
                        <span className="icon icon--xl">{s.icon}</span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>{s.desc}</p>
                      <a href={s.href} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--sm">
                        <span className="icon icon--sm">{s.icon}</span>
                        {s.label}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }) {
  const [form, setForm] = useState({ name: user.name || '', telegram_username: user.telegram_username || '' });
  const [saving, setSaving] = useState(false);
  const { refreshUser } = useAuthStore();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      await refreshUser();
      toast.success('Profile updated');
    } catch { toast.error('Failed to update'); }
    setSaving(false);
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Profile Settings</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        <div className="card card--elevated" style={{ padding: 28 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Personal Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user.email} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Telegram Username</label>
              <input className="form-input" placeholder="@yourusername" value={form.telegram_username} onChange={e => setForm(f => ({ ...f, telegram_username: e.target.value }))} />
            </div>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Top Up Wallet Section directly in Profile Tab */}
        <div className="card card--elevated" style={{ padding: 28 }}>
          <WalletTopup user={user} refreshUser={refreshUser} />
        </div>
      </div>
    </div>
  );
}

function WalletTopup({ user, refreshUser }) {
  const [amount, setAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('cashfree');
  const [loading, setLoading] = useState(false);

  const presets = ['100', '250', '500', '1000', '2000'];

  const handleTopup = async () => {
    const num = parseFloat(amount);
    if (!num || num < 10) {
      toast.error('Minimum topup amount is ₹10');
      return;
    }

    setLoading(true);
    try {
      // Changed to /users/wallet/topup instead of /api/users/wallet/topup
      const res = await api.post('/users/wallet/topup', {
        amount: num,
        payment_method: paymentMethod,
      });

      if (res.data.payment_link) {
        window.open(res.data.payment_link, '_blank');
        toast.success('Cashfree payment link opened in a new tab!');
      } else if (res.data.invoice_url) {
        window.open(res.data.invoice_url, '_blank');
        toast.success('Crypto payment page opened!');
      } else if (res.data.balance !== undefined) {
        toast.success(res.data.message || `₹${num} added to wallet!`);
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate topup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Top Up Wallet</h3>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Current Balance: <strong style={{ color: 'var(--color-accent)' }}>₹{(user?.balance || 0).toFixed(2)}</strong>
      </p>

      {/* Preset Amount Pills */}
      <div style={{ marginBottom: 18 }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Choose Amount</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              style={{
                padding: '8px 0', borderRadius: 'var(--radius-sm)',
                background: amount === p ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: amount === p ? '#fff' : 'var(--color-text)',
                border: `1px solid ${amount === p ? 'var(--color-primary)' : 'var(--color-border)'}`,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)'
              }}
            >
              ₹{p}
            </button>
          ))}
        </div>
        <div className="form-group">
          <input
            type="number"
            className="form-input"
            placeholder="Or enter custom amount in ₹"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="10"
            style={{ fontSize: 15 }}
          />
        </div>
      </div>

      {/* Payment Gateway Options */}
      <div style={{ marginBottom: 24 }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Payment Method</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Cashfree */}
          <button
            type="button"
            onClick={() => setPaymentMethod('cashfree')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: paymentMethod === 'cashfree' ? 'rgba(110,58,255,0.08)' : 'var(--color-surface-2)',
              border: `1px solid ${paymentMethod === 'cashfree' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <span className="icon icon--md" style={{ color: '#00A0E3' }}>credit_card</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cashfree (UPI, Cards)</div>
            </div>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${paymentMethod === 'cashfree' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {paymentMethod === 'cashfree' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
            </div>
          </button>
          
          {/* Crypto */}
          <button
            type="button"
            onClick={() => setPaymentMethod('nowpayments')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: paymentMethod === 'nowpayments' ? 'rgba(110,58,255,0.08)' : 'var(--color-surface-2)',
              border: `1px solid ${paymentMethod === 'nowpayments' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <span className="icon icon--md" style={{ color: '#F7931A' }}>currency_bitcoin</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Crypto (NOWPayments)</div>
            </div>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: `2px solid ${paymentMethod === 'nowpayments' ? 'var(--color-primary)' : 'var(--color-border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {paymentMethod === 'nowpayments' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
            </div>
          </button>
        </div>
      </div>

      <button className="btn btn--primary btn--full" onClick={handleTopup} disabled={loading}>
        {loading ? (
          <>
            <span className="icon icon--sm icon--spin">refresh</span> Processing...
          </>
        ) : (
          `Top Up ₹${parseFloat(amount || 0).toFixed(2)}`
        )}
      </button>
    </div>
  );
}
