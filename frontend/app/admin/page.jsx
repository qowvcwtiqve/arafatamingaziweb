'use client';
import { useEffect, useState } from 'react';
import { LayoutDashboard, ReceiptText, Box, Users, CreditCard, TicketPercent, Wallet, Settings, Edit, Tags } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'products', label: 'Products', icon: Box },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'deposits', label: 'Deposits', icon: CreditCard },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
  { id: 'categories', label: 'Categories', icon: Tags },
];

function AdminModal({ config, onClose }) {
  const [val, setVal] = useState('');
  useEffect(() => { setVal(config?.initialValue || ''); }, [config]);
  
  if (!config?.isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card card--elevated" style={{ width: 400, maxWidth: '90%', padding: 24, animation: 'fadeIn 0.2s ease', border: '1px solid var(--color-border)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{config.title}</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>{config.message}</p>
        
        {config.type === 'prompt' && (
          <input className="form-input" placeholder={config.placeholder} value={val} onChange={e => setVal(e.target.value)} autoFocus style={{ marginBottom: 20 }} />
        )}
        
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${config.type === 'confirm' ? 'btn--danger' : 'btn--primary'}`} onClick={() => { config.onConfirm(val); onClose(); }}>
            {config.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState({});
  const [modalConfig, setModalConfig] = useState(null);
  const [editProductConfig, setEditProductConfig] = useState(null);
  const [showAddWebProduct, setShowAddWebProduct] = useState(false);

  const openPrompt = (title, message, initialValue, placeholder, onConfirm) => {
    setModalConfig({ type: 'prompt', title, message, initialValue, placeholder, onConfirm, isOpen: true });
  };
  const openConfirm = (title, message, onConfirm) => {
    setModalConfig({ type: 'confirm', title, message, onConfirm, isOpen: true, confirmText: 'Yes, Delete' });
  };

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
        const { data } = await api.get('/admin/bot/products');
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
      } else if (tab === 'categories') {
        const { data } = await api.get('/products/categories');
        setCategories(data.categories || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(l => ({ ...l, [tab]: false }));
    }
  };

  const handleDeleteProduct = (id, title, isWebsiteOnly) => {
    if (!isWebsiteOnly) {
      openConfirm('Unsupported Action', `Deleting bot products directly from the website is disabled. Please delete "${title}" via the Telegram Bot.`, () => {});
      return;
    }
    openConfirm('Delete Website Product', `Are you sure you want to delete "${title}"?`, async () => {
      try {
        await api.delete(`/admin/website-products/${id}`);
        setProducts(ps => ps.filter(p => p.id !== id));
        toast.success(`Product deleted`);
      } catch (err) {
        toast.error('Failed to delete product');
      }
    });
  };

  const handleDeleteCoupon = (id, code) => {
    openConfirm('Delete Coupon', `Are you sure you want to delete coupon "${code}"?`, async () => {
      try {
        await api.delete(`/admin/coupons/${id}`);
        setCoupons(cs => cs.filter(c => c.id !== id));
        toast.success(`Coupon "${code}" deleted`);
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to delete coupon');
      }
    });
  };

  const handleAddCategory = () => {
    openPrompt('Add Category', 'Enter the name of the new category:', '', 'e.g. Software & OS', async (name) => {
      if (!name) return;
      try {
        const { data } = await api.post('/admin/categories', { name });
        setCategories(prev => [data, ...prev]);
        toast.success('Category added');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to add category');
      }
    });
  };

  const handleEditCategory = (cat) => {
    openPrompt('Edit Category', 'Update the category name:', cat.name, 'Category name', async (name) => {
      if (!name || name === cat.name) return;
      try {
        const { data } = await api.put(`/admin/categories/${cat.id}`, { name, slug: cat.slug, description: cat.description });
        setCategories(prev => prev.map(c => c.id === cat.id ? data : c));
        toast.success('Category updated');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update category');
      }
    });
  };

  const handleDeleteCategory = (id, name) => {
    openConfirm('Delete Category', `Are you sure you want to delete the category "${name}"?`, async () => {
      try {
        await api.delete(`/admin/categories/${id}`);
        setCategories(prev => prev.filter(c => c.id !== id));
        toast.success('Category deleted');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to delete category');
      }
    });
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 'var(--header-height)' }}>
      <AdminModal config={modalConfig} onClose={() => setModalConfig(null)} />
      
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{
        width: 240, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
        position: 'fixed', top: 'var(--header-height)', bottom: 0, left: 0, padding: 16, zIndex: 100, overflowY: 'auto'
      }}>
        <div className="admin-sidebar-header" style={{ padding: '12px 12px 16px', marginBottom: 8, borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-faint)', marginBottom: 4 }}>
            Store Owner Admin
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
        </div>
        <nav className="admin-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => loadTab(t.id)}
              className="admin-sidebar-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: activeTab === t.id ? 'rgba(110,58,255,0.12)' : 'transparent',
                color: activeTab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500,
                transition: 'var(--transition-fast)', textAlign: 'left', width: '100%',
              }}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content" style={{ marginLeft: 240, flex: 1, padding: 32, maxWidth: 'calc(100% - 240px)' }}>
        
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
              <button 
                onClick={() => setShowAddWebProduct(true)}
                className="btn btn--primary btn--sm"
              >
                <span className="icon icon--sm">add</span> Add Website Product
              </button>
            </div>
            
            {/* Drafts Section */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#f59e0b' }}>
                <span className="icon" style={{ verticalAlign: 'middle', marginRight: 8 }}>edit_document</span>
                Drafts (Action Required)
              </h2>
              <ProductTable 
                products={products.filter(p => !p.website_meta?.is_published)} 
                setProducts={setProducts} 
                onEditMeta={setEditProductConfig} 
                onDelete={handleDeleteProduct}
              />
            </div>

            {/* Published Section */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#10b981' }}>
                <span className="icon" style={{ verticalAlign: 'middle', marginRight: 8 }}>public</span>
                Published Products
              </h2>
              <ProductTable 
                products={products.filter(p => p.website_meta?.is_published)} 
                setProducts={setProducts} 
                onEditMeta={setEditProductConfig} 
                onDelete={handleDeleteProduct}
              />
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700 }}>
                Manage <span className="text-gradient">Categories</span>
              </h1>
              <button onClick={handleAddCategory} className="btn btn--primary">
                <span className="icon icon--sm">add</span> Add Category
              </button>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Slug</th><th>Created At</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td><span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--color-surface-2)', borderRadius: 4 }}>{c.slug}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleEditCategory(c)} className="btn btn--ghost btn--sm" title="Edit Category">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteCategory(c.id, c.name)} className="btn btn--danger btn--sm" title="Delete Category">
                            <span className="icon icon--sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No categories found.</td></tr>
                  )}
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
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className={`btn btn--sm ${u.is_frozen ? 'btn--outline' : 'btn--danger'}`}
                            onClick={async () => {
                              try {
                                await api.put(`/admin/users/${u.id}/freeze`);
                                setUsers(us => us.map(x => x.id === u.id ? { ...x, is_frozen: !x.is_frozen } : x));
                                toast.success(u.is_frozen ? 'User unfrozen' : 'User frozen');
                              } catch (err) {
                                toast.error(err.response?.data?.error || 'Action failed');
                              }
                            }}
                          >
                            <span className="icon icon--sm">{u.is_frozen ? 'lock_open' : 'block'}</span>
                            {u.is_frozen ? 'Unfreeze' : 'Freeze'}
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              openPrompt('Edit Balance', `Add (+ve) or Deduct (-ve) balance for ${u.name}. Or type 'reset' to set to 0.`, '', 'e.g. 500, -100, reset', async (input) => {
                                if (!input) return;
                                let action = 'add';
                                let amount = parseFloat(input);
                                
                                if (input.toLowerCase().trim() === 'reset') {
                                  action = 'reset';
                                  amount = 0;
                                } else if (amount < 0) {
                                  action = 'deduct';
                                  amount = Math.abs(amount);
                                } else if (isNaN(amount) || amount === 0) {
                                  return toast.error('Invalid amount');
                                }

                                try {
                                  const { data } = await api.put(`/admin/users/${u.id}/balance`, { action, amount });
                                  setUsers(us => us.map(x => x.id === u.id ? { ...x, balance: data.balance } : x));
                                  toast.success('Balance updated');
                                } catch (err) {
                                  toast.error(err.response?.data?.error || 'Failed to update balance');
                                }
                              });
                            }}
                          >
                            <span className="icon icon--sm">account_balance_wallet</span>
                            Balance
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

      {/* Edit Product Meta Modal */}
      {editProductConfig && (
        <EditProductMetaModal 
          product={editProductConfig} 
          onClose={() => setEditProductConfig(null)} 
          onUpdate={(updated) => {
            setProducts(ps => ps.map(p => p.id === updated.id ? updated : p));
            setEditProductConfig(null);
          }} 
        />
      )}

      {/* Add Website Product Modal */}
      {showAddWebProduct && (
        <AddWebProductModal 
          onClose={() => setShowAddWebProduct(false)}
          onAdd={(newProd) => {
            setProducts(ps => [newProd, ...ps]);
            setShowAddWebProduct(false);
          }}
        />
      )}
    </div>
  );
}

function ProductTable({ products, setProducts, onEditMeta, onDelete }) {
  if (products.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-faint)' }}>No products in this category.</div>;
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr><th>Source</th><th>Website Title</th><th>Price Range</th><th>Featured</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {products.map(p => {
            const minPrice = p.variants?.length ? Math.min(...p.variants.map(v => v.price)) : (p.website_meta?.min_price || 0);
            return (
              <tr key={p.id}>
                <td style={{ maxWidth: 120 }}>
                  {p.is_website_only ? (
                    <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'var(--color-surface-2)', color: 'var(--color-accent)', fontWeight: 600 }}>Web</span>
                  ) : (
                    <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: '#3b82f633', color: '#60a5fa', fontWeight: 600 }}>Bot</span>
                  )}
                  {!p.is_website_only && <span style={{ fontSize: 12, color: 'var(--color-text-faint)', display: 'block', marginTop: 4 }}>{p.name}</span>}
                </td>
                <td style={{ maxWidth: 220 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>{p.website_meta?.title || p.name || 'Not Set'}</span>
                  {p.website_meta?.compare_price && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-faint)', textDecoration: 'line-through' }}>₹{p.website_meta.compare_price}</span>
                  )}
                </td>
                <td><span style={{ fontWeight: 700 }}>₹{minPrice.toLocaleString('en-IN')}</span></td>
                <td>
                  <button
                    onClick={async () => {
                      const isF = p.website_meta?.is_featured;
                      await api.put(`/admin/bot/products/${p.id}/website-meta`, { is_featured: !isF });
                      setProducts(ps => ps.map(x => x.id === p.id ? { ...x, website_meta: { ...x.website_meta, is_featured: !isF } } : x));
                      toast.success(isF ? 'Removed from featured' : 'Marked as featured');
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.website_meta?.is_featured ? '#f59e0b' : 'var(--color-text-faint)' }}
                  >
                    <span className="icon icon--md" style={{ fontVariationSettings: p.website_meta?.is_featured ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.website_meta?.is_published && (
                      <Link href={`/products/${p.id}`} target="_blank" className="btn btn--ghost btn--sm" title="View product in store">
                        <span className="icon icon--sm">visibility</span>
                      </Link>
                    )}
                    <button onClick={() => onEditMeta(p)} className="btn btn--ghost btn--sm" title="Edit Website Meta">
                      <Edit size={16} /> Edit
                    </button>
                    {p.is_website_only && (
                      <button onClick={() => onDelete(p.id, p.name, true)} className="btn btn--danger btn--sm" title="Delete Website Product">
                        <span className="icon icon--sm">delete</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddWebProductModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', images: '', compare_price: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean)
      };
      const { data } = await api.post('/admin/website-products', payload);
      // Map it immediately so it looks like the others in the table
      const newP = data.product;
      const mapped = {
        id: newP._id, name: newP.name, is_website_only: true, variants: [],
        website_meta: {
          title: newP.name, description: newP.description, images: newP.images,
          compare_price: newP.compare_price, is_published: newP.is_published, badge: newP.badge
        }
      };
      onAdd(mapped);
      toast.success('Website product added');
    } catch (err) {
      toast.error('Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card card--elevated" style={{ width: 500, maxWidth: '90%', padding: 32 }}>
        <h2 style={{ marginBottom: 20 }}>Add Website Product</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Price (₹)</label>
            <input type="number" required className="form-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Compare Price (Optional)</label>
            <input type="number" className="form-input" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>Add Product</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductMetaModal({ product, onClose, onUpdate }) {
  const [form, setForm] = useState({
    title: product.website_meta?.title || product.name,
    description: product.website_meta?.description || product.description || '',
    images: (product.website_meta?.images || []).join('\n'),
    badge: product.website_meta?.badge || '',
    compare_price: product.website_meta?.compare_price || '',
    is_published: product.website_meta?.is_published || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null
      };
      await api.put(`/admin/bot/products/${product.id}/website-meta`, payload);
      
      const updatedProduct = { ...product, website_meta: { ...product.website_meta, ...payload } };
      onUpdate(updatedProduct);
      toast.success('Website meta updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card card--elevated" style={{ width: 600, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', padding: 32, animation: 'fadeIn 0.2s ease', border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Edit Website Meta</h2>
        <div style={{ marginBottom: 20, padding: 12, background: 'var(--color-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
          Editing <strong>{product.name}</strong>. These fields are for the website only and do not affect the Telegram bot.
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Display Title</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          
          <div className="form-group">
            <label className="form-label">Description (Markdown/HTML supported)</label>
            <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Compare Price (Old Price ₹)</label>
              <input type="number" className="form-input" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Badge (e.g. Hot, Sale)</label>
              <input className="form-input" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Images URLs (One per line)</label>
            <textarea className="form-input" rows={3} placeholder="https://..." value={form.images} onChange={e => setForm(f => ({ ...f, images: e.target.value }))} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px', background: 'var(--color-surface-2)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <input type="checkbox" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} style={{ width: 18, height: 18 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Publish on Website</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>If unchecked, this product will remain in Drafts.</div>
            </div>
          </label>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
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
