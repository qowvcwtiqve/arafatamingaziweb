'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HeroBanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const featureCards = [
    {
      icon: 'bolt',
      colorClass: 'icon--cyan',
      iconBg: 'rgba(56, 116, 255, 0.12)',
      accentColor: '#3874FF',
      badge: '< 60s Delivery',
      title: 'Instant Dispatch',
      description: 'Automated digital keys & credentials delivered immediately upon payment verification.'
    },
    {
      icon: 'verified_user',
      colorClass: 'icon--accent',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      accentColor: '#10B981',
      badge: '100% Tested',
      title: 'Official Licenses',
      description: 'Every product, account & license is pre-tested, genuine, and backed by full warranty.'
    },
    {
      icon: 'shield',
      colorClass: 'icon--primary',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      accentColor: '#8B5CF6',
      badge: 'Zero Surcharge',
      title: 'Secure Multi-Payment',
      description: 'Instant auto-checkout via UPI QR, Binance Pay, Crypto & major Credit Cards.'
    },
    {
      icon: 'support_agent',
      colorClass: 'icon--warning',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      accentColor: '#F59E0B',
      badge: '24/7 Human',
      title: 'Priority Assistance',
      description: 'Round-the-clock dedicated customer assistance on Telegram and Email Helpdesk.'
    }
  ];

  const stats = [
    { value: '500+', label: 'Active Products', icon: 'inventory_2', color: '#3874FF' },
    { value: '15,000+', label: 'Orders Fulfilled', icon: 'shopping_bag', color: '#10B981' },
    { value: '99.9%', label: 'Positive Rating', icon: 'thumb_up', color: '#8B5CF6' },
    { value: '< 10s', label: 'Average Dispatch', icon: 'speed', color: '#F59E0B' }
  ];

  return (
    <section className="hero-banner-custom">
      {/* Ambient background glows */}
      <div className="hero-custom-glow hero-custom-glow--top" aria-hidden="true" />
      <div className="hero-custom-glow hero-custom-glow--bottom" aria-hidden="true" />
      <div className="hero-custom-mesh" aria-hidden="true" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-custom-wrapper">

          {/* 1. Top Verified Badge */}
          <div className="hero-custom-badge">
            <span className="hero-custom-dot" />
            <span className="icon icon--sm icon--cyan icon--filled" style={{ fontSize: 14 }}>verified</span>
            <span className="hero-custom-badge__text">
              Verified Digital Marketplace
            </span>
          </div>

          {/* 2. Main Headline */}
          <h1 className="hero-custom-title">
            Instant Delivery for Premium <br className="hero-custom-title-break" />
            <span className="hero-custom-gradient">
              Digital Products &amp; Software
            </span>
          </h1>

          {/* 3. Subtitle */}
          <p className="hero-custom-subtitle">
            Get genuine software licenses, developer tools, subscriptions, and accounts
            dispatched automatically within seconds of payment verification.
          </p>

          {/* 4. Unified Seamless Pill Search Box */}
          <form onSubmit={handleSearchSubmit} className="hero-custom-search-form">
            <span className="icon hero-custom-search-icon">search</span>
            <input
              type="text"
              placeholder="Search software, accounts, licenses, games..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hero-custom-search-input"
              aria-label="Search digital products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hero-custom-search-clear"
                aria-label="Clear search"
              >
                <span className="icon icon--sm">close</span>
              </button>
            )}
            <button type="submit" className="hero-custom-search-btn" aria-label="Search">
              <span className="icon hero-custom-search-btn-icon">search</span>
              <span className="hero-custom-search-btn-text">Search</span>
            </button>
          </form>

          {/* 5. CTA Action Buttons */}
          <div className="hero-custom-actions">
            <Link
              href="/products"
              className="btn btn--primary hero-custom-btn-primary"
            >
              <span className="icon icon--md icon--filled">storefront</span>
              <span>Browse All Products</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
            <Link
              href="/products?featured=true"
              className="btn btn--ghost hero-custom-btn-secondary"
            >
              <span className="icon icon--sm icon--cyan icon--filled">star</span>
              <span>Featured Picks</span>
            </Link>
          </div>

          {/* 6. 4 Value Highlight Cards (4-col on PC, 2x2 on Mobile) */}
          <div className="hero-custom-features-grid">
            {featureCards.map((feat) => (
              <div
                key={feat.title}
                className="hero-custom-feature-card"
                style={{ '--card-accent': feat.accentColor }}
              >
                <div className="hero-custom-feature-top">
                  <div
                    className="hero-custom-feature-icon"
                    style={{ background: feat.iconBg }}
                  >
                    <span className={`icon icon--md ${feat.colorClass}`}>{feat.icon}</span>
                  </div>
                  <span className="hero-custom-feature-badge">
                    {feat.badge}
                  </span>
                </div>
                <div className="hero-custom-feature-body">
                  <h3 className="hero-custom-feature-title">{feat.title}</h3>
                  <p className="hero-custom-feature-desc">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 7. Stats Bar Strip */}
          <div className="hero-custom-stats-bar">
            {stats.map((s, idx) => (
              <div key={s.label} className="hero-custom-stat-item">
                <div
                  className="hero-custom-stat-icon"
                  style={{ background: `${s.color}15`, color: s.color }}
                >
                  <span className="icon icon--sm">{s.icon}</span>
                </div>
                <div className="hero-custom-stat-info">
                  <div className="hero-custom-stat-value">{s.value}</div>
                  <div className="hero-custom-stat-label">{s.label}</div>
                </div>
                {idx < stats.length - 1 && <div className="hero-custom-stat-divider" aria-hidden="true" />}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
