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
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: s.bg, border: `1px solid ${s.border}`,
      color: s.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{status}</span>
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

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/admin/users/${userId}`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [userId]);

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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 10000,
        display: 'flex', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 720, height: '100%',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0,
            }}>
              {loading ? '?' : (data?.user?.name?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-heading)' }}>
                {loading ? 'Loading...' : (data?.user?.name || 'Unknown User')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                {loading ? '' : data?.user?.email}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn--ghost btn--icon" style={{ width: 36, height: 36 }}>
            <span className="icon icon--sm">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)', flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 18px', background: 'none',
                border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--color-cyan)' : 'transparent'}`,
                color: tab === t.id ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease', whiteSpace: 'nowrap',
              }}
            >
              <span className="icon icon--sm" style={{ fontSize: 16 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12 }} />)}
            </div>
          ) : !data ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>Failed to load user data</div>
          ) : (
            <>
              {/* ──── PROFILE TAB ──── */}
              {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* KPI Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Wallet Balance', value: `₹${parseFloat(data.user.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: 'account_balance_wallet', color: 'var(--color-accent)' },
                      { label: 'Total Spent', value: `₹${parseFloat(data.summary?.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: 'payments', color: 'var(--color-primary-light)' },
                      { label: 'Orders', value: data.summary?.total_orders || 0, icon: 'shopping_bag', color: '#00D4FF' },
                      { label: 'Pre-Orders', value: data.summary?.preorders || 0, icon: 'rocket_launch', color: '#a855f7' },
                    ].map(k => (
                      <div key={k.label} style={{
                        background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                        borderRadius: 12, padding: '14px 12px', textAlign: 'center',
                      }}>
                        <span className="icon icon--sm" style={{ color: k.color, fontSize: 22 }}>{k.icon}</span>
                        <div style={{ fontSize: 17, fontWeight: 800, color: k.color, marginTop: 4 }}>{k.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 2 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Info Grid */}
                  <div style={{
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    borderRadius: 14, padding: 20,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 14, letterSpacing: '0.05em' }}>
                      Account Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {[
                        { label: 'User ID', value: data.user.id },
                        { label: 'Role', value: data.user.role || 'user' },
                        { label: 'Email', value: data.user.email },
                        { label: 'Telegram', value: data.user.telegram_username || '—' },
                        { label: 'Currency', value: data.user.currency || 'INR' },
                        { label: 'All-Time Topup', value: `₹${parseFloat(data.user.all_time_topup || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
                        { label: 'Account Status', value: data.user.is_frozen ? '🔒 Frozen' : '✅ Active' },
                        { label: 'Joined', value: new Date(data.user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) },
                      ].map(f => (
                        <div key={f.label}>
                          <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 3 }}>{f.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', wordBreak: 'break-all' }}>{f.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Balance Management */}
                  <div style={{
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                    borderRadius: 14, padding: 20,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 14, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="icon icon--sm" style={{ color: 'var(--color-accent)' }}>account_balance_wallet</span>
                      Balance Management
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      {[
                        { id: 'add', label: '+ Add', color: '#10b981' },
                        { id: 'deduct', label: '− Deduct', color: '#ef4444' },
                        { id: 'reset', label: '⟳ Reset to ₹0', color: '#94a3b8' },
                      ].map(a => (
                        <button key={a.id} onClick={() => setBalanceAction(a.id)} style={{
                          padding: '7px 14px', borderRadius: 8,
                          border: `1px solid ${balanceAction === a.id ? a.color : 'var(--color-border)'}`,
                          background: balanceAction === a.id ? `${a.color}22` : 'var(--color-surface)',
                          color: balanceAction === a.id ? a.color : 'var(--color-text-muted)',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>{a.label}</button>
                      ))}
                    </div>
                    {balanceAction !== 'reset' && (
                      <input
                        type="number"
                        className="form-input"
                        placeholder={balanceAction === 'add' ? 'Amount to add (e.g. 500)' : 'Amount to deduct (e.g. 100)'}
                        value={balanceInput}
                        onChange={e => setBalanceInput(e.target.value)}
                        style={{ width: '100%', marginBottom: 12 }}
                      />
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handleBalanceAction} disabled={balanceLoading} className="btn btn--primary btn--sm" style={{ gap: 6 }}>
                        {balanceLoading
                          ? <><span className="icon icon--sm">sync</span> Updating...</>
                          : <><span className="icon icon--sm">check</span> Apply</>}
                      </button>
                      <button onClick={handleFreeze} className={`btn btn--sm ${data.user.is_frozen ? 'btn--outline' : 'btn--danger'}`} style={{ gap: 6 }}>
                        <span className="icon icon--sm">{data.user.is_frozen ? 'lock_open' : 'block'}</span>
                        {data.user.is_frozen ? 'Unfreeze Account' : 'Freeze Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ──── ORDERS TAB ──── */}
              {tab === 'orders' && (
                <div>
                  {data.orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)' }}>
                      <span className="icon" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>receipt_long</span>
                      No website orders yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {data.orders.map(order => (
                        <div key={order.id} style={{
                          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                          borderRadius: 12, overflow: 'hidden',
                        }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {order.product_name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                                {order.variant_name} · <span style={{ fontFamily: 'monospace' }}>{order.id}</span>
                              </div>
                            </div>
                            <StatusBadge status={order.status} />
                            <div style={{ fontWeight: 700, color: 'var(--color-accent)', whiteSpace: 'nowrap', fontSize: 13 }}>
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
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.15)' }}>
                              {order.credentials ? (
                                <>
                                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Delivered Credentials
                                  </div>
                                  <div style={{
                                    background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 6,
                                    border: '1px solid rgba(16,185,129,0.3)', fontFamily: 'monospace',
                                    fontSize: 12, color: '#10b981', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginBottom: 8,
                                  }}>
                                    {order.credentials}
                                  </div>
                                </>
                              ) : (
                                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginBottom: 8 }}>
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

              {/* ──── DEPOSITS TAB ──── */}
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
                        padding: '14px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="icon icon--sm">savings</span> Total Deposited
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>
                          ₹{parseFloat(data.summary?.total_deposited || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="table-wrapper">
                        <table className="table">
                          <thead>
                            <tr><th>Amount</th><th>Gateway</th><th>TX ID</th><th>Date</th></tr>
                          </thead>
                          <tbody>
                            {data.deposits.map(d => (
                              <tr key={d.id}>
                                <td><span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{parseFloat(d.amount).toLocaleString('en-IN')}</span></td>
                                <td><span style={{ textTransform: 'capitalize', fontSize: 12 }}>{d.gateway || 'UPI'}</span></td>
                                <td><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-faint)' }}>{(d.transaction_id || 'N/A').slice(0, 22)}</span></td>
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
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
