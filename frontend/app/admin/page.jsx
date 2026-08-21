'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
  { id: 'products', label: 'Products', icon: 'inventory_2' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'deposits', label: 'Deposits', icon: 'payments' },
  { id: 'coupons', label: 'Coupons', icon: 'local_offer' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    if (user.role !== 'admin') { router.push('/dashboard'); return; }
    loadTab('overview');
  }, [user]);

  const loadTab = async (tab) => {
    setActiveTab(tab);
    setLoading(l => ({ ...l, [tab]: true }));
    try {
      if (tab === 'overview') {
        const { data } = await api.get('/admin/stats');
        setStats(data);
      } else if (tab === 'orders') {
        const { data } = await api.get('/admin/orders?limit=50');
        setOrders(data.orders || []);
      } else if (tab === 'products') {
        const { data } = await api.get('/admin/products');
        setProducts(data.products || []);
      } else if (tab === 'users') {
        const { data } = await api.get('/admin/users?limit=50');
        setUsers(data.users || []);
      } else if (tab === 'deposits') {
        const { data } = await api.get('/admin/deposits');
        setDeposits(data.deposits || []);
      } else if (tab === 'coupons') {
        const { data } = await api.get('/admin/coupons');
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  };

  const handleDeleteProduct = async (id, title) => {
    try {
      await api.delete(`/admin/products/${id}`);
      setProducts(ps => ps.filter(p => p.id !== id));
      toast.success(`Product "${title}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete product');
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    try {
      await api.delete(`/admin/coupons/${id}`);
      setCoupons(cs => cs.filter(c => c.id !== id));
      toast.success(`Coupon "${code}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete coupon');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 'var(--header-height)' }}>
      
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
        position: 'fixed', top: 'var(--header-height)', bottom: 0, left: 0, padding: 16, zIndex: 100, overflowY: 'auto'
      }}>
        <div style={{ padding: '12px 12px 16px', marginBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)', marginBottom: 4 }}>
            Store Owner Admin
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => loadTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: activeTab === t.id ? 'rgba(110,58,255,0.12)' : 'transparent',
                color: activeTab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                transition: 'var(--transition-fast)', textAlign: 'left', width: '100%',
              }}
            >
              <span className="icon icon--sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main style={{ marginLeft: 240, flex: 1, padding: 32, maxWidth: 'calc(100% - 240px)' }}>
        
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 28 }}>
              Dashboard <span className="text-gradient">Overview</span>
            </h1>
            {stats ? (
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {[
                  { label: 'Total Revenue', value: `₹${parseFloat(stats.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: 'payments', color: 'var(--color-accent)' },
                  { label: 'Paid Orders', value: stats.paid_orders || 0, icon: 'shopping_bag', color: 'var(--color-primary-light)' },
                  { label: 'Active Products', value: stats.active_products || 0, icon: 'inventory_2', color: '#00D4FF' },
                  { label: 'Total Users', value: stats.total_users || 0, icon: 'group', color: '#10b981' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-card__icon" style={{ color: s.color, background: `${s.color}18` }}>
                      <span className="icon icon--md">{s.icon}</span>
                    </div>
                    <div className="stat-card__label">{s.label}</div>
                    <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />)}
              </div>
            )}
            <div style={{ marginTop: 24, padding: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/admin/products/new" className="btn btn--primary btn--sm">
                  <span className="icon icon--sm">add</span> Add New Product
                </Link>
                <button className="btn btn--ghost btn--sm" onClick={() => loadTab('orders')}>
                  <span className="icon icon--sm">receipt</span> View Orders
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => loadTab('coupons')}>
                  <span className="icon icon--sm">local_offer</span> Manage Coupons
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>
              All <span className="text-gradient">Orders</span>
            </h1>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th><th>Buyer</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.orders ? (
                    <tr><td colSpan={6}><div className="skeleton" style={{ height: 40, margin: 8 }} /></td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id}>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--color-primary-light)', fontSize: 13 }}>#{o.order_number}</span></td>
                      <td>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{o.buyer_name || 'Customer'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{o.buyer_email || '-'}</div>
                      </td>
                      <td><span style={{ fontWeight: 700 }}>₹{parseFloat(o.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></td>
                      <td><span style={{ textTransform: 'capitalize', fontSize: 13, color: 'var(--color-text-muted)' }}>{o.payment_method}</span></td>
                      <td><span className={`status status--${o.payment_status === 'paid' ? 'paid' : o.payment_status === 'pending' ? 'pending' : 'failed'}`}>{o.payment_status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700 }}>
                Store <span className="text-gradient">Products</span> ({products.length})
              </h1>
              <Link href="/admin/products/new" className="btn btn--primary btn--sm">
                <span className="icon icon--sm">add</span> Add New Product
              </Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Title</th><th>Category</th><th>Price</th><th>Featured</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 220 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize', fontSize: 12, padding: '2px 8px', background: 'var(--color-surface-2)', borderRadius: 4 }}>
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td><span style={{ fontWeight: 700 }}>₹{parseFloat(p.price).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></td>
                      <td>
                        <button
                          onClick={async () => {
                            await api.put(`/admin/products/${p.id}/feature`);
                            setProducts(ps => ps.map(x => x.id === p.id ? { ...x, is_featured: !x.is_featured } : x));
                            toast.success(p.is_featured ? 'Removed from featured' : 'Marked as featured');
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_featured ? '#f59e0b' : 'var(--color-text-faint)' }}
                          title="Toggle featured badge"
                        >
                          <span className="icon icon--md" style={{ fontVariationSettings: p.is_featured ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                        </button>
                      </td>
                      <td><span className={`status status--${p.status === 'active' ? 'paid' : 'pending'}`}>{p.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/products/${p.slug}`} target="_blank" className="btn btn--ghost btn--sm" title="View product in store">
                            <span className="icon icon--sm">visibility</span>
                          </Link>
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => handleDeleteProduct(p.id, p.title)}
                            title="Delete this product"
                          >
                            <span className="icon icon--sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>
              Registered <span className="text-gradient">Users</span>
            </h1>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{u.email}</td>
                      <td><span className="badge badge--new" style={{ textTransform: 'capitalize' }}>{u.role}</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{parseFloat(u.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className={`btn btn--sm ${u.is_frozen ? 'btn--outline' : 'btn--danger'}`}
                          onClick={async () => {
                            await api.put(`/admin/users/${u.id}/freeze`);
                            setUsers(us => us.map(x => x.id === u.id ? { ...x, is_frozen: !x.is_frozen } : x));
                            toast.success(u.is_frozen ? 'User unfrozen' : 'User frozen');
                          }}
                        >
                          <span className="icon icon--sm">{u.is_frozen ? 'lock_open' : 'block'}</span>
                          {u.is_frozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPOSITS */}
        {activeTab === 'deposits' && (
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>
              Payment <span className="text-gradient">History</span>
            </h1>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>User</th><th>Amount</th><th>Gateway</th><th>TX ID</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{d.user_name || 'Customer'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{d.user_email || '-'}</div>
                      </td>
                      <td><span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>₹{parseFloat(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></td>
                      <td><span style={{ textTransform: 'capitalize', fontSize: 13 }}>{d.gateway}</span></td>
                      <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-faint)' }}>{(d.transaction_id || '').slice(0, 20)}...</span></td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COUPONS */}
        {activeTab === 'coupons' && (
          <CouponsTab
            coupons={coupons}
            onAdd={(c) => setCoupons(cs => [c, ...cs])}
            onDelete={handleDeleteCoupon}
          />
        )}

      </main>
    </div>
  );
}

function CouponsTab({ coupons, onAdd, onDelete }) {
  const [form, setForm] = useState({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '100' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Coupon code is required');
    setCreating(true);
    try {
      const { data } = await api.post('/admin/coupons', form);
      onAdd(data.coupon);
      toast.success('Coupon created successfully!');
      setForm({ code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '100' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create coupon');
    } finally { setCreating(false); }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 24 }}>
        Discount <span className="text-gradient">Coupons</span>
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Create Coupon Form */}
        <div className="card card--elevated" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Create New Coupon
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Coupon Code</label>
              <input
                className="form-input"
                placeholder="e.g. FLASH50"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Type</label>
              <select className="form-input" value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Discount Value</label>
              <input
                type="number"
                className="form-input"
                placeholder={form.discount_type === 'percent' ? 'e.g. 20 (for 20% off)' : 'e.g. 150 (for ₹150 off)'}
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Order Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0 for no minimum"
                value={form.min_order_amount}
                onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Uses</label>
              <input
                type="number"
                className="form-input"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={creating} style={{ height: 42, marginTop: 6 }}>
              <span className="icon icon--sm">add</span>
              {creating ? 'Creating...' : 'Create Coupon'}
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 32 }}>No coupons created yet</td></tr>
              ) : (
                coupons.map(c => (
                  <tr key={c.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-light)', fontSize: 14 }}>{c.code}</span></td>
                    <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{c.discount_type}</td>
                    <td><span style={{ fontWeight: 700 }}>{c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`}</span></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{c.used_count || 0}/{c.max_uses}</td>
                    <td><span className={`status status--${c.is_active ? 'paid' : 'failed'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => onDelete(c.id, c.code)}
                        title="Delete coupon"
                      >
                        <span className="icon icon--sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
