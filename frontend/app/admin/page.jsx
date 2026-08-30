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
  Edit2,
  Tags,
  Wallet,
  MessageSquare,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  IndianRupee,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
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
import PaymentSettingsTab from '../../components/admin/PaymentSettingsTab';
import TicketsManagementTab from '../../components/admin/TicketsManagementTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
  { id: 'orders', label: 'Orders', icon: ReceiptText },
  { id: 'products', label: 'Products Catalog', icon: Box },
  { id: 'users', label: 'Users & Wallets', icon: Users },
  { id: 'payments', label: 'Payment Gateways', icon: Wallet },
  { id: 'deposits', label: 'Deposit Verifications', icon: CreditCard },
  { id: 'coupons', label: 'Discount Coupons', icon: TicketPercent },
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
  const [userSearch, setUserSearch] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [depositSearch, setDepositSearch] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState({});
  const [modalConfig, setModalConfig] = useState(null);
  const [editProductConfig, setEditProductConfig] = useState(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // ⚡ Live Real-time Auto-Sync with Realtime Events
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
    setMobileSidebarOpen(false);
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
        toast.error('Failed to delete category');
      }
    });
  };

  const displayUser = mounted
    ? (user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('quantumxd-auth') || '{}')?.state?.user : null))
    : null;

  if (!mounted || !displayUser || displayUser.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0E14' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(56, 116, 255, 0.2)', borderTopColor: '#3874FF', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const currentTabObj = TABS.find(t => t.id === activeTab) || TABS[0];
  const CurrentIcon = currentTabObj.icon;

  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (u.name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s) || (u.id || '').toLowerCase().includes(s);
  });

  const filteredDeposits = deposits.filter(d => {
    if (!depositSearch) return true;
    const s = depositSearch.toLowerCase();
    return (d.user_name || '').toLowerCase().includes(s) || (d.user_email || '').toLowerCase().includes(s) || (d.transaction_id || '').toLowerCase().includes(s) || (d.gateway || '').toLowerCase().includes(s);
  });

  return (
    <div className="admin-master-wrapper">
      <AdminModal config={modalConfig} onClose={() => setModalConfig(null)} />

      {/* MOBILE TOP APPBAR */}
      <header className="admin-mobile-header">
        <div className="admin-mobile-header-left">
          <button
            type="button"
            className="admin-hamburger-btn"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size="small" showTag={false} />
            <span className="admin-brand-badge">ADMIN</span>
          </div>
        </div>

        <div className="admin-mobile-header-actions">
          <button
            type="button"
            className="admin-theme-switch-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link
            href="/"
            target="_blank"
            className="admin-theme-switch-btn"
            title="Open Live Store"
          >
            <ExternalLink size={15} />
          </Link>
        </div>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      <div 
        className={`admin-drawer-backdrop ${mobileSidebarOpen ? 'is-open' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* DESKTOP & SLIDE-OVER MOBILE SIDEBAR */}
      <aside className={`admin-sidebar ${mobileSidebarOpen ? 'is-mobile-open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link href="/" className="admin-brand-tag" target="_blank">
            <Logo size="medium" showTag={false} />
            <div className="admin-brand-text">
              <span className="admin-brand-badge">EXECUTIVE SUITE</span>
            </div>
          </Link>
          <button
            type="button"
            className="admin-sidebar-close-btn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => loadTab(t.id)}
                className={`admin-nav-item-btn ${isActive ? 'is-active' : ''}`}
              >
                <div className="admin-nav-item-left">
                  <Icon className="admin-nav-icon" />
                  <span className="admin-nav-label">{t.label}</span>
                </div>
                {t.id === 'tickets' && stats?.open_tickets > 0 && (
                  <span className="admin-nav-pill-count alert">{stats.open_tickets}</span>
                )}
                {t.id === 'orders' && stats?.pending_orders > 0 && (
                  <span className="admin-nav-pill-count">{stats.pending_orders}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-tag">
            <div className="admin-user-avatar">
              {(displayUser.name || displayUser.email || 'A')[0].toUpperCase()}
            </div>
            <div className="admin-user-info">
              <span className="admin-user-name">{displayUser.name || 'Administrator'}</span>
              <span className="admin-user-role">Super Admin</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="admin-theme-switch-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              type="button"
              className="admin-theme-switch-btn"
              onClick={() => {
                useAuthStore.getState().logout();
                router.push('/login');
              }}
              title="Sign Out"
            >
              <LogOut size={15} color="#EF4444" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <div className="admin-main-container">
        
        {/* DESKTOP TOP HEADER STRIP */}
        <div className="admin-top-header-strip">
          <div className="admin-header-title-box">
            <CurrentIcon size={22} color="#3874FF" />
            <h1 className="admin-section-heading">{currentTabObj.label}</h1>
            <div className="admin-live-pulse-badge">
              <span className="admin-pulse-dot" />
              <span>Realtime Engine Active</span>
            </div>
          </div>

          <div className="admin-header-actions">
            <Link href="/" target="_blank" className="admin-view-store-link">
              <ExternalLink size={14} />
              <span>Live Marketplace</span>
            </Link>
          </div>
        </div>

        {/* CONTENT BODY */}
        <main className="admin-content-body">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Metric Cards Grid */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Total Revenue</span>
                    <div className="admin-stat-icon-wrap emerald">
                      <IndianRupee size={18} />
                    </div>
                  </div>
                  <div className="admin-stat-value" style={{ color: '#10B981' }}>
                    ₹{parseFloat(stats?.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="admin-stat-subtext">
                    <TrendingUp size={13} color="#10B981" />
                    <span>Verified gateway transactions</span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Delivered Orders</span>
                    <div className="admin-stat-icon-wrap">
                      <ReceiptText size={18} />
                    </div>
                  </div>
                  <div className="admin-stat-value" style={{ color: '#3874FF' }}>
                    {stats?.paid_orders || 0}
                  </div>
                  <div className="admin-stat-subtext">
                    <span>Instant automated fulfillment</span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Live Catalog</span>
                    <div className="admin-stat-icon-wrap purple">
                      <Box size={18} />
                    </div>
                  </div>
                  <div className="admin-stat-value" style={{ color: '#8B5CF6' }}>
                    {stats?.active_products || 0}
                  </div>
                  <div className="admin-stat-subtext">
                    <span>Active keys & license stock</span>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Registered Accounts</span>
                    <div className="admin-stat-icon-wrap amber">
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="admin-stat-value" style={{ color: '#F59E0B' }}>
                    {stats?.total_users || users.length || 0}
                  </div>
                  <div className="admin-stat-subtext">
                    <span>Customer wallet profiles</span>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Matrix */}
              <div className="admin-card-section">
                <div className="admin-card-header">
                  <div className="admin-card-title">
                    <ShieldCheck size={18} color="#3874FF" />
                    <span>Executive Quick Controls</span>
                  </div>
                </div>
                <div style={{ padding: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-primary" 
                    onClick={() => loadTab('products')}
                  >
                    <Box size={16} />
                    <span>Manage Catalog</span>
                  </button>
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-secondary" 
                    onClick={() => loadTab('orders')}
                  >
                    <ReceiptText size={16} />
                    <span>View Orders</span>
                  </button>
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-secondary" 
                    onClick={() => loadTab('tickets')}
                  >
                    <MessageSquare size={16} />
                    <span>Support Queue</span>
                  </button>
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-secondary" 
                    onClick={() => loadTab('deposits')}
                  >
                    <CreditCard size={16} />
                    <span>Deposit Logs</span>
                  </button>
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-secondary" 
                    onClick={() => loadTab('payments')}
                  >
                    <Wallet size={16} />
                    <span>Payment Gateways</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <TicketsManagementTab />
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <OrdersManagementTab />
          )}

          {/* TAB 4: PRODUCTS */}
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

          {/* TAB 5: USERS */}
          {activeTab === 'users' && (
            <div className="admin-card-section">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <Users size={18} color="#3874FF" />
                  <span>Customer Directory ({filteredUsers.length})</span>
                </div>
                <div className="admin-card-actions">
                  <div className="admin-search-box">
                    <Search size={16} color="var(--color-text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search by name, email, ID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="admin-table-responsive hide-on-mobile">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Wallet Balance</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{u.name || 'User'}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span className={`admin-badge ${u.role === 'admin' ? 'processing' : 'closed'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                            ₹{parseFloat(u.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${u.is_frozen ? 'failed' : 'approved'}`}>
                            {u.is_frozen ? 'Frozen' : 'Active'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                          {new Date(u.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => setSelectedUserId(u.id)}
                            >
                              <Eye size={14} />
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              className={`admin-btn admin-btn-sm ${u.is_frozen ? 'admin-btn-secondary' : 'admin-btn-danger'}`}
                              onClick={async () => {
                                try {
                                  await api.put(`/admin/users/${u.id}/freeze`);
                                  setUsers(us => us.map(x => x.id === u.id ? { ...x, is_frozen: !x.is_frozen } : x));
                                  toast.success(u.is_frozen ? 'User un-frozen' : 'User frozen');
                                } catch (err) {
                                  toast.error(err.response?.data?.error || 'Action failed');
                                }
                              }}
                            >
                              {u.is_frozen ? <Unlock size={14} /> : <Lock size={14} />}
                              <span>{u.is_frozen ? 'Unfreeze' : 'Freeze'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                          No users matched your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Dedicated Touch Cards */}
              <div className="admin-mobile-card-list">
                {filteredUsers.map(u => (
                  <div key={u.id} className="admin-mobile-card">
                    <div className="admin-mobile-card-header">
                      <div>
                        <div className="admin-mobile-card-title">{u.name || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{u.email}</div>
                      </div>
                      <span className={`admin-badge ${u.is_frozen ? 'failed' : 'approved'}`}>
                        {u.is_frozen ? 'Frozen' : 'Active'}
                      </span>
                    </div>

                    <div className="admin-mobile-card-rows">
                      <div className="admin-mobile-card-row">
                        <span>Role:</span>
                        <strong style={{ textTransform: 'capitalize' }}>{u.role}</strong>
                      </div>
                      <div className="admin-mobile-card-row">
                        <span>Wallet Balance:</span>
                        <strong style={{ color: '#10B981', fontSize: 14 }}>
                          ₹{parseFloat(u.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </strong>
                      </div>
                      <div className="admin-mobile-card-row">
                        <span>Joined:</span>
                        <span>{new Date(u.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>

                    <div className="admin-mobile-card-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => setSelectedUserId(u.id)}
                      >
                        <Eye size={15} />
                        <span>Manage User</span>
                      </button>
                      <button
                        type="button"
                        className={`admin-btn ${u.is_frozen ? 'admin-btn-secondary' : 'admin-btn-danger'}`}
                        onClick={async () => {
                          try {
                            await api.put(`/admin/users/${u.id}/freeze`);
                            setUsers(us => us.map(x => x.id === u.id ? { ...x, is_frozen: !x.is_frozen } : x));
                            toast.success(u.is_frozen ? 'User un-frozen' : 'User frozen');
                          } catch (err) {
                            toast.error(err.response?.data?.error || 'Action failed');
                          }
                        }}
                      >
                        {u.is_frozen ? <Unlock size={15} /> : <Lock size={15} />}
                        <span>{u.is_frozen ? 'Unfreeze' : 'Freeze'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENT GATEWAY SETTINGS */}
          {activeTab === 'payments' && (
            <PaymentSettingsTab />
          )}

          {/* TAB 7: DEPOSITS VERIFICATIONS */}
          {activeTab === 'deposits' && (
            <div className="admin-card-section">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <CreditCard size={18} color="#3874FF" />
                  <span>Deposit Transactions Log ({filteredDeposits.length})</span>
                </div>
                <div className="admin-card-actions">
                  <div className="admin-search-box">
                    <Search size={16} color="var(--color-text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
                    <input
                      type="text"
                      className="admin-search-input"
                      placeholder="Search by user, UTR, gateway..."
                      value={depositSearch}
                      onChange={(e) => setDepositSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="admin-table-responsive hide-on-mobile">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Gateway</th>
                      <th>Transaction ID / UTR</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeposits.map(d => (
                      <tr key={d.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{d.user_name || 'Customer'}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{d.user_email || '-'}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                            ₹{parseFloat(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td>
                          <span className="admin-badge processing" style={{ textTransform: 'uppercase' }}>
                            {d.gateway}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {d.transaction_id || '-'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                          {new Date(d.created_at).toLocaleString('en-GB')}
                        </td>
                        <td>
                          <span className="admin-badge approved">
                            <CheckCircle2 size={12} />
                            <span>Credited</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredDeposits.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                          No deposit records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch Cards */}
              <div className="admin-mobile-card-list">
                {filteredDeposits.map(d => (
                  <div key={d.id} className="admin-mobile-card">
                    <div className="admin-mobile-card-header">
                      <div>
                        <div className="admin-mobile-card-title">{d.user_name || 'Customer'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{d.user_email || '-'}</div>
                      </div>
                      <span className="admin-badge approved">
                        <CheckCircle2 size={12} />
                        <span>Credited</span>
                      </span>
                    </div>

                    <div className="admin-mobile-card-rows">
                      <div className="admin-mobile-card-row">
                        <span>Amount:</span>
                        <strong style={{ color: '#10B981', fontSize: 15 }}>
                          ₹{parseFloat(d.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </strong>
                      </div>
                      <div className="admin-mobile-card-row">
                        <span>Gateway:</span>
                        <span className="admin-badge processing" style={{ textTransform: 'uppercase' }}>{d.gateway}</span>
                      </div>
                      <div className="admin-mobile-card-row">
                        <span>TX ID / UTR:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{d.transaction_id || '-'}</span>
                      </div>
                      <div className="admin-mobile-card-row">
                        <span>Timestamp:</span>
                        <span>{new Date(d.created_at).toLocaleString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: COUPONS */}
          {activeTab === 'coupons' && (
            <CouponsTab
              coupons={coupons}
              onAdd={(c) => setCoupons(cs => [c, ...cs])}
              onDelete={handleDeleteCoupon}
            />
          )}

          {/* TAB 9: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="admin-card-section">
              <div className="admin-card-header">
                <div className="admin-card-title">
                  <Tags size={18} color="#3874FF" />
                  <span>Product Categories ({categories.length})</span>
                </div>
                <div className="admin-card-actions">
                  <button 
                    type="button" 
                    className="admin-btn admin-btn-primary" 
                    onClick={handleAddCategory}
                  >
                    <Plus size={16} />
                    <span>Create Category</span>
                  </button>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="admin-table-responsive hide-on-mobile">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Category Name</th>
                      <th>Slug Identifier</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text)' }}>{c.name}</td>
                        <td>
                          <span style={{ fontSize: 12, padding: '3px 8px', background: 'var(--color-surface-2)', borderRadius: 6, fontFamily: 'monospace' }}>
                            {c.slug}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                          {new Date(c.created_at || Date.now()).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => handleEditCategory(c)}
                              title="Edit Category"
                            >
                              <Edit2 size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => handleDeleteCategory(c.id, c.name)}
                              title="Delete Category"
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                          No categories found. Click 'Create Category' to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch Cards */}
              <div className="admin-mobile-card-list">
                {categories.map(c => (
                  <div key={c.id} className="admin-mobile-card">
                    <div className="admin-mobile-card-header">
                      <div>
                        <div className="admin-mobile-card-title">{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{c.slug}</div>
                      </div>
                    </div>

                    <div className="admin-mobile-card-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        onClick={() => handleEditCategory(c)}
                      >
                        <Edit2 size={15} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                      >
                        <Trash2 size={15} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* USER DETAIL MODAL */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={(id, newBal) => {
            setUsers(us => us.map(u => u.id === id ? { ...u, balance: newBal } : u));
          }}
        />
      )}

      {/* EDIT PRODUCT META MODAL */}
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

      {/* CREATE NEW PRODUCT MODAL */}
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
