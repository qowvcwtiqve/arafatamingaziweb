'use client';

import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Delivered: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#10b981' },
  'Pre-Order': { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', color: '#a855f7' },
  Pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#f59e0b' },
  Canceled: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#ef4444' },
  Refunded: { bg: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.35)', color: '#00d4ff' },
  'On Hold': { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.35)', color: '#94a3b8' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS['On Hold'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
      {status}
    </span>
  );
}

export default function UserDetailModal({ userId, onClose, onUserUpdated }) {
  const [tab, setTab] = useState('profile');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceAction, setBalanceAction] = useState('add');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/admin/users/${userId}`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [userId]);

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBalanceAction = async () => {
    const amount = parseFloat(balanceInput);
    if (balanceAction !== 'reset' && (!amount || isNaN(amount) || amount <= 0)) {
      return toast.error('Enter a valid positive amount');
    }
    setBalanceLoading(true);
    try {
      const { data: res } = await api.put(`/admin/users/${userId}/balance`, {
        action: balanceAction,
        amount: balanceAction === 'reset' ? 0 : amount,
      });
      setData(prev => ({ ...prev, user: { ...prev.user, balance: res.balance } }));
      if (onUserUpdated) onUserUpdated(userId, res.balance);
      toast.success(`Balance updated → ₹${parseFloat(res.balance).toFixed(2)}`);
      setBalanceInput('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      const { data: res } = await api.put(`/admin/users/${userId}/freeze`);
      setData(prev => ({ ...prev, user: { ...prev.user, is_frozen: res.is_frozen } }));
      toast.success(res.is_frozen ? 'Account frozen' : 'Account unfrozen');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  if (!userId) return null;

  const TABS = [
    { id: 'profile', label: 'Profile & Balance', icon: 'person' },
    { id: 'orders', label: `Orders${data ? ` (${data.summary?.total_orders || 0})` : ''}`, icon: 'shopping_bag' },
    { id: 'deposits', label: `Deposits${data ? ` (${data.deposits?.length || 0})` : ''}`, icon: 'account_balance_wallet' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '92vh',
          background: 'var(--color-surface, #0b0f19)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(110, 58, 255, 0.12)',
          borderRadius: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6E3AFF 0%, #00D4FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(110, 58, 255, 0.35)',
            }}>
              {loading ? '?' : (data?.user?.name?.[0] || 'U').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 18,
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text)',
                }}>
                  {loading ? 'Loading User Profile...' : (data?.user?.name || 'Unknown User')}
                </h3>
                {data?.user?.role && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: data.user.role === 'admin' ? 'rgba(110, 58, 255, 0.2)' : 'rgba(0, 212, 255, 0.15)',
                    border: `1px solid ${data.user.role === 'admin' ? 'rgba(110, 58, 255, 0.4)' : 'rgba(0, 212, 255, 0.3)'}`,
                    color: data.user.role === 'admin' ? '#a78bfa' : 'var(--color-cyan)',
                  }}>
                    {data.user.role}
                  </span>
                )}
                {data?.user && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: data.user.is_frozen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${data.user.is_frozen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    color: data.user.is_frozen ? '#f87171' : '#34d399',
                  }}>
                    {data.user.is_frozen ? 'Frozen' : 'Active'}
                  </span>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                marginTop: 3,
                flexWrap: 'wrap',
              }}>
                <span>{loading ? '...' : data?.user?.email}</span>
                {data?.user?.id && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => copyToClipboard(data.user.id, 'User ID')}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        padding: '1px 6px',
                        color: 'var(--color-text-faint)',
                        fontSize: 11,
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Click to copy User ID"
                    >
                      <span className="icon icon--sm" style={{ fontSize: 12 }}>content_copy</span>
                      {data.user.id}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            className="hover:scale-105"
            aria-label="Close"
          >
            <span className="icon icon--sm" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div style={{
          display: 'flex',
          padding: '8px 24px 0',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)',
          gap: 6,
          flexShrink: 0,
        }}>
          {TABS.map(t => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${isActive ? 'var(--color-cyan, #00D4FF)' : 'transparent'}`,
                  color: isActive ? 'var(--color-cyan, #00D4FF)' : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="icon icon--sm" style={{ fontSize: 17 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--color-surface)' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 85, borderRadius: 14 }} />)}
              </div>
              <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
              <div className="skeleton" style={{ height: 140, borderRadius: 16 }} />
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-faint)' }}>
              <span className="icon" style={{ fontSize: 44, display: 'block', marginBottom: 12 }}>error_outline</span>
              Failed to load user information.
            </div>
          ) : (
            <>
              {/* ──── TAB 1: PROFILE & BALANCE ──── */}
              {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* KPI Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                    {[
                      {
                        label: 'Wallet Balance',
                        value: `₹${parseFloat(data.user.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                        icon: 'account_balance_wallet',
                        color: '#10b981',
                        gradient: 'rgba(16, 185, 129, 0.08)',
                        border: 'rgba(16, 185, 129, 0.25)',
                      },
                      {
                        label: 'Total Spent',
                        value: `₹${parseFloat(data.summary?.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
                        icon: 'payments',
                        color: '#a78bfa',
                        gradient: 'rgba(110, 58, 255, 0.08)',
                        border: 'rgba(110, 58, 255, 0.25)',
                      },
                      {
                        label: 'Orders',
                        value: data.summary?.total_orders || 0,
                        icon: 'shopping_bag',
                        color: '#00D4FF',
                        gradient: 'rgba(0, 212, 255, 0.08)',
                        border: 'rgba(0, 212, 255, 0.25)',
                      },
                      {
                        label: 'Pre-Orders',
                        value: data.summary?.preorders || 0,
                        icon: 'rocket_launch',
                        color: '#f59e0b',
                        gradient: 'rgba(245, 158, 11, 0.08)',
                        border: 'rgba(245, 158, 11, 0.25)',
                      },
                    ].map(k => (
                      <div
                        key={k.label}
                        style={{
                          background: `linear-gradient(145deg, ${k.gradient} 0%, var(--color-surface-2) 100%)`,
                          border: `1px solid ${k.border}`,
                          borderRadius: 14,
                          padding: '16px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {k.label}
                          </span>
                          <span className="icon icon--sm" style={{ color: k.color, fontSize: 19 }}>
                            {k.icon}
                          </span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'var(--font-heading)' }}>
                          {k.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Account Information Card */}
                  <div style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 16,
                    padding: 20,
                  }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-faint)',
                      marginBottom: 16,
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span className="icon icon--sm" style={{ color: 'var(--color-cyan)', fontSize: 16 }}>badge</span>
                      Account Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px 20px' }}>
                      {[
                        { label: 'User ID', value: data.user.id, copyable: true },
                        { label: 'Role', value: data.user.role || 'user', highlight: data.user.role === 'admin' ? '#a78bfa' : null },
                        { label: 'Email', value: data.user.email, copyable: true },
                        { label: 'Telegram', value: data.user.telegram_username || '—' },
                        { label: 'Currency', value: data.user.currency || 'INR' },
                        { label: 'All-Time Topup', value: `₹${parseFloat(data.user.all_time_topup || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
                        { label: 'Account Status', value: data.user.is_frozen ? '🔒 Frozen' : '✅ Active' },
                        { label: 'Joined Date', value: new Date(data.user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) },
                      ].map(f => (
                        <div key={f.label} style={{ background: 'rgba(0,0,0,0.12)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 3, fontWeight: 500 }}>
                            {f.label}
                          </div>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: f.highlight || 'var(--color-text)',
                            wordBreak: 'break-all',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            <span>{f.value}</span>
                            {f.copyable && (
                              <button
                                onClick={() => copyToClipboard(f.value, f.label)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-text-faint)',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                                title={`Copy ${f.label}`}
                              >
                                <span className="icon icon--sm" style={{ fontSize: 13 }}>content_copy</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Balance Management Card */}
                  <div style={{
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 16,
                    padding: 20,
                  }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-faint)',
                      marginBottom: 16,
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span className="icon icon--sm" style={{ color: '#10b981', fontSize: 17 }}>tune</span>
                      Balance & Account Controls
                    </div>

                    {/* Action Selector */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      {[
                        { id: 'add', label: '+ Add Balance', color: '#10b981' },
                        { id: 'deduct', label: '− Deduct Balance', color: '#ef4444' },
                        { id: 'reset', label: '⟳ Reset to ₹0', color: '#94a3b8' },
                      ].map(a => {
                        const isSelected = balanceAction === a.id;
                        return (
                          <button
                            key={a.id}
                            onClick={() => setBalanceAction(a.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: 10,
                              border: `1px solid ${isSelected ? a.color : 'var(--color-border)'}`,
                              background: isSelected ? `${a.color}20` : 'var(--color-surface)',
                              color: isSelected ? a.color : 'var(--color-text-muted)',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {a.label}
                          </button>
                        );
                      })}
                    </div>

                    {balanceAction !== 'reset' && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          {[100, 500, 1000, 2500, 5000].map(amt => (
                            <button
                              key={amt}
                              onClick={() => setBalanceInput(amt.toString())}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              +₹{amt}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={balanceAction === 'add' ? 'Enter amount to add in ₹ (e.g. 500)' : 'Enter amount to deduct in ₹ (e.g. 100)'}
                          value={balanceInput}
                          onChange={e => setBalanceInput(e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                      <button
                        onClick={handleBalanceAction}
                        disabled={balanceLoading}
                        className="btn btn--primary"
                        style={{
                          gap: 6,
                          padding: '8px 20px',
                          background: balanceAction === 'deduct' ? '#ef4444' : undefined,
                        }}
                      >
                        {balanceLoading ? (
                          <><span className="icon icon--sm">sync</span> Updating...</>
                        ) : (
                          <><span className="icon icon--sm">check</span> Apply Changes</>
                        )}
                      </button>

                      <button
                        onClick={handleFreeze}
                        className={`btn ${data.user.is_frozen ? 'btn--outline' : 'btn--danger'}`}
                        style={{ gap: 6, padding: '8px 18px' }}
                      >
                        <span className="icon icon--sm">{data.user.is_frozen ? 'lock_open' : 'block'}</span>
                        {data.user.is_frozen ? 'Unfreeze Account' : 'Freeze Account'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* ──── TAB 2: ORDERS ──── */}
              {tab === 'orders' && (
                <div>
                  {data.orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)' }}>
                      <span className="icon" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>receipt_long</span>
                      No orders found for this user.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {data.orders.map(order => (
                        <div
                          key={order.id}
                          style={{
                            background: 'var(--color-surface-2)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 14,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '14px 18px',
                              cursor: 'pointer',
                            }}
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {order.product_name}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>
                                {order.variant_name} · <span style={{ fontFamily: 'monospace' }}>{order.id}</span>
                              </div>
                            </div>
                            <StatusBadge status={order.status} />
                            <div style={{ fontWeight: 700, color: 'var(--color-accent, #10b981)', whiteSpace: 'nowrap', fontSize: 14 }}>
                              ₹{parseFloat(order.price).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                              {new Date(order.created_at).toLocaleDateString('en-IN')}
                            </div>
                            <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)', flexShrink: 0 }}>
                              {expandedOrder === order.id ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>

                          {expandedOrder === order.id && (
                            <div style={{
                              padding: '14px 18px',
                              borderTop: '1px solid var(--color-border)',
                              background: 'rgba(0,0,0,0.2)',
                            }}>
                              {order.credentials ? (
                                <>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      Delivered Credentials
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard(order.credentials, 'Credentials')}
                                      className="btn btn--ghost btn--sm"
                                      style={{ padding: '2px 8px', fontSize: 11, gap: 4 }}
                                    >
                                      <span className="icon icon--sm" style={{ fontSize: 12 }}>content_copy</span> Copy
                                    </button>
                                  </div>
                                  <div style={{
                                    background: 'var(--color-surface)',
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    color: '#10b981',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    marginBottom: 10,
                                  }}>
                                    {order.credentials}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 10 }}>
                                  No credentials delivered yet.
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--color-text-faint)' }}>
                                {order.coupon_code && <span>Coupon: <strong>{order.coupon_code}</strong> (−₹{order.coupon_discount})</span>}
                                <span>Pool: <code>{order.pool_id}</code></span>
                                <span>Qty: {order.quantity}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ──── TAB 3: DEPOSITS ──── */}
              {tab === 'deposits' && (
                <div>
                  {data.deposits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)' }}>
                      <span className="icon" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>savings</span>
                      No deposit history found.
                    </div>
                  ) : (
                    <>
                      <div style={{
                        padding: '14px 18px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.03) 100%)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: 12,
                        marginBottom: 16,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="icon icon--sm">savings</span> Total Deposited
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
                          ₹{parseFloat(data.summary?.total_deposited || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="table-wrapper">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Amount</th>
                              <th>Gateway</th>
                              <th>Transaction ID</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.deposits.map(d => (
                              <tr key={d.id}>
                                <td>
                                  <span style={{ fontWeight: 700, color: 'var(--color-accent, #10b981)' }}>
                                    ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td>
                                  <span style={{
                                    textTransform: 'uppercase',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--color-border)',
                                  }}>
                                    {d.gateway || 'UPI'}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-faint)' }}>
                                    {(d.transaction_id || 'N/A').slice(0, 24)}
                                  </span>
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                                  {new Date(d.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalScaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
