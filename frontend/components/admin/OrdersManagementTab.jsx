'use client';

import { useState, useEffect } from 'react';
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
  const [statusTab, setStatusTab] = useState('all'); // all | Delivered | Pre-Order | Pending | Refunded | Canceled
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
      toast.error('Failed to load website orders');
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
      return { label: 'Delivered', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: 'check_circle' };
    }
    if (st === 'pre-order' || st === 'preorder') {
      return { label: 'Pre-Order', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', icon: 'rocket_launch' };
    }
    if (st === 'pending') {
      return { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: 'hourglass_empty' };
    }
    if (st === 'refunded') {
      return { label: 'Refunded', color: '#00D4FF', bg: 'rgba(0,212,255,0.15)', icon: 'replay' };
    }
    return { label: status || 'Canceled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: 'cancel' };
  };

  const ORDER_TABS = [
    { id: 'all', label: 'All Website Orders', count: stats.total, icon: 'receipt_long' },
    { id: 'Delivered', label: 'Delivered / Paid', count: stats.delivered, icon: 'check_circle', color: '#10b981' },
    { id: 'Pre-Order', label: 'Pre-Orders', count: stats.preorder, icon: 'rocket_launch', color: '#a855f7' },
    { id: 'Pending', label: 'Pending Queue', count: stats.pending, icon: 'hourglass_empty', color: '#f59e0b' },
    { id: 'Refunded', label: 'Refunded', count: stats.refunded, icon: 'replay', color: '#00D4FF' },
    { id: 'Canceled', label: 'Canceled', count: stats.canceled, icon: 'cancel', color: '#ef4444' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, margin: 0 }}>
              Website <span className="text-gradient">Orders Hub</span>
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(110, 58, 255, 0.15)',
                color: 'var(--color-primary-light)',
                border: '1px solid rgba(110, 58, 255, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-light)' }} />
              Website Sales Stream
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Manage website customer purchases, pre-orders, pending deliveries, and key fulfillment
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: 'var(--color-accent)', background: 'rgba(16,185,129,0.12)' }}>
            <span className="icon icon--md">payments</span>
          </div>
          <div className="stat-card__label">Website Revenue</div>
          <div className="stat-card__value" style={{ color: 'var(--color-accent)' }}>
            ₹{stats.total_revenue?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: 'var(--color-primary-light)', background: 'rgba(110,58,255,0.12)' }}>
            <span className="icon icon--md">shopping_bag</span>
          </div>
          <div className="stat-card__label">Paid / Delivered Orders</div>
          <div className="stat-card__value" style={{ color: 'var(--color-primary-light)' }}>
            {stats.delivered || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: '#a855f7', background: 'rgba(168,85,247,0.15)' }}>
            <span className="icon icon--md">rocket_launch</span>
          </div>
          <div className="stat-card__label">Active Pre-Orders</div>
          <div className="stat-card__value" style={{ color: '#a855f7' }}>
            {stats.preorder || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)' }}>
            <span className="icon icon--md">hourglass_empty</span>
          </div>
          <div className="stat-card__label">Pending Fulfillment</div>
          <div className="stat-card__value" style={{ color: '#f59e0b' }}>
            {stats.pending || 0}
          </div>
        </div>
      </div>

      {/* Main Filter & Tabs Card */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, marginBottom: 20 }}>
        {/* Category Tabs Ribbon */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, borderBottom: '1px solid var(--color-border)', marginBottom: 14 }}>
          {ORDER_TABS.map((t) => {
            const isActive = statusTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setStatusTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: isActive ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  background: isActive ? 'rgba(110, 58, 255, 0.15)' : 'var(--color-surface-2)',
                  color: isActive ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="icon icon--sm" style={{ color: t.color || 'inherit' }}>{t.icon}</span>
                {t.label}
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#fff' : 'var(--color-text-faint)',
                    fontWeight: 700,
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Control */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260, maxWidth: 500 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span
                className="icon icon--sm"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}
              >
                search
              </span>
              <input
                className="form-input"
                placeholder="Search Order #, Customer, Product or Key..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
              />
            </div>
            <button type="submit" className="btn btn--secondary btn--sm" style={{ height: 38, padding: '0 16px' }}>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Order Ref</th>
              <th>Product & Plan</th>
              <th>Customer</th>
              <th>Price</th>
              <th>Status</th>
              <th>Delivered Keys</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading orders from live MongoDB Atlas...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>
                  <span className="icon icon--lg" style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }}>receipt_long</span>
                  No orders found for this status tab or search filter.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const badge = getStatusBadge(o.status);
                const hasKeys = !!(o.credentials && o.credentials.trim());
                const dateObj = new Date(o.purchase_ts);
                const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                    {/* Order ID */}
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)', fontSize: 13 }}>
                        #{o.order_number}
                      </span>
                    </td>

                    {/* Product & Variant */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{o.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{o.variant_name || 'Standard'}</span>
                        {o.pool_id && (
                          <span style={{ padding: '1px 4px', background: 'var(--color-surface-2)', borderRadius: 3, fontSize: 10 }}>
                            📦 {o.pool_id}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>{o.username}</div>
                      {o.user_email && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{o.user_email}</div>}
                    </td>

                    {/* Price */}
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>
                        ₹{o.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: badge.bg,
                          color: badge.color,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <span className="icon icon--sm" style={{ fontSize: 13 }}>{badge.icon}</span>
                        {badge.label}
                      </span>
                    </td>

                    {/* Delivered Credentials */}
                    <td onClick={(e) => e.stopPropagation()}>
                      {hasKeys ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              background: 'var(--color-surface-2)',
                              padding: '3px 6px',
                              borderRadius: 4,
                              maxWidth: 140,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={o.credentials}
                          >
                            {o.credentials}
                          </span>
                          <button
                            onClick={() => handleCopy(o.credentials, 'Keys')}
                            className="btn btn--ghost btn--sm"
                            style={{ padding: 4, height: 26, width: 26 }}
                            title="Copy credentials"
                          >
                            <span className="icon icon--sm" style={{ fontSize: 14 }}>content_copy</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--color-text-faint)', fontStyle: 'italic' }}>
                          {o.status === 'Pre-Order' ? '⏳ Pre-order queue' : 'No credentials'}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--color-text)' }}>{dateStr}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{timeStr}</div>
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '4px 10px', height: 28, fontSize: 11, gap: 4 }}
                      >
                        <span className="icon icon--sm" style={{ fontSize: 13 }}>visibility</span>
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Showing {(pagination.page - 1) * pagination.limit + 1} – {Math.min(pagination.page * pagination.limit, pagination.total_count)} of {pagination.total_count} orders
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            disabled={pagination.page <= 1}
            onClick={() => fetchOrders(pagination.page - 1)}
            className="btn btn--secondary btn--sm"
            style={{ height: 32, padding: '0 12px' }}
          >
            ◀ Previous
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => fetchOrders(pagination.page + 1)}
            className="btn btn--secondary btn--sm"
            style={{ height: 32, padding: '0 12px' }}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Order Details & Fulfillment Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            setSelectedOrder(null);
            fetchOrders(pagination.page);
          }}
        />
      )}
    </div>
  );
}

