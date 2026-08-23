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
      { href: 'https://t.me/your_support_username', label: 'Telegram Channel', external: true },
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
      paddingTop: 64,
      paddingBottom: 32
    }}>
      <div className="container">
        <div className="footer__grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
          marginBottom: 48
        }}>
          
          {/* Brand Info */}
          <div style={{ maxWidth: 360 }}>
            <div style={{ marginBottom: 16 }}>
              <Logo size="large" />
            </div>
            <p style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
              margin: '0 0 24px 0'
            }}>
              Premium digital assets and software licenses marketplace. Instant automated credential dispatch, multi-method payment verification, and 24/7 client support.
            </p>

            {/* Payment Method Badges with Google Icons */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 10 }}>
                Accepted Payment Gateways
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* UPI */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                }}>
                  <span className="icon icon--sm icon--cyan">account_balance</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>UPI Auto QR</span>
                </div>
                {/* Crypto */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                }}>
                  <span className="icon icon--sm icon--accent">currency_bitcoin</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Crypto</span>
                </div>
                {/* Binance */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', background: 'var(--color-surface-2)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)'
                }}>
                  <span className="icon icon--sm" style={{ color: '#F0B90B' }}>account_balance_wallet</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Binance Pay</span>
                </div>
              </div>
            </div>

          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-text)',
                marginBottom: 16
              }}>
                {heading}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(item => (
                  <Link
                    key={item.label}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    style={{
                      fontSize: 14,
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-cyan)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  >
                    <span>{item.label}</span>
                    {item.external && <span className="icon icon--sm" style={{ fontSize: 14 }}>open_in_new</span>}
                  </Link>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Bottom Copyright Strip */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 24,
          borderTop: '1px solid var(--color-border)',
          fontSize: 13,
          color: 'var(--color-text-faint)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="icon icon--sm icon--cyan">verified_user</span>
            <span>&copy; {new Date().getFullYear()} QuantumXD Store. All rights reserved.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
              <span>Automated 24/7 System</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="icon icon--sm icon--accent">shield</span>
              <span>100% Encrypted</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
