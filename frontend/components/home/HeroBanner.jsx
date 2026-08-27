'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TRENDING_TAGS = [
  { label: 'Steam Keys', query: 'Steam', icon: 'sports_esports' },
  { label: 'ChatGPT Plus', query: 'ChatGPT', icon: 'psychology' },
  { label: 'PlayStation', query: 'PlayStation', icon: 'gamepad' },
  { label: 'Netflix & OTT', query: 'Netflix', icon: 'smart_display' },
  { label: 'Spotify', query: 'Spotify', icon: 'headphones' },
  { label: 'Canva Pro', query: 'Canva', icon: 'palette' },
  { label: 'Fast VPN', query: 'VPN', icon: 'vpn_lock' },
];

const FEATURE_CARDS = [
  {
    icon: 'bolt',
    accentColor: '#3874FF',
    bgLight: 'rgba(56, 116, 255, 0.12)',
    title: 'Instant Auto-Dispatch',
    description: 'Credentials and licenses delivered immediately upon automated verification.'
  },
  {
    icon: 'verified_user',
    accentColor: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.12)',
    title: '100% Genuine & Tested',
    description: 'Every key, subscription, and account is verified functional before delivery.'
  },
  {
    icon: 'account_balance_wallet',
    accentColor: '#8B5CF6',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    title: 'Multi-Payment & Wallet',
    description: '1-click checkout via UPI QR, Binance Pay, Crypto, and Store Balance.'
  },
  {
    icon: 'support_agent',
    accentColor: '#F59E0B',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    title: '24/7 Priority Support',
    description: 'Direct human assistance and replacement support available round-the-clock.'
  }
];

const STATS = [
  { value: '500+', label: 'Digital Products', icon: 'inventory_2' },
  { value: '15,000+', label: 'Orders Delivered', icon: 'shopping_bag' },
  { value: '99.9%', label: 'Positive Rating', icon: 'thumb_up' },
  { value: '< 10s', label: 'Average Delivery', icon: 'speed' }
];

export default function HeroBanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleTagClick = (query) => {
    setSearchQuery(query);
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <section className="hero-banner-section">
      {/* Dynamic Background Mesh & Atmospheric Lighting */}
      <div className="hero-mesh-grid" aria-hidden="true" />
      <div className="hero-ambient-glow hero-ambient-glow--primary" aria-hidden="true" />
      <div className="hero-ambient-glow hero-ambient-glow--cyan" aria-hidden="true" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-content-wrapper">

          {/* 1. Live Verified Badge */}
          <div className="hero-verified-badge">
            <span className="hero-live-dot" />
            <span className="icon icon--sm icon--cyan icon--filled">verified</span>
            <span className="hero-verified-badge__text">
              Verified Digital Marketplace
            </span>
          </div>

          {/* 2. Main Title */}
          <h1 className="hero-main-title">
            Instant Delivery for Premium <br className="hero-title-break" />
            <span className="hero-title-gradient">
              Digital Products &amp; Software
            </span>
          </h1>

          {/* 3. Subtitle */}
          <p className="hero-main-subtitle">
            Get genuine software licenses, developer tools, subscriptions, and accounts
            dispatched automatically within seconds of payment verification.
          </p>

          {/* 4. Glassmorphism Search Bar */}
          <div className="hero-search-wrapper">
            <form onSubmit={handleSearchSubmit} className="hero-search-form">
              <span className="icon icon--md hero-search-icon">search</span>
              <input
                type="text"
                placeholder="Search software, keys, accounts, subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
                aria-label="Search digital products"
              />
              <button type="submit" className="hero-search-btn">
                <span className="icon icon--sm">search</span>
                <span className="hero-search-btn__label">Search</span>
              </button>
            </form>

            {/* Trending Quick Search Chips */}
            <div className="hero-trending-row">
              <span className="hero-trending-label">
                <span className="icon icon--sm icon--filled" style={{ fontSize: 13, color: '#F59E0B' }}>local_fire_department</span>
                Trending:
              </span>
              <div className="hero-trending-chips">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleTagClick(tag.query)}
                    className="hero-trend-chip"
                  >
                    <span className="icon hero-trend-chip__icon">{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Primary Action Buttons */}
          <div className="hero-cta-group">
            <Link href="/products" className="btn btn--primary hero-btn-primary">
              <span className="icon icon--md">storefront</span>
              <span>Browse All Products</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
            <Link href="/products?featured=true" className="btn btn--ghost hero-btn-secondary">
              <span className="icon icon--sm icon--cyan icon--filled">star</span>
              <span>Featured Picks</span>
            </Link>
          </div>

          {/* 6. 4 Value Highlights Grid */}
          <div className="hero-features-grid">
            {FEATURE_CARDS.map((feat) => (
              <div key={feat.title} className="hero-feature-card">
                <div
                  className="hero-feature-icon-box"
                  style={{
                    color: feat.accentColor,
                    background: feat.bgLight,
                    borderColor: `${feat.accentColor}33`
                  }}
                >
                  <span className="icon icon--md">{feat.icon}</span>
                </div>
                <div className="hero-feature-text">
                  <h3 className="hero-feature-title">{feat.title}</h3>
                  <p className="hero-feature-desc">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 7. Frosted Glass Stats Strip */}
          <div className="hero-stats-bar">
            {STATS.map((s, idx) => (
              <div key={s.label} className="hero-stat-item">
                <div className="hero-stat-item__icon-box">
                  <span className="icon icon--sm icon--cyan">{s.icon}</span>
                </div>
                <div className="hero-stat-item__details">
                  <div className="hero-stat-item__value">{s.value}</div>
                  <div className="hero-stat-item__label">{s.label}</div>
                </div>
                {idx < STATS.length - 1 && <div className="hero-stat-divider" aria-hidden="true" />}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