const STATUS_DROPDOWN_OPTIONS = [
  {
    value: 'Delivered',
    label: 'Delivered / Completed (Active)',
    icon: 'check_circle',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    desc: 'Credentials dispatched and active for customer',
  },
  {
    value: 'Pre-Order',
    label: 'Pre-Order (Awaiting Release / Stock)',
    icon: 'rocket_launch',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.35)',
    desc: 'Queued for automated delivery when stock arrives',
  },
  {
    value: 'Pending',
    label: 'Pending Delivery (Manual Dispatch)',
    icon: 'hourglass_top',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    desc: 'Requires manual admin preparation & fulfillment',
  },
  {
    value: 'Refunded',
    label: 'Refunded',
    icon: 'replay',
    color: '#00D4FF',
    bg: 'rgba(0, 212, 255, 0.12)',
    border: 'rgba(0, 212, 255, 0.35)',
    desc: 'Payment returned to user wallet balance',
  },
  {
    value: 'Canceled',
    label: 'Canceled',
    icon: 'cancel',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    desc: 'Order voided / canceled',
  },
];

function OrderDetailsModal({ order, onClose, onUpdate }) {
  const [status, setStatus] = useState(order.status || 'Delivered');
  const [credentials, setCredentials] = useState(order.credentials || '');
  const [adminNotes, setAdminNotes] = useState(order.admin_notes || '');
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedStatusOpt =
    STATUS_DROPDOWN_OPTIONS.find((o) => o.value.toLowerCase() === (status || '').toLowerCase()) ||
    STATUS_DROPDOWN_OPTIONS[0];

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const orderParam = encodeURIComponent(String(order.id || order.order_number || '').replace(/^#/, '').trim());
      await api.put(`/admin/orders/${orderParam}/status`, {
        status,
        credentials,
        admin_notes: adminNotes,
      });
      toast.success('Order status updated successfully');
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border)',
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              Order #{order.order_number}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              Purchased on {new Date(order.purchase_ts).toLocaleString('en-IN')}
            </p>
          </div>
          <button onClick={onClose} className="btn btn--ghost btn--sm" style={{ padding: 6 }}>
            <span className="icon icon--sm">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: 24, overflowY: 'visible', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Product & Buyer Overview */}
          <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 10, border: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>Product & Plan</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{order.product_name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{order.variant_name || 'Standard'} (Pool: {order.pool_id})</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>Customer / Buyer</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{order.username}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{order.user_email || `ID: ${order.user_id}`}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>Amount Paid</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-accent)', marginTop: 2 }}>
                ₹{order.price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: 600 }}>Delivery Mode</div>
              <div style={{ fontSize: 13, textTransform: 'capitalize', marginTop: 2 }}>
                {order.delivery_method || 'Instant Auto'}
              </div>
            </div>
          </div>

          {/* Status Switcher (Custom Dropdown without Emojis) */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span className="icon icon--sm" style={{ color: 'var(--color-primary-light)' }}>tune</span>
              <span>Order Fulfillment Status</span>
            </label>

            {/* Custom Dropdown Trigger */}
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: selectedStatusOpt.bg,
                border: `1.5px solid ${selectedStatusOpt.border}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="icon icon--sm" style={{ color: selectedStatusOpt.color, fontVariationSettings: "'FILL' 1" }}>
                  {selectedStatusOpt.icon}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, color: selectedStatusOpt.color }}>
                  {selectedStatusOpt.label}
                </span>
              </div>
              <span
                className="icon icon--sm icon--muted"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: selectedStatusOpt.color,
                }}
              >
                expand_more
              </span>
            </div>

            {/* Custom Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.65)',
                  zIndex: 100,
                  overflow: 'hidden',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {STATUS_DROPDOWN_OPTIONS.map((opt) => {
                  const isSelected = opt.value.toLowerCase() === (status || '').toLowerCase();
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
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? opt.bg : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-2)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="icon icon--sm" style={{ color: opt.color, fontVariationSettings: "'FILL' 1" }}>
                          {opt.icon}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? opt.color : 'var(--color-text)' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                            {opt.desc}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="icon icon--sm" style={{ color: opt.color }}>
                          check
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Credentials / Delivery Content */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Delivered Credentials / Digital Keys
              </label>
              {credentials && (
                <button
                  type="button"
                  onClick={() => handleCopy(credentials)}
                  className="btn btn--ghost btn--sm"
                  style={{ height: 24, padding: '0 8px', fontSize: 11, gap: 4 }}
                >
                  <span className="icon icon--sm" style={{ fontSize: 13 }}>content_copy</span> Copy
                </button>
              )}
            </div>
            <textarea
              className="form-input"
              rows={4}
              placeholder="user@example.com:password&#10;KEY-XXXX-YYYY"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
              {status === 'Pre-Order' || status === 'Pending'
                ? 'Paste the newly generated credentials here and set Status to "Delivered" to fulfill this order.'
                : 'Credentials already dispatched to the customer. You can edit or re-dispatch if needed.'}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="form-group">
            <label className="form-label">Internal Admin Notes (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Account replaced on 18 Apr, Warranty valid till Dec..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} className="btn btn--secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Update & Sync Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
