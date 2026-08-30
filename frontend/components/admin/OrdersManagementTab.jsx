'use client';

import { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  XCircle, 
  Search, 
  Copy, 
  Trash2, 
  X, 
  ChevronDown, 
  Check, 
  Edit3, 
  RefreshCw,
  Zap,
  User,
  IndianRupee,
  Layers
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function OrdersManagementTab() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    delivered: 0,
    pending: 0,
    preorder: 0,
    refunded: 0,
    canceled: 0,
    total_revenue: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total_count: 0, total_pages: 1 });
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: pagination.limit || 25,
        status: statusTab,
        search: search.trim(),
      });
      const { data } = await api.get(`/admin/orders?${params.toString()}`);
      setOrders(data.orders || []);
      if (data.stats) setStats(data.stats);
      if (data.pagination) setPagination(data.pagination);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusTab]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchOrders(1);
  };

  const handleCopy = (text, label) => {
    if (!text) return toast.error('No credentials to copy');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label || 'credentials'}!`);
  };

  const getStatusBadge = (status) => {
    const st = (status || '').toLowerCase();
    if (st === 'delivered' || st === 'paid') {
      return { label: 'Delivered', color: '#10B981', badgeClass: 'approved', icon: CheckCircle2 };
    }
    if (st === 'pre-order' || st === 'preorder') {
      return { label: 'Pre-Order', color: '#8B5CF6', badgeClass: 'processing', icon: Zap };
    }
    if (st === 'pending') {
      return { label: 'Pending', color: '#F59E0B', badgeClass: 'pending', icon: Clock };
    }
    if (st === 'refunded') {
      return { label: 'Refunded', color: '#3874FF', badgeClass: 'processing', icon: RotateCcw };
    }
    return { label: status || 'Canceled', color: '#EF4444', badgeClass: 'failed', icon: XCircle };
  };

  const ORDER_TABS = [
    { id: 'all', label: 'All Orders', count: stats.total },
    { id: 'Delivered', label: 'Delivered', count: stats.delivered, color: '#10B981' },
    { id: 'Pre-Order', label: 'Pre-Orders', count: stats.preorder, color: '#8B5CF6' },
    { id: 'Pending', label: 'Pending', count: stats.pending, color: '#F59E0B' },
    { id: 'Refunded', label: 'Refunded', count: stats.refunded, color: '#3874FF' },
    { id: 'Canceled', label: 'Canceled', count: stats.canceled, color: '#EF4444' },
  ];

  const handleDirectDelete = async (e, o) => {
    e?.stopPropagation();
    const targetId = String(o.id || o.order_number || '').replace(/^#/, '').trim();
    if (!window.confirm(`Are you sure you want to permanently delete Order #${o.order_number || o.id}?`)) return;
    try {
      await api.delete(`/admin/orders/${encodeURIComponent(targetId)}`);
      toast.success('Order deleted successfully');
      setOrders((prev) => prev.filter((item) => item.id !== targetId && item.order_number !== targetId));
      setStats((prev) => ({ ...prev, total: Math.max(0, (prev.total || 1) - 1) }));
      fetchOrders(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete order');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* FILTER TABS & SEARCH BAR */}
      <div className="admin-card-section" style={{ margin: 0 }}>
        <div className="admin-card-header">
          {/* Scrollable Tab Filters */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}>
            {ORDER_TABS.map((t) => {
              const isActive = statusTab.toLowerCase() === t.id.toLowerCase();
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStatusTab(t.id)}
                  className={`admin-btn ${isActive ? 'admin-btn-primary' : 'admin-btn-secondary'} admin-btn-sm`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <span>{t.label}</span>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-2, #141822)',
                    marginLeft: 4,
                  }}>
                    {t.count || 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="admin-search-box">
            <Search size={16} color="var(--color-text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by order #, email, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Desktop Table View */}
        <div className="admin-table-responsive hide-on-mobile">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Product / Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Purchased</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = getStatusBadge(o.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={o.id || o.order_number}>
                    <td>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: '#3874FF', fontSize: 13.5 }}>
                        #{o.order_number || o.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                        {o.username && o.username !== 'Customer' ? o.username : (o.user_email ? o.user_email.split('@')[0] : 'Customer')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{o.user_email || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.product_name || 'Digital Item'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{o.variant_name || 'Standard'}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                        ₹{parseFloat(o.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${badge.badgeClass}`}>
                        <BadgeIcon size={12} />
                        <span>{badge.label}</span>
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                      {new Date(o.purchase_ts || o.created_at || Date.now()).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          onClick={() => setSelectedOrder(o)}
                          title="Edit / Fulfill Order"
                        >
                          <Edit3 size={14} />
                          <span>Fulfill</span>
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={(e) => handleDirectDelete(e, o)}
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--color-text-muted)' }}>
                    No orders found matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Dedicated Touch Cards */}
        <div className="admin-mobile-card-list">
          {orders.map((o) => {
            const badge = getStatusBadge(o.status);
            const BadgeIcon = badge.icon;
            return (
              <div key={o.id || o.order_number} className="admin-mobile-card">
                <div className="admin-mobile-card-header">
                  <div>
                    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: '#3874FF', fontSize: 14 }}>
                      #{o.order_number || o.id}
                    </span>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginTop: 2 }}>
                      {o.product_name || 'Digital Item'}
                    </div>
                  </div>
                  <span className={`admin-badge ${badge.badgeClass}`}>
                    <BadgeIcon size={12} />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className="admin-mobile-card-rows">
                  <div className="admin-mobile-card-row">
                    <span>Customer:</span>
                    <strong style={{ color: 'var(--color-text)' }}>
                      {o.username && o.username !== 'Customer' ? o.username : (o.user_email || 'Customer')}
                    </strong>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Amount:</span>
                    <strong style={{ color: '#10B981', fontSize: 14 }}>
                      ₹{parseFloat(o.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </strong>
                  </div>
                  <div className="admin-mobile-card-row">
                    <span>Date:</span>
                    <span>{new Date(o.purchase_ts || o.created_at || Date.now()).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                <div className="admin-mobile-card-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <Edit3 size={15} />
                    <span>Manage / Fulfill</span>
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={(e) => handleDirectDelete(e, o)}
                  >
                    <Trash2 size={15} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ORDER FULFILLMENT & EDIT MODAL */}
      {selectedOrder && (
        <OrderFulfillModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={(updated) => {
            setOrders((prev) => prev.map((item) => ((item.id === updated.id || item.order_number === updated.order_number) ? updated : item)));
            setSelectedOrder(null);
            fetchOrders(pagination.page);
          }}
          onDelete={(deletedId) => {
            setOrders((prev) => prev.filter((item) => item.id !== deletedId && item.order_number !== deletedId));
            setSelectedOrder(null);
            fetchOrders(pagination.page);
          }}
        />
      )}

    </div>
  );
}

function OrderFulfillModal({ order, onClose, onUpdate, onDelete }) {
  const [status, setStatus] = useState(order.status || 'Delivered');
  const [credentials, setCredentials] = useState(order.credentials || '');
  const [adminNotes, setAdminNotes] = useState(order.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const STATUS_OPTIONS = [
    { value: 'Delivered', label: 'Delivered / Fulfilled', color: '#10B981', desc: 'Credentials active & accessible' },
    { value: 'Pre-Order', label: 'Pre-Order In Queue', color: '#8B5CF6', desc: 'Awaiting supplier key generation' },
    { value: 'Pending', label: 'Pending Verification', color: '#F59E0B', desc: 'Payment or fraud verification' },
    { value: 'Refunded', label: 'Refunded to Wallet', color: '#3874FF', desc: '100% credited to user balance' },
    { value: 'Canceled', label: 'Canceled / Void', color: '#EF4444', desc: 'Order terminated without delivery' },
  ];

  const currentStatusOpt = STATUS_OPTIONS.find(o => o.value.toLowerCase() === status.toLowerCase()) || STATUS_OPTIONS[0];

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const targetId = String(order.id || order.order_number || '').replace(/^#/, '').trim();
      const { data } = await api.put(`/admin/orders/${encodeURIComponent(targetId)}`, {
        status,
        credentials,
        admin_notes: adminNotes,
      });
      toast.success('Order updated successfully');
      onUpdate(data.order || { ...order, status, credentials, admin_notes: adminNotes });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const targetId = String(order.id || order.order_number || '').replace(/^#/, '').trim();
    if (!window.confirm(`Are you sure you want to delete Order #${order.order_number || order.id}?`)) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/orders/${encodeURIComponent(targetId)}`);
      toast.success('Order deleted');
      onDelete(targetId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-panel large" onClick={(e) => e.stopPropagation()}>
        
        <div className="admin-modal-header">
          <div className="admin-modal-title">
            <ReceiptText size={20} color="#3874FF" />
            <span>Manage Order #{order.order_number || order.id}</span>
          </div>
          <button type="button" className="admin-modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="admin-modal-body">
          
          {/* Order Details Grid */}
          <div style={{
            padding: 16,
            background: 'var(--color-surface-2, #141822)',
            borderRadius: 14,
            border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Item & Plan</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)', marginTop: 2 }}>{order.product_name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{order.variant_name || 'Standard'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Customer</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)', marginTop: 2 }}>
                {order.username && order.username !== 'Customer' ? order.username : (order.user_email || 'Customer')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{order.user_email || '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Amount</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#10B981', marginTop: 2 }}>
                ₹{parseFloat(order.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Custom Status Dropdown */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Order Fulfillment Status
            </label>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--color-surface-2, #141822)',
                border: `1.5px solid ${currentStatusOpt.color}40`,
                borderRadius: 10,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStatusOpt.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: currentStatusOpt.color }}>
                  {currentStatusOpt.label}
                </span>
              </div>
              <ChevronDown size={16} color={currentStatusOpt.color} />
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--color-surface, #0F131C)',
                  border: '1px solid var(--color-border, rgba(255, 255, 255, 0.12))',
                  borderRadius: 12,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                  zIndex: 100,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = opt.value.toLowerCase() === status.toLowerCase();
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        setStatus(opt.value);
                        setDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: isSelected ? `${opt.color}15` : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? opt.color : 'var(--color-text)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {opt.desc}
                        </div>
                      </div>
                      {isSelected && <Check size={16} color={opt.color} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Credentials Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                Digital Credentials / Product License Keys
              </label>
              {credentials && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials);
                    toast.success('Copied credentials!');
                  }}
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                >
                  <Copy size={12} />
                  <span>Copy</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--color-surface-2, #141822)',
                border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                borderRadius: 10,
                fontSize: 12.5,
                fontFamily: 'ui-monospace, monospace',
                color: 'var(--color-text, #FFFFFF)',
                outline: 'none',
              }}
              placeholder="user@example.com:password&#10;KEY-XXXX-YYYY"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
            />
          </div>

          {/* Admin Notes */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Internal Admin Notes
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                background: 'var(--color-surface-2, #141822)',
                border: '1.5px solid var(--color-border, rgba(255, 255, 255, 0.1))',
                borderRadius: 10,
                fontSize: 13,
                color: 'var(--color-text, #FFFFFF)',
                outline: 'none',
              }}
              placeholder="e.g. Warranty valid till Dec, replacement provided..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {/* Footer Actions */}
          <div className="admin-modal-footer" style={{ margin: '8px -24px -24px', padding: '16px 24px' }}>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              <Trash2 size={15} />
              <span>{deleting ? 'Deleting...' : 'Delete Order'}</span>
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || deleting}>
                <Check size={15} />
                <span>{saving ? 'Syncing...' : 'Save & Sync Order'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
