'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

export default function Footer() {
  const pathname = usePathname();

  // Hide website footer completely on the admin panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const links = {
    Store: [
      { href: '/products', label: 'All Products' },
      { href: '/products?featured=true', label: 'Featured Top Picks' },
      { href: '/products?sort=newest', label: 'Latest Arrivals' },
      { href: '/products?sort=popular', label: 'Most Popular' },
    ],
    Support: [
      { href: '/contact', label: 'Contact Us' },
      { href: 'https://t.me/quantumxdservices', label: 'Telegram Channel', external: true },
      { href: 'mailto:support@quantumxd.store', label: 'Email Helpdesk' },
      { href: '/faq', label: 'Frequently Asked Questions' },
    ],
    Legal: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund', label: 'Refund & Warranty Policy' },
    ],
  };

  return (
    <footer className="footer" style={{
      borderTop: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      paddingTop: 48,
      paddingBottom: 28,
      position: 'relative'
    }}>
      <div className="container">
        
        {/* Top Header Row with Logo & Quick Help */}
        <div className="footer-top-row">
          <div>
            <Logo size="large" />
            <p style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              margin: '8px 0 0 0',
              maxWidth: 420
            }}>
              Instant automated delivery for premium digital software, subscriptions & licenses.
            </p>
          </div>
          <a
            href="https://t.me/quantumxdservices"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-support-pill"
          >
            <span className="icon icon--sm icon--cyan">support_agent</span>
            <span>24/7 Telegram Support</span>
            <span className="icon icon--sm">arrow_forward</span>
          </a>
        </div>

        {/* Main Columns Grid */}
        <div className="footer-main-grid">
          
          {/* Brand & Payment Gateways */}
          <div className="footer-brand-section">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 10 }}>
              Payment Methods
            </div>
            <div className="footer-payment-badges">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
              }}>
                <span className="icon icon--sm icon--cyan">account_balance</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>UPI Auto QR</span>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
              }}>
                <span className="icon icon--sm icon--accent">currency_bitcoin</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Crypto</span>
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
              }}>
                <span className="icon icon--sm" style={{ color: '#F0B90B' }}>account_balance_wallet</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Binance Pay</span>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <div className="footer-links-group-title">
                {heading}
              </div>
              <div className="footer-links-list">
                {items.map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    className="footer-link-item"
                  >
                    <span>{item.label}</span>
                    {item.external && <span className="icon icon--sm" style={{ fontSize: 11, color: 'var(--color-cyan)' }}>open_in_new</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Bottom Copyright Strip */}
        <div className="footer-legal-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="icon icon--sm icon--cyan">verified_user</span>
            <span>&copy; {new Date().getFullYear()} QuantumXD Store. All rights reserved.</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
              <span>Automated 24/7 Delivery</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="icon icon--sm icon--accent">shield</span>
              <span>100% Encrypted</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
