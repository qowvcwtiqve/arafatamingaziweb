'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useCurrency } from '../../store/currencyStore';
import api from '../../lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

const renderOrderStatusBadge = (order) => {
  const rawStatus = String(order?.status || order?.order_status || order?.payment_status || '').trim();
  const s = rawStatus.toLowerCase().replace(/[^a-z]/g, '');

  if (s === 'refunded') {
    return (
      <span style={{
        padding: '5px 14px', borderRadius: 'var(--radius-full)',
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.45)',
        color: '#60a5fa',
        fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 0 16px rgba(59, 130, 246, 0.2)'
      }}>
        <span className="icon icon--sm" style={{ fontSize: 14 }}>currency_exchange</span>
        <span>Refunded</span>
      </span>
    );
  }

  if (s === 'canceled' || s === 'cancelled' || s === 'failed') {
    return (
      <span style={{
        padding: '5px 14px', borderRadius: 'var(--radius-full)',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.45)',
        color: '#f87171',
        fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 0 16px rgba(239, 68, 68, 0.2)'
      }}>
        <span className="icon icon--sm" style={{ fontSize: 14 }}>cancel</span>
        <span>Canceled</span>
      </span>
    );
  }

  if (s === 'delivered' || s === 'completed' || (s === 'paid' && Boolean(order?.credentials || order?.items?.[0]?.delivered_content))) {
    return (
      <span style={{
        padding: '5px 14px', borderRadius: 'var(--radius-full)',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.45)',
        color: '#10b981',
        fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)'
      }}>
        <span className="icon icon--sm" style={{ fontSize: 14 }}>check_circle</span>
        <span>Delivered</span>
      </span>
    );
  }

  if (s === 'preorder') {
    return (
      <span style={{
        padding: '5px 14px', borderRadius: 'var(--radius-full)',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.2) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.6)',
        color: '#c084fc',
        fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        boxShadow: '0 0 16px rgba(168, 85, 247, 0.25)'
      }}>
        <span className="icon icon--sm" style={{ fontSize: 14 }}>rocket_launch</span>
        <span>Pre-Order</span>
      </span>
    );
  }

  // Pending / Manual Processing
  return (
    <span style={{
      padding: '5px 14px', borderRadius: 'var(--radius-full)',
      background: 'rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.45)',
      color: '#fbbf24',
      fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      boxShadow: '0 0 16px rgba(245, 158, 11, 0.2)'
    }}>
      <span className="icon icon--sm" style={{ fontSize: 14 }}>hourglass_top</span>
      <span>Pending Manual</span>
    </span>
  );
};

