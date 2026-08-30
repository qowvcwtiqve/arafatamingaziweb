'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  ShoppingBag, 
  Wallet, 
  X, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Plus, 
  Minus, 
  RotateCcw, 
  CheckCircle2, 
  ChevronDown,
  Clock,
  Zap,
  RotateCcw as RefundIcon,
  XCircle,
  IndianRupee
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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
    toast.success(`Copied ${fieldName}!`);
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
      toast.success(`Balance updated to ₹${parseFloat(res.balance).toFixed(2)}`);
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
    { id: 'profile', label: 'Profile & Wallet', icon: User },
    { id: 'orders', label: `Orders (${data?.summary?.total_orders || data?.orders?.length || 0})`, icon: ShoppingBag },
    { id: 'deposits', label: `Deposits (${data?.deposits?.length || 0})`, icon: Wallet },
  ];

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div 
        className="admin-modal-panel large" 
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3874FF, #6E3AFF)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 18,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {loading ? '?' : (data?.user?.name?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="admin-modal-title" style={{ fontSize: 16 }}>
                  {loading ? 'Loading Profile...' : (data?.user?.name || 'Customer')}
                </span>
                {data?.user?.role && (
                  <span className="admin-badge processing" style={{ textTransform: 'capitalize' }}>
                    {data.user.role}
                  </span>
                )}
                {data?.user && (
                  <span className={`admin-badge ${data.user.is_frozen ? 'failed' : 'approved'}`}>
                    {data.user.is_frozen ? 'Frozen' : 'Active'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {loading ? '...' : data?.user?.email}
              </div>
            </div>
          </div>

          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '10px 20px',
          borderBottom: '1px solid var(--color-border, rgba(255, 255, 255, 0.06))',
          background: 'var(--color-surface-2, #141822)',
          overflowX: 'auto',
        }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`admin-btn ${isActive ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="admin-modal-body" style={{ padding: 20 }}>
          
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
              <div style={{ height: 60, borderRadius: 12, background: 'var(--color-surface-2)' }} />
              <div style={{ height: 100, borderRadius: 12, background: 'var(--color-surface-2)' }} />
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE & WALLET */}
              {tab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Summary Metric Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                  }}>
                    <div style={{
                      padding: 16,
                      background: 'var(--color-surface-2, #141822)',
                      borderRadius: 14,
                      border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Current Wallet Balance
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: '#10B981', marginTop: 4 }}>
                        ₹{parseFloat(data?.user?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{
                      padding: 16,
                      background: 'var(--color-surface-2, #141822)',
                      borderRadius: 14,
                      border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        Total Spent
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 800, color: '#3874FF', marginTop: 4 }}>
                        ₹{parseFloat(data?.summary?.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  {/* Balance Adjustment Box */}
                  <div style={{
                    padding: 18,
                    background: 'var(--color-surface-2, #141822)',
                    borderRadius: 14,
                    border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      Adjust Customer Wallet Balance
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`admin-btn ${balanceAction === 'add' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                        onClick={() => setBalanceAction('add')}
                      >
                        <Plus size={13} />
                        <span>Credit / Add</span>
                      </button>
                      <button
                        type="button"
                        className={`admin-btn ${balanceAction === 'deduct' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                        onClick={() => setBalanceAction('deduct')}
                      >
                        <Minus size={13} />
                        <span>Debit / Deduct</span>
                      </button>
                      <button
                        type="button"
                        className={`admin-btn ${balanceAction === 'reset' ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                        onClick={() => setBalanceAction('reset')}
                      >
                        <RotateCcw size={13} />
                        <span>Reset to Zero</span>
                      </button>
                    </div>

                    {balanceAction !== 'reset' && (
                      <input
                        type="number"
                        className="admin-search-input"
                        style={{
                          width: '100%',
                          height: 40,
                          padding: '0 12px',
                          background: 'var(--color-surface, #0F131C)',
                          border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                          borderRadius: 8,
                          fontSize: 13.5,
                        }}
                        placeholder="Enter amount (₹)..."
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                      />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-primary"
                        onClick={handleBalanceAction}
                        disabled={balanceLoading}
                      >
                        <Check size={14} />
                        <span>{balanceLoading ? 'Updating...' : 'Apply Wallet Change'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Status Toggle */}
                  <div style={{
                    padding: 16,
                    background: 'var(--color-surface-2, #141822)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                        Account Restriction Security
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {data?.user?.is_frozen ? 'Account is currently locked from making purchases' : 'Account is active and verified'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`admin-btn ${data?.user?.is_frozen ? 'admin-btn-primary' : 'admin-btn-danger'}`}
                      onClick={handleFreeze}
                    >
                      {data?.user?.is_frozen ? <Unlock size={14} /> : <Lock size={14} />}
                      <span>{data?.user?.is_frozen ? 'Unlock Account' : 'Freeze Account'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: ORDERS */}
              {tab === 'orders' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data?.orders || []).map((o) => (
                    <div
                      key={o.id || o.order_number}
                      style={{
                        padding: 14,
                        background: 'var(--color-surface-2, #141822)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#3874FF', fontSize: 13 }}>
                            #{o.order_number || o.id}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 13.5, marginLeft: 8, color: 'var(--color-text)' }}>
                            {o.product_name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                          ₹{parseFloat(o.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                        <span>{new Date(o.purchase_ts || o.created_at).toLocaleDateString('en-GB')}</span>
                        <span className={`admin-badge ${o.status === 'Delivered' ? 'approved' : 'processing'}`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(data?.orders || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      No order history found for this customer.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DEPOSITS */}
              {tab === 'deposits' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data?.deposits || []).map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: 14,
                        background: 'var(--color-surface-2, #141822)',
                        borderRadius: 12,
                        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, color: '#10B981', fontSize: 15 }}>
                          +₹{parseFloat(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                          {d.gateway?.toUpperCase()} • {d.transaction_id || 'Direct'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="admin-badge approved">Credited</span>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                          {new Date(d.created_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(data?.deposits || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                      No deposit records for this customer.
                    </div>
                  )}
                </div>
              )}

            </>
          )}

        </div>

      </div>
    </div>
  );
}
