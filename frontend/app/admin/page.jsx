'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '../../components/layout/Logo';
import {
  LayoutDashboard,
  ReceiptText,
  Box,
  Users,
  CreditCard,
  TicketPercent,
  Edit,
  Tags,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Modularized Admin Sub-Components
import AdminModal from '../../components/admin/AdminModal';
import ProductsManagementTab from '../../components/admin/ProductsManagementTab';
import EditProductMetaModal from '../../components/admin/EditProductMetaModal';
import CreateProductModal from '../../components/admin/CreateProductModal';
import OrdersManagementTab from '../../components/admin/OrdersManagementTab';
import CouponsTab from '../../components/admin/CouponsTab';
import UserDetailModal from '../../components/admin/UserDetailModal';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'products', label: 'Products', icon: Box },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'deposits', label: 'Deposits', icon: CreditCard },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
  { id: 'categories', label: 'Categories', icon: Tags },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('dark');
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('quantumxd-theme', next);
  };

  const openPrompt = (title, message, initialValue, placeholder, onConfirm) => {
    setModalConfig({ type: 'prompt', title, message, initialValue, placeholder, onConfirm, isOpen: true });
  };
  const openConfirm = (title, message, onConfirm) => {
    setModalConfig({ type: 'confirm', title, message, onConfirm, isOpen: true, confirmText: 'Yes, Delete' });
  };

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('quantumxd-theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

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

    if (currentUser.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadTab('overview');
  }, [user, mounted, _hasHydrated]);

  // ⚡ Live Real-time Auto-Sync with Telegram Bot Database
  useEffect(() => {
    if (!mounted) return;

    let eventSource = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('bot_product_changed', () => {
        if (activeTab === 'products') {
          api.get('/admin/bot/products').then(({ data }) => {
            if (data.products) setProducts(data.products);
          }).catch(() => {});
        }
        api.get('/admin/stats').then(({ data }) => {
          if (data) setStats(data);
        }).catch(() => {});
      });
    } catch {
      // ignore
    }

    // High-speed background sync every 5 seconds (Zero refresh needed)
    const syncInterval = setInterval(() => {
      if (activeTab === 'products') {
        api.get('/admin/bot/products').then(({ data }) => {
          if (data.products) setProducts(data.products);
        }).catch(() => {});
      } else if (activeTab === 'overview') {
        api.get('/admin/stats').then(({ data }) => {
          if (data) setStats(data);
        }).catch(() => {});
      }
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(syncInterval);
    };
  }, [mounted, activeTab]);

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
        const [pRes, cRes] = await Promise.all([
          api.get('/admin/bot/products'),
          api.get('/products/categories')
        ]);
        setProducts(pRes.data.products || []);
        setCategories(cRes.data.categories || []);
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
    openConfirm('Delete Product', `Are you sure you want to delete "${title}"? This will permanently remove it from both Website and Telegram Bot.`, async () => {
      try {
        if (isWebsiteOnly) {
          await api.delete(`/admin/website-products/${id}`);
        } else {
          await api.delete(`/admin/bot/products/${id}`);
        }
        setProducts(ps => ps.filter(p => p.id !== id));
        toast.success(`Product "${title}" deleted`);
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
        toast.error('Failed to delete coupon');
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

  const displayUser = mounted
    ? (user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('quantumxd-auth') || '{}')?.state?.user : null))
    : null;

  if (!mounted || !displayUser || displayUser.role !== 'admin') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 60, height: 60, borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <AdminModal config={modalConfig} onClose={() => setModalConfig(null)} />
      
      {/* Standalone Clean Admin Sidebar */}
      <aside className="admin-sidebar" style={{
        width: 250,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        padding: '20px 16px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto'
      }}>
        <div>
          {/* Brand Logo & Store Link */}
          <div style={{ padding: '0 4px 18px', borderBottom: '1px solid var(--color-border)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Logo size="medium" />
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.06em',
                padding: '3px 8px',
                borderRadius: 12,
                background: 'rgba(110, 58, 255, 0.15)',
                color: 'var(--color-primary-light)',
                textTransform: 'uppercase'
              }}>
                ADMIN
              </span>
            </div>

            {/* Direct 1-Click Link to Live Store */}
            <Link
              href="/"
              target="_blank"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'var(--color-text)',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="icon icon--sm icon--cyan">storefront</span>
                <span>Go to Store</span>
              </div>
              <span className="icon icon--sm icon--muted" style={{ fontSize: 14 }}>open_in_new</span>
            </Link>
          </div>

          {/* Nav Tabs */}
          <nav className="admin-sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => loadTab(t.id)}
                className="admin-sidebar-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px',
                  borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  background: activeTab === t.id ? 'var(--gradient-primary)' : 'transparent',
                  color: activeTab === t.id ? '#fff' : 'var(--color-text-muted)',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
                  transition: 'all 0.2s ease', textAlign: 'left', width: '100%',
                  boxShadow: activeTab === t.id ? '0 4px 14px rgba(110, 58, 255, 0.35)' : 'none'
                }}
              >
                <t.icon size={18} />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          {/* Dark / Light Mode Switch */}
          <button
            onClick={toggleTheme}
            type="button"
            className="btn btn--outline btn--sm"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="icon icon--sm" style={{ color: theme === 'light' ? '#f59e0b' : 'var(--color-cyan)' }}>
                {theme === 'light' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{theme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
            </div>
            <span className="icon icon--sm icon--muted" style={{ fontSize: 13 }}>tune</span>
          </button>

          <div style={{ padding: '4px 6px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', fontWeight: 700 }}>
              Logged in as
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayUser.email}
            </div>
          </div>

          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/login');
            }}
            className="btn btn--ghost btn--sm"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--color-error)' }}
          >
            <span className="icon icon--sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content" style={{ marginLeft: 250, flex: 1, padding: '32px 40px', maxWidth: 'calc(100% - 250px)' }}>
        
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
                  { label: 'Active Bot Products', value: `${stats.active_products || 0} Products`, icon: 'inventory_2', color: '#00D4FF' },
                  { label: 'Bot Categories', value: `${stats.total_categories || 7} Categories`, icon: 'category', color: '#10b981' },
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
                <button className="btn btn--primary btn--sm" onClick={() => loadTab('products')}>
                  <span className="icon icon--sm">inventory_2</span> Manage Bot Products ({stats?.active_products || 0})
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => loadTab('orders')}>
                  <span className="icon icon--sm">receipt</span> View Orders
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => loadTab('categories')}>
                  <span className="icon icon--sm">category</span> Categories ({stats?.total_categories || 7})
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
          <OrdersManagementTab />
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <ProductsManagementTab
            products={products}
            setProducts={setProducts}
            categories={categories}
            onEditMeta={setEditProductConfig}
            onDelete={handleDeleteProduct}
            onAddProduct={() => setShowAddProduct(true)}
            loading={loading.products}
          />
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
                            className="btn btn--secondary btn--sm"
                            onClick={() => setSelectedUserId(u.id)}
                            style={{ gap: 5 }}
                          >
                            <span className="icon icon--sm">person</span>
                            View Details
                          </button>
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

        {/* USER DETAIL MODAL */}
        {selectedUserId && (
          <UserDetailModal
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onUserUpdated={(id, newBalance) => {
              setUsers(us => us.map(u => u.id === id ? { ...u, balance: newBalance } : u));
            }}
          />
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

      {/* Add New Bot Product Modal */}
      {showAddProduct && (
        <CreateProductModal 
          categories={categories}
          onClose={() => setShowAddProduct(false)}
          onAdd={(newProd) => {
            setProducts(ps => [newProd, ...ps]);
            setShowAddProduct(false);
          }}
        />
      )}
    </div>
  );
}