function DashboardContent() {
  const router = useRouter();
  const { user, logout, refreshUser, _hasHydrated } = useAuthStore();
  const { format } = useCurrency();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [liveBalance, setLiveBalance] = useState(null); // fresh from server

  const searchParams = useSearchParams();
  const topupStatus = searchParams.get('topup_status');
  const queryOrderId = searchParams.get('order_id');
  const initialTab = searchParams.get('tab');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!mounted) return;

    let currentUser = user;
    if (!currentUser && typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('quantumxd-auth') || '{}');
        currentUser = stored?.state?.user;
      } catch {}
    }

    if (!currentUser) {
      if (_hasHydrated) {
        router.push('/login');
      }
      return;
    }

    api.get('/users/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Always fetch fresh profile (balance) from server — localStorage is stale
    api.get('/users/profile')
      .then(({ data }) => setLiveBalance(parseFloat(data.user?.balance || 0)))
      .catch(() => {});
  }, [user, mounted, _hasHydrated, router]);

  // Handle Cashfree redirect for Topup
  useEffect(() => {
    if (topupStatus === 'check' && queryOrderId) {
      setActiveTab('wallet');
      const verifyTopup = async () => {
        try {
          const { data } = await api.post('/users/wallet/verify-cashfree', { order_id: queryOrderId });
          if (data.success) {
            toast.success('Wallet topped up successfully!');
            await refreshUser();
            window.location.href = '/dashboard?tab=wallet';
          } else {
            toast.error('Top-up is pending or failed.');
          }
        } catch {
          toast.error('Failed to verify top-up');
        }
      };
      verifyTopup();
    }
  }, [topupStatus, queryOrderId, refreshUser]);

  const displayUser = mounted
    ? (user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('quantumxd-auth') || '{}')?.state?.user : null))
    : null;

  // Always show server-fresh balance, fallback to store if not yet loaded
  const displayBalance = liveBalance !== null ? liveBalance : parseFloat(displayUser?.balance || 0);

  const handleRefreshBalance = async () => {
    try {
      const { data } = await api.get('/users/profile');
      setLiveBalance(parseFloat(data.user?.balance || 0));
      await refreshUser();
      toast.success('Balance refreshed!');
    } catch {
      toast.error('Failed to refresh balance');
    }
  };

  if (!mounted || !displayUser) return null;

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 24px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* User Hero Banner */}
        <div className="dashboard-hero-banner">
          {/* User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--gradient-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#fff',
              fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800,
              boxShadow: '0 0 20px rgba(110, 58, 255, 0.4)', flexShrink: 0
            }}>
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, margin: 0 }}>
                  {user.name}
                </h1>
                {user.role === 'admin' && (
                  <span className="badge badge--featured" style={{ fontSize: 10 }}>Admin</span>
                )}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: '3px 0 0 0' }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Quick Wallet Card */}
          <div className="dashboard-wallet-card">
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Wallet Balance
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, color: 'var(--color-accent)' }}>
                {format(displayBalance)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn--ghost btn--icon"
                onClick={handleRefreshBalance}
                title="Refresh balance"
                style={{ width: 32, height: 32 }}
              >
                <span className="icon icon--sm">refresh</span>
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => setActiveTab('wallet')}
                style={{ gap: 4, padding: '6px 12px', fontSize: 12 }}
              >
                <span className="icon icon--sm" style={{ fontSize: 14 }}>add</span>
                <span>Top Up</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Main Grid */}
        <div className="dashboard-layout-grid">
          
          {/* Sidebar Tabs Navigation */}
          <aside className="dashboard-sidebar-aside">
            <div className="dashboard-tabs-card">
              {[
                { id: 'orders', label: 'My Orders', icon: 'receipt_long' },
                { id: 'wallet', label: 'Wallet & Top Up', icon: 'account_balance_wallet' },
                { id: 'profile', label: 'Profile Settings', icon: 'manage_accounts' },
                { id: 'support', label: 'Help & Support', icon: 'support_agent' },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="dashboard-tab-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: 'none',
                      background: isActive ? 'var(--gradient-primary)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--color-text-muted)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13.5,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      boxShadow: isActive ? 'var(--shadow-glow)' : 'none'
                    }}
                  >
                    <span className="icon icon--sm" style={{ color: isActive ? '#fff' : 'var(--color-cyan)', fontSize: 16 }}>
                      {tab.icon}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                  </button>
                );
              })}

              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="dashboard-tab-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    color: 'var(--color-primary-light)', textDecoration: 'none',
                    fontSize: 13.5, fontWeight: 700
                  }}
                >
                  <span className="icon icon--sm" style={{ fontSize: 16 }}>admin_panel_settings</span>
                  <span style={{ whiteSpace: 'nowrap' }}>Admin Panel</span>
                </Link>
              )}

              <button
                onClick={logout}
                className="dashboard-tab-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  color: 'var(--color-error)', border: 'none', background: 'transparent',
                  fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                }}
              >
                <span className="icon icon--sm" style={{ fontSize: 16 }}>logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Tab Content */}
          <div>
            
            {/* 1. ORDERS TAB */}
            {activeTab === 'orders' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, margin: 0 }}>
                    My Orders
                  </h2>
                  <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    {orders.length} purchases
                  </span>
                </div>

                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }} />
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)'
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
                      color: 'var(--color-primary-light)'
                    }}>
                      <span className="icon icon--xl">receipt_long</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>
                      No purchases yet
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>
                      Your purchased accounts, keys and download files will be accessible here.
                    </p>
                    <Link href="/products" className="btn btn--primary btn--sm" style={{ gap: 6 }}>
                      <span className="icon icon--sm">storefront</span>
                      <span>Browse Store</span>
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {orders.map((order) => {
                      const rawStatus = String(order?.status || order?.order_status || order?.payment_status || '').trim();
                      const s = rawStatus.toLowerCase().replace(/[^a-z]/g, '');
                      const isRefunded = s === 'refunded';
                      const isCanceled = s === 'canceled' || s === 'cancelled' || s === 'failed';
                      const isDelivered = (s === 'delivered' || s === 'completed' || (s === 'paid' && Boolean(order?.credentials || order?.items?.[0]?.delivered_content))) && !isRefunded && !isCanceled;
                      const isPreorder = s === 'preorder' && !isRefunded && !isCanceled && !isDelivered;
                      const isPending = !isDelivered && !isPreorder && !isRefunded && !isCanceled;

                      return (
                        <div key={order.id} className="dashboard-order-card">
                          {/* Order Header */}
                          <div className="dashboard-order-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, color: 'var(--color-text)', letterSpacing: '0.02em' }}>
                                #{order.order_number || order.id}
                              </span>

                              {/* Live Status Badge */}
                              {renderOrderStatusBadge(order)}
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19, fontWeight: 900, color: 'var(--color-accent)' }}>
                                {format(order.total_amount)}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                                {order.payment_method || 'Online'}
                              </div>
                            </div>
                          </div>

                          {/* Purchase Date Bar */}
                          <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="icon icon--sm" style={{ fontSize: 14 }}>calendar_today</span>
                            <span>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Items & Deliverables List */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {order.items?.filter(Boolean).map((item, i) => (
                              <div key={i} className="dashboard-order-item-row">
                                <div style={{ flex: '1 1 200px' }}>
                                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                                    {item.title}
                                  </div>
                                  {item.variant_name && (
                                    <div style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 5,
                                      fontSize: 11.5, fontWeight: 700, color: 'var(--color-cyan)',
                                      background: 'rgba(0, 212, 255, 0.08)', padding: '2px 8px', borderRadius: 6
                                    }}>
                                      <span>{item.variant_name}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="dashboard-order-actions-wrap">
                                  {/* Pre-order Queue Notice */}
                                  {isPreorder && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 7,
                                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                                      padding: '8px 12px', borderRadius: 'var(--radius-md)',
                                      border: '1px solid rgba(168, 85, 247, 0.4)',
                                      fontSize: 12, fontWeight: 700, color: '#c084fc'
                                    }}>
                                      <span className="icon icon--sm" style={{ fontSize: 14 }}>rocket_launch</span>
                                      <span>Pre-Order Queued (Auto-dispatch on stock)</span>
                                    </div>
                                  )}

                                  {/* Refunded Notice */}
                                  {isRefunded && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 7,
                                      background: 'rgba(59, 130, 246, 0.12)', padding: '8px 12px',
                                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.4)',
                                      fontSize: 12, fontWeight: 700, color: '#60a5fa'
                                    }}>
                                      <span className="icon icon--sm" style={{ fontSize: 14 }}>currency_exchange</span>
                                      <span>Refunded to Wallet / Source</span>
                                    </div>
                                  )}

                                  {/* Canceled Notice */}
                                  {isCanceled && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 7,
                                      background: 'rgba(239, 68, 68, 0.12)', padding: '8px 12px',
                                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.4)',
                                      fontSize: 12, fontWeight: 700, color: '#f87171'
                                    }}>
                                      <span className="icon icon--sm" style={{ fontSize: 14 }}>cancel</span>
                                      <span>Order Canceled</span>
                                    </div>
                                  )}

                                  {/* Pending Manual Notice */}
                                  {isPending && (
                                    <div style={{
                                      display: 'flex', alignItems: 'center', gap: 7,
                                      background: 'rgba(245, 158, 11, 0.12)', padding: '8px 12px',
                                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.4)',
                                      fontSize: 12, fontWeight: 700, color: '#fbbf24'
                                    }}>
                                      <span className="icon icon--sm" style={{ fontSize: 14 }}>hourglass_top</span>
                                      <span>Manual Delivery in Progress</span>
                                    </div>
                                  )}

                                  {/* Delivered Credentials */}
                                  {isDelivered && (item.delivered_content || order.credentials) && !item.download_token && (
                                    <div className="dashboard-credentials-box">
                                      <span className="dashboard-credentials-text">
                                        {item.delivered_content || order.credentials}
                                      </span>
                                      <button
                                        className="btn btn--ghost btn--icon"
                                        onClick={() => {
                                          navigator.clipboard.writeText(item.delivered_content || order.credentials);
                                          toast.success('Credentials copied to clipboard');
                                        }}
                                        style={{ width: 28, height: 28, color: '#10b981', flexShrink: 0 }}
                                        title="Copy to clipboard"
                                      >
                                        <span className="icon" style={{ fontSize: 15 }}>content_copy</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Download Token Button */}
                                  {item.download_token && (
                                    <a
                                      href={`${process.env.NEXT_PUBLIC_API_URL}/api/download/${item.download_token}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn--primary btn--sm dashboard-order-details-btn"
                                      style={{ gap: 6, padding: '7px 14px' }}
                                    >
                                      <span className="icon icon--sm">download</span>
                                      <span>Download File</span>
                                    </a>
                                  )}

                                  {/* View Receipt Details Button */}
                                  <Link
                                    href={`/dashboard/order/${order.id}`}
                                    className="btn btn--outline btn--sm dashboard-order-details-btn"
                                    style={{
                                      gap: 6,
                                      padding: '7px 14px',
                                      borderColor: 'rgba(255, 255, 255, 0.15)',
                                      fontWeight: 700,
                                      background: 'rgba(255, 255, 255, 0.03)'
                                    }}
                                  >
                                    <span>Details</span>
                                    <span className="icon icon--sm" style={{ fontSize: 14 }}>chevron_right</span>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. WALLET & TOP UP TAB */}
            {activeTab === 'wallet' && (
              <WalletTopup
                user={{ ...user, balance: displayBalance }}
                refreshUser={async () => {
                  await refreshUser();
                  const { data } = await api.get('/users/profile').catch(() => ({ data: { user: {} } }));
                  setLiveBalance(parseFloat(data.user?.balance || 0));
                }}
              />
            )}

            {/* 3. PROFILE SETTINGS TAB */}
            {activeTab === 'profile' && (
              <ProfileTab
                user={{ ...user, balance: displayBalance }}
                refreshUser={async () => {
                  await refreshUser();
                  const { data } = await api.get('/users/profile').catch(() => ({ data: { user: {} } }));
                  setLiveBalance(parseFloat(data.user?.balance || 0));
                }}
              />
            )}

            {/* 4. HELP & SUPPORT TAB */}
            {activeTab === 'support' && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
                  24/7 Client Helpdesk &amp; Support
                </h2>

                <div className="grid grid--2" style={{ gap: 16 }}>
                  <div className="dashboard-content-card" style={{ padding: 24 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                      background: 'rgba(0, 212, 255, 0.1)', color: 'var(--color-cyan)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12
                    }}>
                      <span className="icon icon--md">send</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      Telegram Support Channel
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                      Fastest response time. Direct human support for license issues and inquiries.
                    </p>
                    <a
                      href="https://t.me/quantumxdservices"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--primary btn--sm"
                      style={{ gap: 6 }}
                    >
                      <span className="icon icon--sm">send</span>
                      <span>Open Telegram</span>
                    </a>
                  </div>

                  <div className="dashboard-content-card" style={{ padding: 24 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                      background: 'rgba(110, 58, 255, 0.1)', color: 'var(--color-primary-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12
                    }}>
                      <span className="icon icon--md">mail</span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      Email Helpdesk
                    </h3>
                    <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
                      For detailed business inquiries and bulk order quotations. Response within 24h.
                    </p>
                    <a
                      href="mailto:support@quantumxd.store"
                      className="btn btn--outline btn--sm"
                      style={{ gap: 6 }}
                    >
                      <span className="icon icon--sm">mail</span>
                      <span>Send Email</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

function ProfileTab({ user, refreshUser }) {
  const { format } = useCurrency();
  const [form, setForm] = useState({ name: user.name || '', telegram_username: user.telegram_username || '' });
  const [saving, setSaving] = useState(false);
  const [liveUser, setLiveUser] = useState(null);

  useEffect(() => {
    // Fetch full fresh profile from server
    api.get('/users/profile')
      .then(({ data }) => setLiveUser(data.user))
      .catch(() => {});
  }, []);

  const profile = liveUser || user;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      await refreshUser();
      toast.success('Profile details updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Account Stats Cards */}
      <div className="dashboard-stats-grid">
        {[
          {
            label: 'Wallet Balance',
            value: format(profile.balance || 0),
            icon: 'account_balance_wallet',
            color: 'var(--color-accent)',
          },
          {
            label: 'All-Time Topup',
            value: format(profile.all_time_topup || 0),
            icon: 'savings',
            color: '#10b981',
          },
          {
            label: 'Member Since',
            value: new Date(profile.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
            icon: 'calendar_month',
            color: '#a855f7',
          },
        ].map(k => (
          <div key={k.label} className="dashboard-stat-card">
            <div
              className="dashboard-stat-icon"
              style={{
                width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                background: `${k.color}18`, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <span className="icon icon--md" style={{ color: k.color }}>{k.icon}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="dashboard-stat-label" style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                {k.label}
              </div>
              <div className="dashboard-stat-value" style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {k.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Profile Edit Form */}
      <div className="dashboard-content-card">
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          Personal Profile &amp; Settings
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 20 }}>
          Update your display name and contact information.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block', fontSize: 12.5 }}>Full Name</label>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block', fontSize: 12.5 }}>Email Address</label>
            <input
              className="form-input"
              value={profile.email}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Email cannot be changed. Contact support if needed.</div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: 6, display: 'block', fontSize: 12.5 }}>Telegram Username</label>
            <input
              className="form-input"
              placeholder="@yourtelegram"
              value={form.telegram_username}
              onChange={e => setForm(f => ({ ...f, telegram_username: e.target.value }))}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Link your Telegram for faster support and order notifications.</div>
          </div>

          {/* Account Read-Only Info */}
          <div style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', padding: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            {[
              { label: 'User ID', value: `#${profile.id}` },
              { label: 'Role', value: profile.role || 'User' },
              { label: 'Currency', value: profile.currency || 'INR' },
              { label: 'Account Status', value: profile.is_frozen ? '🔒 Frozen' : '✅ Active' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-faint)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.value}</div>
              </div>
            ))}
          </div>

          <button
            className="btn btn--primary btn--md dashboard-save-btn"
            onClick={handleSave}
            disabled={saving}
            style={{ gap: 6 }}
          >
            <span className="icon icon--sm">save</span>
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}



