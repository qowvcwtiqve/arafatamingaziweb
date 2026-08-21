'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import CartDrawer from '../cart/CartDrawer';

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { items, isOpen, openCart, closeCart } = useCartStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Explore' },
    { href: '/products?category=software', label: 'Software & OS' },
    { href: '/products?category=subscriptions', label: 'Subscriptions' },
    { href: '/products?category=developer', label: 'Developer Tools' },
    { href: '/products?category=gaming', label: 'Gaming' },
  ];

  const cartCount = mounted ? items.length : 0;

  return (
    <>
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header__inner">
            
            {/* 1. LEFT: Clean Typography Logo + Main Nav */}
            <div className="header__left">
              <Link href="/" className="header__logo">
                Quantum<span className="text-gradient">XD</span>
              </Link>

              <nav className="header__nav">
                {navLinks.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`header__nav-link ${pathname === l.href ? 'active' : ''}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* 2. CENTER: Search Bar */}
            <div className="header__center">
              <div className="search">
                <span className="search__icon icon icon--md">search</span>
                <input
                  className="search__input"
                  placeholder="Search products, licenses, tools..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                />
              </div>
            </div>

            {/* 3. RIGHT: Actions (Wallet + Cart + Auth) */}
            <div className="header__right">
              
              {/* Wallet Pill (if logged in) */}
              {mounted && user && (
                <Link
                  href="/dashboard"
                  className="header__wallet-pill"
                  title="Click to Top Up Wallet"
                >
                  <span className="icon icon--sm" style={{ color: 'var(--color-accent)' }}>account_balance_wallet</span>
                  <span className="header__wallet-amount">₹{(user.balance || 0).toFixed(2)}</span>
                  <span className="header__wallet-plus">+</span>
                </Link>
              )}

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

              {/* User / Auth */}
              {mounted && user ? (
                <div className="header__user-menu">
                  <Link href="/dashboard" className="btn btn--ghost btn--sm">
                    <span className="icon icon--sm">person</span>
                    <span>{user.name?.split(' ')[0] || 'Account'}</span>
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="btn btn--outline btn--sm">
                      <span className="icon icon--sm">admin_panel_settings</span>
                      <span>Admin</span>
                    </Link>
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

              {/* Mobile Menu Hamburger */}
              <button
                className="header__mobile-toggle"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation drawer"
              >
                <span className="icon icon--md">menu</span>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Slide-in Drawer with Backdrop */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
              
              {/* Drawer Header */}
              <div className="mobile-drawer__header">
                <Link href="/" className="header__logo" onClick={() => setMobileMenuOpen(false)}>
                  Quantum<span className="text-gradient">XD</span>
                </Link>
                <button
                  className="mobile-drawer__close"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <span className="icon icon--md">close</span>
                </button>
              </div>

              {/* Drawer User Info / Wallet */}
              {mounted && user ? (
                <div className="mobile-drawer__user-box">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>₹{(user.balance || 0).toFixed(2)}</div>
                  </div>
                  <button
                    className="btn btn--outline btn--sm btn--full"
                    onClick={() => { setMobileMenuOpen(false); setWalletModalOpen(true); }}
                  >
                    <span className="icon icon--sm">add</span>
                    Top Up Wallet Balance
                  </button>
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
                <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>search</span>
                <input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setMobileMenuOpen(false);
                      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                />
              </div>

              {/* Category Links */}
              <div className="mobile-drawer__section-label">CATEGORIES</div>
              <nav className="mobile-drawer__nav">
                {navLinks.map(l => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`mobile-drawer__link ${pathname === l.href ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{l.label}</span>
                    <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>chevron_right</span>
                  </Link>
                ))}
              </nav>

              {/* Extra links */}
              <div className="mobile-drawer__section-label" style={{ marginTop: 20 }}>ACCOUNT & SUPPORT</div>
              <nav className="mobile-drawer__nav">
                <Link href="/dashboard" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                  <span>My Orders & Downloads</span>
                  <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>download</span>
                </Link>
                {mounted && user?.role === 'admin' && (
                  <Link href="/admin" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                    <span>Admin Dashboard</span>
                    <span className="icon icon--sm" style={{ color: 'var(--color-primary-light)' }}>admin_panel_settings</span>
                  </Link>
                )}
                <Link href="/contact" className="mobile-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                  <span>Help & Support</span>
                  <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>help</span>
                </Link>
              </nav>

            </div>
          </div>
        )}
      </header>

      <CartDrawer open={isOpen} onClose={closeCart} />
    </>
  );
}
