import Link from 'next/link';

export default function Footer() {
  const links = {
    Store: [
      { href: '/products', label: 'All Products' },
      { href: '/products?featured=true', label: 'Featured' },
      { href: '/products?category=software', label: 'Software' },
      { href: '/products?category=tools', label: 'Tools' },
    ],
    Support: [
      { href: '/contact', label: 'Contact Us' },
      { href: 'https://t.me/your_support_username', label: 'Telegram Support', external: true },
      { href: 'mailto:digitalshoppei@gmail.com', label: 'Email Support' },
      { href: '/faq', label: 'FAQ' },
    ],
    Legal: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund', label: 'Refund Policy' },
    ],
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div>
            <div className="footer__brand-name">QuantumXD Store</div>
            <p className="footer__tagline">
              Premium digital products marketplace. Instant delivery, secure payments.
              Your digital needs, delivered instantly.
            </p>

            {/* Payment methods (SVG logos, no emojis) */}
            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-faint)', marginRight: 4 }}>We accept:</span>
              {/* UPI */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--color-surface-2)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                <span className="icon icon--sm" style={{ color: '#00A0E3' }}>account_balance</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>UPI</span>
              </div>
              {/* Crypto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--color-surface-2)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                <span className="icon icon--sm" style={{ color: '#F7931A' }}>currency_bitcoin</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>Crypto</span>
              </div>
              {/* Binance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--color-surface-2)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                <span className="icon icon--sm" style={{ color: '#F0B90B' }}>payments</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>Binance</span>
              </div>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <h3 className="footer__heading">{heading}</h3>
              <nav className="footer__links">
                {items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="footer__link"
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            &copy; {new Date().getFullYear()} QuantumXD Store. All rights reserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="icon icon--sm">lock</span>
              Secure Payments
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="icon icon--sm">download</span>
              Instant Delivery
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
