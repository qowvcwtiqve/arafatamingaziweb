'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useCurrency } from '../../store/currencyStore';
import CartDrawer from '../cart/CartDrawer';
import Logo from './Logo';
import CurrencySelector from './CurrencySelector';
import api from '../../lib/api';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Completely hide store header on the Admin Panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { items, isOpen, openCart, closeCart } = useCartStore();
  const { user, logout, refreshUser } = useAuthStore();
  const { format } = useCurrency();
  const [theme, setTheme] = useState('dark');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [categoryLinks, setCategoryLinks] = useState([]);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Always fetch fresh balance from server when user is active
    if (user?.id) {
      refreshUser();
      const onFocus = () => refreshUser();
      window.addEventListener('focus', onFocus);
    }
    
    const saved = localStorage.getItem('quantumxd-theme');
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    
    const handleClickOutside = (e) => {
      if (!e.target.closest('.header__user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    
    api.get('/products/categories')
      .then(({ data }) => {
        if (data.categories) {
          setCategoryLinks(data.categories.map(c => ({
            href: `/products?category=${c.id}`,
            label: c.name,
            icon: c.icon || 'category'
          })));
        }
      })
      .catch(console.error);
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [user?.id]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('quantumxd-theme', newTheme);
  };

  const primaryLinks = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/products', label: 'Store', icon: 'storefront' },
  ];

  const cartCount = mounted ? items.length : 0;

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header__inner">
            
            {/* 1. LEFT: Logo + Nav */}
            <div className="header__left">
              <Logo />

              <nav className="header__nav">
                {primaryLinks.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`header__nav-link ${pathname === l.href ? 'active' : ''}`}
                    style={{ gap: 6 }}
                  >
                    <span className="icon icon--sm icon--muted">{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                ))}

                {/* Categories Dropdown */}
                <div className="header__nav-dropdown-container">
                  <button className="header__nav-link header__nav-dropdown-trigger" style={{ gap: 4 }}>
                    <span className="icon icon--sm icon--muted">category</span>
                    <span>Categories</span>
                    <span className="icon icon--sm">expand_more</span>
                  </button>
                  <div className="header__nav-dropdown">
                    {categoryLinks.length > 0 ? (
                      categoryLinks.map(c => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className="header__nav-dropdown-item"
                        >
                          <span className="icon icon--sm icon--cyan">{c.icon}</span>
                          <span>{c.label}</span>
                        </Link>
                      ))
                    ) : (
                      <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-faint)' }}>
                        Loading categories...
                      </div>
                    )}
                  </div>
                </div>
              </nav>
            </div>

            {/* 2. CENTER: Search Bar */}
            <div className="header__center">
              <div className="search">
                <span className="icon icon--sm search__icon">search</span>
                <input
                  className="search__input"
                  style={{ paddingLeft: 44 }}
                  placeholder="Search products, licenses, tools..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                />
              </div>
            </div>

            {/* 3. RIGHT: Currency, Cart, Auth & Theme */}
            <div className="header__right">
              {/* Currency Selector */}
              <div className="header__currency-box">
                <CurrencySelector />
              </div>

              {/* Cart Button */}
              <button
                className="header__cart-btn"
                onClick={openCart}
                aria-label="Shopping Cart"
              >
                <span className="icon icon--md">shopping_cart</span>
                {cartCount > 0 && (
                  <span className="header__cart-count">{cartCount}</span>
                )}
              </button>

              {/* User Menu / Auth */}
              {mounted && user ? (
                <div className="header__user-dropdown-container" style={{ position: 'relative' }}>
                  <button 
                    className="header__user-btn btn btn--ghost btn--icon"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-label="User menu"
                  >
                    <span className="icon icon--md">person</span>
                  </button>

                  {userDropdownOpen && (
                    <>
                      {/* Desktop Dropdown */}
                      <div className="user-dropdown user-dropdown--desktop">
                        <div className="user-dropdown__header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #7C3AED 0%, #38BDF8 100%)',
                              color: '#FFFFFF', fontWeight: 800, fontSize: 13,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span className="user-dropdown__name">{user.name}</span>
                              <span className="user-dropdown__email">{user.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="user-dropdown__body">
                          <Link href="/dashboard" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                            <span className="icon icon--sm">dashboard</span> Dashboard
                          </Link>
                          <Link href="/dashboard?tab=orders" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                            <span className="icon icon--sm icon--cyan">receipt_long</span> Order History
                          </Link>
                          <Link href="/dashboard?tab=wallet" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                            <span className="icon icon--sm icon--accent">account_balance_wallet</span> Wallet: {format(user.balance || 0)}
                          </Link>
                          {user.role === 'admin' && (
                            <Link href="/admin" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                              <span className="icon icon--sm icon--primary">admin_panel_settings</span> Admin Panel
                            </Link>
                          )}
                        </div>
                        <div className="user-dropdown__footer">
                          <button onClick={() => { logout(); setUserDropdownOpen(false); }} className="user-dropdown__item user-dropdown__item--danger">
                            <span className="icon icon--sm">logout</span> Sign Out
                          </button>
                        </div>
                      </div>

                      {/* Mobile Bottom Sheet (Slide-Up Drawer from Bottom) */}
                      <div className="user-bottom-sheet-overlay" onClick={() => setUserDropdownOpen(false)}>
                        <div className="user-bottom-sheet" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Pull Bar Handle */}
                          <div className="user-bottom-sheet__handle-wrapper" onClick={() => setUserDropdownOpen(false)}>
                            <div className="user-bottom-sheet__handle" />
                          </div>

                          {/* Profile Header */}
                          <div className="user-bottom-sheet__user-card">
                            <div className="user-bottom-sheet__avatar">
                              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="user-bottom-sheet__user-info">
                              <div className="user-bottom-sheet__user-name-row">
                                <span className="user-bottom-sheet__user-name">{user.name}</span>
                                <span className={`user-bottom-sheet__role-badge ${user.role === 'admin' ? 'user-bottom-sheet__role-badge--admin' : ''}`}>
                                  {user.role === 'admin' ? 'Admin' : 'Member'}
                                </span>
                              </div>
                              <span className="user-bottom-sheet__user-email">{user.email}</span>
                            </div>
                            <button
                              className="user-bottom-sheet__close-btn"
                              onClick={() => setUserDropdownOpen(false)}
                              aria-label="Close"
                            >
                              <span className="icon icon--md">close</span>
                            </button>
                          </div>

                          {/* Wallet Quick Card */}
                          <div className="user-bottom-sheet__wallet-card">
                            <div className="user-bottom-sheet__wallet-left">
                              <span className="icon icon--md icon--accent" style={{ fontSize: 24 }}>account_balance_wallet</span>
                              <div>
                                <div className="user-bottom-sheet__wallet-label">Available Balance</div>
                                <div className="user-bottom-sheet__wallet-amount">{format(user.balance || 0)}</div>
                              </div>
                            </div>
                            <Link
                              href="/dashboard?tab=wallet"
                              className="btn btn--primary btn--sm"
                              onClick={() => setUserDropdownOpen(false)}
                              style={{ gap: 4, padding: '7px 16px', borderRadius: 'var(--radius-full)' }}
                            >
                              <span className="icon icon--sm">add</span>
                              <span>Top Up</span>
                            </Link>
                          </div>

                          {/* Menu Items List */}
                          <div className="user-bottom-sheet__nav-list">
                            <Link
                              href="/dashboard"
                              className="user-bottom-sheet__nav-item"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <div className="user-bottom-sheet__nav-item-left">
                                <div className="user-bottom-sheet__nav-icon-box">
                                  <span className="icon icon--md icon--primary">dashboard</span>
                                </div>
                                <div>
                                  <div className="user-bottom-sheet__nav-title">Dashboard Overview</div>
                                  <div className="user-bottom-sheet__nav-subtitle">Account stats & quick summary</div>
                                </div>
                              </div>
                              <span className="icon icon--sm icon--muted">chevron_right</span>
                            </Link>

                            <Link
                              href="/dashboard?tab=orders"
                              className="user-bottom-sheet__nav-item"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <div className="user-bottom-sheet__nav-item-left">
                                <div className="user-bottom-sheet__nav-icon-box">
                                  <span className="icon icon--md icon--cyan">receipt_long</span>
                                </div>
                                <div>
                                  <div className="user-bottom-sheet__nav-title">Order History &amp; Keys</div>
                                  <div className="user-bottom-sheet__nav-subtitle">View keys, files &amp; pre-order queue</div>
                                </div>
                              </div>
                              <span className="icon icon--sm icon--muted">chevron_right</span>
                            </Link>

                            <Link
                              href="/dashboard?tab=wallet"
                              className="user-bottom-sheet__nav-item"
                              onClick={() => setUserDropdownOpen(false)}
                            >
                              <div className="user-bottom-sheet__nav-item-left">
                                <div className="user-bottom-sheet__nav-icon-box">
                                  <span className="icon icon--md icon--accent">account_balance_wallet</span>
                                </div>
                                <div>
                                  <div className="user-bottom-sheet__nav-title">Wallet &amp; Transactions</div>
                                  <div className="user-bottom-sheet__nav-subtitle">Deposit via UPI, Binance &amp; Crypto</div>
                                </div>
                              </div>
                              <span className="icon icon--sm icon--muted">chevron_right</span>
                            </Link>

                            {user.role === 'admin' && (
                              <Link
                                href="/admin"
                                className="user-bottom-sheet__nav-item user-bottom-sheet__nav-item--admin"
                                onClick={() => setUserDropdownOpen(false)}
                              >
                                <div className="user-bottom-sheet__nav-item-left">
                                  <div className="user-bottom-sheet__nav-icon-box" style={{ background: 'rgba(124, 58, 237, 0.18)' }}>
                                    <span className="icon icon--md icon--primary">admin_panel_settings</span>
                                  </div>
                                  <div>
                                    <div className="user-bottom-sheet__nav-title" style={{ color: 'var(--color-primary-light)' }}>Admin Control Panel</div>
                                    <div className="user-bottom-sheet__nav-subtitle">Orders, stock pools, products &amp; users</div>
                                  </div>
                                </div>
                                <span className="icon icon--sm" style={{ color: 'var(--color-primary-light)' }}>chevron_right</span>
                              </Link>
                            )}
                          </div>

                          {/* Currency Switcher in Bottom Sheet */}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 6, letterSpacing: '0.05em' }}>
                              Currency
                            </div>
                            <CurrencySelector isMobile={true} />
                          </div>

                          {/* Logout Button */}
                          <div className="user-bottom-sheet__footer">
                            <button
                              onClick={() => { logout(); setUserDropdownOpen(false); }}
                              className="user-bottom-sheet__logout-btn"
                            >
                              <span className="icon icon--md">logout</span>
                              <span>Sign Out of Account</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="header__auth-btns">
                  <Link href="/login" className="btn btn--ghost btn--sm">
                    Sign In
                  </Link>
                  <Link href="/register" className="btn btn--primary btn--sm">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Theme Toggle */}
              {mounted && (
                <button
                  className="header__theme-toggle"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  <span className="icon icon--md">{theme === 'light' ? 'dark_mode' : 'light_mode'}</span>
                </button>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="header__mobile-toggle"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation drawer"
              >
                <span className="icon icon--lg">menu</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="mobile-drawer__header">
              <div onClick={() => setMobileMenuOpen(false)}>
                <Logo />
              </div>
              <button
                className="mobile-drawer__close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <span className="icon icon--lg">close</span>
              </button>
            </div>

            {/* User Info / Auth */}
            {mounted && user ? (
              <div className="mobile-drawer__user-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>{format(user.balance || 0)}</div>
                </div>
                <Link
                  href="/dashboard"
                  className="btn btn--outline btn--sm btn--full"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ gap: 6 }}
                >
                  <span className="icon icon--sm">add</span>
                  <span>Top Up Wallet Balance</span>
                </Link>
              </div>
            ) : (
              <div className="mobile-drawer__auth-box">
                <Link href="/login" className="btn btn--ghost btn--sm" style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/register" className="btn btn--primary btn--sm" style={{ flex: 1 }} onClick={() => setMobileMenuOpen(false)}>
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Currency Selector */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 6, letterSpacing: '0.05em' }}>
                Display Currency
              </div>
              <CurrencySelector isMobile={true} />
            </div>

            {/* Mobile Search */}
            <div className="mobile-drawer__search">
              <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)', marginRight: 8 }}>search</span>
              <input
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setMobileMenuOpen(false);
                    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </div>

            {/* Mobile Theme Toggle Pill */}
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={toggleTheme}
                className="btn btn--ghost btn--sm btn--full"
                style={{ justifyContent: 'space-between', padding: '10px 14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="icon icon--sm icon--cyan">{theme === 'light' ? 'light_mode' : 'dark_mode'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Theme Mode</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize', color: 'var(--color-cyan)' }}>
                  {theme === 'light' ? 'Light' : 'Dark'}
                </span>
              </button>
            </div>

            {/* Main Links */}
            <div className="mobile-drawer__section-label">MAIN NAVIGATION</div>
            <nav className="mobile-drawer__nav">
              <Link href="/" className={`mobile-drawer__link ${pathname === '/' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="icon icon--sm icon--cyan">home</span>
                  <span>Home</span>
                </div>
                <span className="icon icon--sm icon--muted">chevron_right</span>
              </Link>
              <Link href="/products" className={`mobile-drawer__link ${pathname === '/products' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="icon icon--sm icon--primary">storefront</span>
                  <span>Explore Store</span>
                </div>
                <span className="icon icon--sm icon--muted">chevron_right</span>
              </Link>
            </nav>

            {/* Category Links */}
            <div className="mobile-drawer__section-label" style={{ marginTop: 20 }}>CATEGORIES</div>
            <nav className="mobile-drawer__nav">
              {categoryLinks.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`mobile-drawer__link ${pathname === l.href ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="icon icon--sm icon--cyan">{l.icon}</span>
                    <span>{l.label}</span>
                  </div>
                  <span className="icon icon--sm icon--muted">chevron_right</span>
                </Link>
              ))}
            </nav>

            {/* Account & Support */}
            <div className="mobile-drawer__section-label" style={{ marginTop: 20 }}>ACCOUNT &amp; SUPPORT</div>
            <nav className="mobile-drawer__nav">
              <Link href="/dashboard" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="icon icon--sm">receipt_long</span>
                  <span>My Orders</span>
                </div>
                <span className="icon icon--sm icon--muted">chevron_right</span>
              </Link>
              {mounted && user?.role === 'admin' && (
                <Link href="/admin" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="icon icon--sm icon--primary">admin_panel_settings</span>
                    <span>Admin Dashboard</span>
                  </div>
                  <span className="icon icon--sm icon--muted">chevron_right</span>
                </Link>
              )}
              <Link href="/contact" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="icon icon--sm">help_center</span>
                  <span>Help &amp; Support</span>
                </div>
                <span className="icon icon--sm icon--muted">chevron_right</span>
              </Link>
              {mounted && user && (
                <button 
                  onClick={() => { logout(); setMobileMenuOpen(false); }} 
                  className="mobile-drawer__link" 
                  style={{ border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left', background: 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-error)' }}>
                    <span className="icon icon--sm">logout</span>
                    <span>Sign Out</span>
                  </div>
                </button>
              )}
            </nav>

          </div>
        </div>
      )}

      <CartDrawer open={isOpen} onClose={closeCart} />
    </>
  );
}
