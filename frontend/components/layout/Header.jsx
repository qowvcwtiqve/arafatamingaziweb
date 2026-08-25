'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import CartDrawer from '../cart/CartDrawer';
import Logo from './Logo';
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

            {/* 3. RIGHT: Cart, Auth & Theme */}
            <div className="header__right">
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
                <div className="header__user-dropdown-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link
                    href="/dashboard?tab=wallet"
                    className="badge badge--new"
                    style={{ gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}
                  >
                    <span className="icon icon--sm icon--filled" style={{ fontSize: 14 }}>account_balance_wallet</span>
                    <span>₹{parseFloat(user.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </Link>

                  <button 
                    className="header__user-btn btn btn--ghost btn--icon"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-label="User menu"
                  >
                    <span className="icon icon--md">person</span>
                  </button>

                  {userDropdownOpen && (
                    <div className="user-dropdown">
                      <div className="user-dropdown__header">
                        <span className="user-dropdown__name">{user.name}</span>
                        <span className="user-dropdown__email">{user.email}</span>
                      </div>
                      <div className="user-dropdown__body">
                        <Link href="/dashboard" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                          <span className="icon icon--sm">dashboard</span> Dashboard
                        </Link>
                        <Link href="/dashboard?tab=orders" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                          <span className="icon icon--sm">receipt_long</span> Order History
                        </Link>
                        <Link href="/dashboard?tab=wallet" className="user-dropdown__item" onClick={() => setUserDropdownOpen(false)}>
                          <span className="icon icon--sm icon--accent">account_balance_wallet</span> Wallet: ₹{parseFloat(user.balance || 0).toFixed(2)}
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
                  <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>₹{parseFloat(user.balance || 0).toFixed(2)}</div>
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