function WalletTopup({ user, refreshUser }) {
  const { currency, current, presets, format, formatDirect, toINR, currentRate } = useCurrency();
  
  // Set default preset on load or currency change
  const [amount, setAmount] = useState(String(presets[2] || 500));
  const [paymentMethod, setPaymentMethod] = useState('');
  const [availableMethods, setAvailableMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualPayData, setManualPayData] = useState(null);
  const [manualTxInput, setManualTxInput] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  // When currency changes, automatically set amount to the 3rd preset of that currency!
  useEffect(() => {
    if (presets && presets.length > 2) {
      setAmount(String(presets[2]));
    }
  }, [currency]);

  useEffect(() => {
    api.get('/payments/methods')
      .then(({ data }) => {
        if (data.methods && data.methods.length > 0) {
          const filtered = data.methods.filter(m => m.id !== 'wallet');
          setAvailableMethods(filtered);
          if (filtered.length > 0) {
            setPaymentMethod(filtered[0].id);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleTopup = async () => {
    const entered = parseFloat(amount);
    const minVal = current.minDeposit || 10;
    if (!entered || entered < minVal) {
      toast.error(`Minimum topup amount is ${formatDirect(minVal)}`);
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Convert entered amount in active currency to INR canonical base for gateway & database
    const inrAmount = toINR(entered);

    setLoading(true);
    try {
      const res = await api.post('/users/wallet/topup', {
        amount: inrAmount,
        currency_amount: entered,
        currency: currency,
        payment_method: paymentMethod,
      });

      if (res.data.payment_link) {
        window.open(res.data.payment_link, '_blank');
        toast.success('Payment gateway opened in a new tab!');
      } else if (res.data.invoice_url) {
        window.open(res.data.invoice_url, '_blank');
        toast.success('Crypto payment page opened!');
      } else if (res.data.upi_id || res.data.binance_pay_id) {
        setManualPayData({
          ...res.data,
          method: paymentMethod,
          displayAmount: entered,
          displayCurrency: currency,
          inrAmount: inrAmount,
        });
      } else if (res.data.balance !== undefined) {
        toast.success(res.data.message || `${formatDirect(entered)} added to wallet!`);
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate topup');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManualDeposit = async () => {
    if (!manualTxInput.trim()) {
      return toast.error('Please enter your 12-digit UTR or Transaction ID');
    }
    setSubmittingManual(true);
    try {
      const { data } = await api.post('/users/wallet/submit-manual-deposit', {
        order_id: manualPayData?.orderId,
        transaction_id: manualTxInput.trim(),
        gateway: manualPayData?.method || 'upi',
        amount: manualPayData?.inrAmount || toINR(amount),
      });
      toast.success(data.message || 'Deposit proof submitted!');
      setManualPayData(null);
      setManualTxInput('');
      await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit deposit');
    } finally {
      setSubmittingManual(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const convertedINR = Math.round(toINR(parsedAmount));

  return (
    <div className="dashboard-content-card">
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        Wallet Balance &amp; Deposit
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Current Balance: <strong style={{ color: 'var(--color-accent)', fontSize: 16 }}>{format(user?.balance || 0)}</strong>
      </p>

      {/* Preset Pills in Active Currency */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: 12.5 }}>
            Choose Amount ({currency})
          </label>
          <span style={{ fontSize: 11.5, color: 'var(--color-cyan)', fontWeight: 600 }}>
            Currency: {current.name} ({current.code})
          </span>
        </div>

        <div className="wallet-presets-row">
          {presets.map(p => {
            const isSelected = String(amount) === String(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAmount(String(p))}
                style={{
                  padding: '9px 0', borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                  color: isSelected ? '#fff' : 'var(--color-text)',
                  border: `1px solid ${isSelected ? 'transparent' : 'var(--color-border)'}`,
                  fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {formatDirect(p)}
              </button>
            );
          })}
        </div>

        {/* Custom Amount Input with Currency Symbol */}
        <div style={{ position: 'relative', marginTop: 10 }}>
          <span style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-accent)',
            pointerEvents: 'none'
          }}>
            {current.symbol}
          </span>
          <input
            type="number"
            className="form-input"
            placeholder={`Enter amount in ${currency}`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min={current.minDeposit || 1}
            style={{ fontSize: 15, fontWeight: 700, paddingLeft: 34 }}
          />
        </div>

        {currency !== 'INR' && parsedAmount > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="icon icon--sm icon--cyan" style={{ fontSize: 13 }}>info</span>
            <span>
              {formatDirect(parsedAmount)} will be converted to <strong>₹{convertedINR} INR</strong> canonical balance at live rate (1 {currency} ≈ {(1 / currentRate).toFixed(2)} INR).
            </span>
          </div>
        )}
      </div>

      {/* Payment Gateway Options */}
      <div style={{ marginBottom: 28 }}>
        <label className="form-label" style={{ fontWeight: 700, marginBottom: 10, display: 'block' }}>Payment Method</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {availableMethods.map(m => {
            const isSelected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  background: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  border: `1.5px solid ${isSelected ? (m.color || 'var(--color-primary)') : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)', cursor: 'pointer', textAlign: 'left',
                  boxShadow: isSelected ? `0 0 16px ${m.color ? `${m.color}30` : 'rgba(110, 58, 255, 0.15)'}` : 'none',
                  transition: 'var(--transition-fast)'
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `${m.color || 'var(--color-primary)'}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: m.color || 'var(--color-primary)', flexShrink: 0
                }}>
                  <span className="icon icon--md icon--filled">{m.icon || 'payments'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>
                    {m.label || m.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    {m.desc || m.instructions}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual UPI / Binance Instructions Modal / Box */}
      {manualPayData && (
        <div style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24, animation: 'fadeIn 0.2s ease'
        }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="icon icon--sm icon--cyan">qr_code_2</span>
            Complete Payment of {formatDirect(manualPayData.displayAmount, manualPayData.displayCurrency)} {manualPayData.displayCurrency !== 'INR' && `(≈ ₹${Math.round(manualPayData.inrAmount)} INR)`}
          </h4>

          {manualPayData.upi_id && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>UPI ID:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700 }}>
                <span>{manualPayData.upi_id}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => { navigator.clipboard.writeText(manualPayData.upi_id); toast.success('UPI ID copied!'); }}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {manualPayData.binance_pay_id && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Binance Pay ID:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 8, fontFamily: 'monospace', fontWeight: 700 }}>
                <span>{manualPayData.binance_pay_id}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => { navigator.clipboard.writeText(manualPayData.binance_pay_id); toast.success('Binance Pay ID copied!'); }}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>
              Enter 12-Digit UTR / Transaction ID:
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 329482910482"
              value={manualTxInput}
              onChange={e => setManualTxInput(e.target.value)}
              style={{ fontFamily: 'monospace', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSubmitManualDeposit}
              disabled={submittingManual}
              style={{ flex: 1 }}
            >
              {submittingManual ? 'Submitting...' : 'Submit UTR / Proof'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setManualPayData(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        className="btn btn--primary btn--full btn--lg"
        onClick={handleTopup}
        disabled={loading}
        style={{ gap: 8, boxShadow: 'var(--shadow-glow)' }}
      >
        <span className="icon icon--md icon--filled">bolt</span>
        <span>{loading ? 'Processing Gateway...' : `Proceed to Pay ${formatDirect(amount || 0)}`}</span>
      </button>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-spinner"></div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
