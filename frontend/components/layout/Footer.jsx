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
        
        {/* TIER 1: VIP COMMUNITY & CONCIERGE COMMAND STRIP */}
        <div className="footer-vip-strip">
          <div className="footer-vip-copy">
            <div className="footer-vip-badge">
              <span className="footer-vip-pulse" />
              <span>LIVE COMMUNITY &amp; SUPPORT</span>
            </div>
            <h3 className="footer-vip-heading">
              Need Instant Help or Custom Orders?
            </h3>
            <p className="footer-vip-sub">
              Connect with our team on Telegram for 24/7 priority customer support, flash deals, and restock notifications.
            </p>
            <div className="footer-vip-perks">
              <span className="footer-vip-perk">
                <span className="icon icon--sm icon--cyan" style={{ fontSize: 13 }}>bolt</span>
                <span>&lt;5m Fast Reply</span>
              </span>
              <span className="footer-vip-perk">
                <span className="icon icon--sm icon--accent" style={{ fontSize: 13 }}>support_agent</span>
                <span>24/7 Human Help</span>
              </span>
              <span className="footer-vip-perk">
                <span className="icon icon--sm" style={{ color: '#F59E0B', fontSize: 13 }}>local_offer</span>
                <span>Exclusive Deals</span>
              </span>
            </div>
          </div>

          <div className="footer-vip-action">
            <a
              href={siteConfig.socials.telegramSupport || 'https://t.me/quantumxdservices'}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-tg-vip-btn"
              title="Connect with Telegram VIP Helpdesk"
            >
              <div className="footer-tg-vip-left">
                <div className="footer-tg-vip-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="url(#tgGradVIP)"/>
                    <path d="M17.5 7.2L5.8 11.7C5 12 5 12.5 5.7 12.7L8.7 13.6L15.6 9.3C15.9 9.1 16.2 9.2 16 9.4L10.4 14.5L10.2 17.5C10.5 17.5 10.7 17.4 10.9 17.2L12.3 15.8L15.2 17.9C15.7 18.2 16.1 18 16.2 17.4L18.1 8.5C18.3 7.7 17.8 7.3 17.5 7.2Z" fill="white"/>
                    <defs>
                      <linearGradient id="tgGradVIP" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2AABEE"/>
                        <stop offset="1" stopColor="#229ED9"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="footer-tg-vip-text">
                  <span className="footer-tg-vip-title">
                    <span className="footer-hide-mobile">Official </span>Telegram Helpdesk
                  </span>
                  <span className="footer-tg-vip-subtitle">
                    <span className="footer-live-pulse-dot" />
                    <span>24/7 Live Support<span className="footer-hide-mobile"> &bull; Instant Reply</span></span>
                  </span>
                </div>
              </div>
              <div className="footer-tg-vip-cta">
                <span>Chat Now</span>
                <span className="icon icon--sm" style={{ fontSize: 13, fontWeight: 800 }}>north_east</span>
              </div>
            </a>
          </div>
        </div>

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
