'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import siteConfig from '../../config/siteConfig';
import { useCurrency, CURRENCIES } from '../../store/currencyStore';
import FlagIcon from '../ui/FlagIcon';

const PAYMENT_METHODS = [
  { name: 'UPI', src: '/payments/upi.svg' },
  { name: 'Google Pay', src: '/payments/gpay.svg' },
  { name: 'PhonePe', src: '/payments/phonepe.svg' },
  { name: 'Paytm', src: '/payments/paytm.svg' },
  { name: 'Binance Pay', src: '/payments/binance.svg' },
  { name: 'Tether USDT', src: '/payments/usdt.svg' },
  { name: 'Bitcoin', src: '/payments/bitcoin.svg' },
  { name: 'Ethereum', src: '/payments/ethereum.svg' },
  { name: 'RuPay', src: '/payments/rupay.svg' },
  { name: 'Visa', src: '/payments/visa.svg' },
  { name: 'Mastercard', src: '/payments/mastercard.svg' },
];

export default function Footer() {
  const pathname = usePathname();
  const { currency } = useCurrency();
  const currentCurrency = CURRENCIES[currency] || CURRENCIES.INR;

  // Hide footer on admin panel
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const links = siteConfig.footerLinks;

  return (
    <footer className="footer-masterpiece">
      <div className="container">
        

        {/* TIER 2: MAIN 4-COLUMN ARCHITECTURAL MATRIX */}
        <div className="footer-main-matrix">
          
          {/* Brand Column */}
          <div className="footer-col-brand">
            <div className="footer-matrix-logo">
              <Logo size="large" />
            </div>
            <p className="footer-matrix-desc">
              India&apos;s leading automated digital store for premium subscriptions, software licenses, and developer tools. Instant credentials delivered securely within seconds.
            </p>
            
            {/* Dynamic Selected Currency with SVG Flag */}
            <div className="footer-currency-tag" title={`Active Currency: ${currentCurrency.name} (${currentCurrency.code})`}>
              <span className="footer-currency-flag">
                <FlagIcon code={currentCurrency.code} size={18} />
              </span>
              <span className="footer-currency-label">
                <span className="footer-currency-prefix">Currency:</span>
                <strong className="footer-currency-code">{currentCurrency.code}</strong>
                <span className="footer-currency-symbol">({currentCurrency.symbol})</span>
                <span className="footer-currency-dot">&bull;</span>
                <span className="footer-currency-name">{currentCurrency.name}</span>
              </span>
            </div>
          </div>

          {/* Navigation Links Columns */}
          <div className="footer-col-nav-group">
            {Object.entries(links).map(([heading, items]) => (
              <div key={heading} className="footer-col-nav">
                <div className="footer-nav-title">{heading}</div>
                <ul className="footer-nav-items">
                  {items.map(item => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        className="footer-link"
                      >
                        <span>{item.label}</span>
                        {item.external && (
                          <span className="icon icon--sm footer-link-ext">
                            open_in_new
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* TIER 3: INTEGRATED 100% SECURE CHECKOUT SHOWCASE */}
        <div className="footer-checkout-tier">
          <div className="footer-checkout-header">
            <div className="footer-checkout-badge">
              <span className="icon icon--sm icon--accent" style={{ fontSize: 15 }}>lock</span>
              <span>100% SECURE AUTOMATED CHECKOUT</span>
            </div>
            <p className="footer-checkout-sub">
              Zero Processing Surcharges &bull; Automated Instant Verification &bull; UPI &bull; Binance Pay &bull; Crypto &bull; Cards
            </p>
          </div>

          {/* 11 Perfectly Uniform Cards */}
          <div className="footer-payment-tiles">
            {PAYMENT_METHODS.map((pm) => (
              <div key={pm.name} className="footer-payment-card" title={pm.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pm.src}
                  alt={pm.name}
                  className={`footer-payment-img ${pm.name === 'RuPay' ? 'footer-payment-img--rupay' : ''}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* TIER 4: ENHANCED SIGNATURE COLOPHON & UTILITIES */}
        <div className="footer-colophon">
          
          {/* Left: Copyright & Subline */}
          <div className="footer-colophon-left">
            <div className="footer-colophon-copy">
              &copy; {new Date().getFullYear()} <strong className="footer-colophon-brand">QuantumXD Store</strong>. All rights reserved.
            </div>
            <div className="footer-colophon-tagline">
              India&apos;s leading automated digital key &amp; license marketplace
            </div>
          </div>

          {/* Center: Legal Quick Links */}
          <div className="footer-colophon-center">
            <Link href="/terms" className="footer-colophon-link">Terms</Link>
            <span className="footer-colophon-dot">&bull;</span>
            <Link href="/privacy" className="footer-colophon-link">Privacy</Link>
            <span className="footer-colophon-dot">&bull;</span>
            <Link href="/refund-policy" className="footer-colophon-link">Refunds</Link>
            <span className="footer-colophon-dot">&bull;</span>
            <Link href="/faq" className="footer-colophon-link">FAQs</Link>
          </div>

          {/* Right: Operational Status + Back to Top */}
          <div className="footer-colophon-right">
            <div className="footer-status-pill-badge" title="All infrastructure systems running optimally">
              <span className="footer-live-pulse-dot" />
              <span>All Systems Operational</span>
              <span className="footer-uptime-stat">99.9%</span>
            </div>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="footer-back-to-top"
              title="Scroll to top of page"
              aria-label="Back to Top"
            >
              <span className="icon icon--sm" style={{ fontSize: 15 }}>arrow_upward</span>
              <span>Top</span>
            </button>
          </div>

        </div>

      </div>
    </footer>
  );
}
