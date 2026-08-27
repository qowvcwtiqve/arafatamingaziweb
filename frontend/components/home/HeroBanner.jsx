'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const POPULAR_TAGS = [
  { label: 'Steam Keys', query: 'Steam', icon: 'sports_esports' },
  { label: 'ChatGPT Plus', query: 'ChatGPT', icon: 'psychology' },
  { label: 'PlayStation', query: 'PlayStation', icon: 'gamepad' },
  { label: 'OTT & Netflix', query: 'Netflix', icon: 'smart_display' },
  { label: 'Spotify Premium', query: 'Spotify', icon: 'headphones' },
  { label: 'Canva Pro', query: 'Canva', icon: 'palette' },
  { label: 'Fast VPN', query: 'VPN', icon: 'vpn_lock' },
];

const SHOWCASE_CARDS = [
  {
    id: 'steam',
    badge: 'HOT GAMING',
    badgeColor: '#F59E0B',
    title: 'Steam Keys & Wallet Codes',
    subtitle: 'Global & India Region Keys',
    price: 'From ₹99',
    icon: 'sports_esports',
    gradient: 'linear-gradient(135deg, rgba(27, 78, 245, 0.25) 0%, rgba(56, 116, 255, 0.1) 100%)',
    border: 'rgba(56, 116, 255, 0.35)',
    delivery: 'Instant Auto-Dispatch'
  },
  {
    id: 'ai',
    badge: 'TRENDING AI',
    badgeColor: '#10B981',
    title: 'ChatGPT Plus & Claude Pro',
    subtitle: '1-Month / Private Access',
    price: 'From ₹299',
    icon: 'psychology',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
    border: 'rgba(16, 185, 129, 0.35)',
    delivery: 'Instant Activation'
  },
  {
    id: 'ott',
    badge: 'BESTSELLER',
    badgeColor: '#8B5CF6',
    title: 'Netflix 4K & Prime Video',
    subtitle: 'Ultra HD Private Profiles',
    price: 'From ₹149',
    icon: 'smart_display',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)',
    border: 'rgba(139, 92, 246, 0.35)',
    delivery: 'Instant Delivery'
  }
];

export default function HeroBanner() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCard, setActiveCard] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCard(prev => (prev + 1) % SHOWCASE_CARDS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

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
    <section className="hero-nextgen">
      {/* Ambient background glows */}
      <div className="hero-glow-blob hero-glow-blob--primary" aria-hidden="true" />
      <div className="hero-glow-blob hero-glow-blob--secondary" aria-hidden="true" />
      <div className="hero-grid-pattern" aria-hidden="true" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-split-grid">
          
          {/* LEFT COLUMN: Main Pitch & Search */}
          <div className="hero-left-content">
            
            {/* Top Live Pill */}
            <div className="hero-live-pill">
              <span className="hero-pulse-dot" />
              <span className="hero-live-pill__tag">24/7 AUTOMATED DISPATCH</span>
              <span className="hero-live-pill__sep">•</span>
              <span className="hero-live-pill__sub">15,000+ Orders Delivered</span>
            </div>

            {/* Headline */}
            <h1 className="hero-h1">
              Next-Gen Digital <br className="hero-h1-break" />
              <span className="hero-h1-gradient">Marketplace &amp; Licenses</span>
            </h1>

            {/* Value Subtitle */}
            <p className="hero-desc">
              Get genuine software licenses, gaming keys, OTT passes, and AI tools
              dispatched automatically within seconds of payment verification.
            </p>

            {/* Modern Search Box */}
            <form onSubmit={handleSearchSubmit} className="hero-search-box">
              <span className="icon hero-search-box__icon">search</span>
              <input
                type="text"
                placeholder="Search Steam, ChatGPT, Netflix, Windows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-box__input"
              />
              <button type="submit" className="hero-search-box__btn">
                <span className="icon icon--sm">bolt</span>
                <span>Search</span>
              </button>
            </form>

            {/* Horizontal Trending Chips */}
            <div className="hero-tags-container">
              <span className="hero-tags-label">
                <span className="icon" style={{ fontSize: 13, color: '#F59E0B' }}>local_fire_department</span>
                Hot:
              </span>
              <div className="hero-tags-scroll">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleTagClick(tag.query)}
                    className="hero-tag-btn"
                  >
                    <span className="icon hero-tag-btn__icon">{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="hero-buttons-row">
              <Link href="/products" className="btn btn--primary hero-btn-main">
                <span className="icon icon--md icon--filled">storefront</span>
                <span>Explore Catalog</span>
                <span className="icon icon--sm">arrow_forward</span>
              </Link>
              <Link href="/products?featured=true" className="btn btn--ghost hero-btn-sub">
                <span className="icon icon--sm icon--cyan icon--filled">star</span>
                <span>Featured Deals</span>
              </Link>
            </div>

            {/* 4 Mini Trust Badges */}
            <div className="hero-trust-bar">
              <div className="hero-trust-badge">
                <span className="icon icon--sm" style={{ color: '#3874FF' }}>bolt</span>
                <span>Instant &lt;10s</span>
              </div>
              <div className="hero-trust-badge">
                <span className="icon icon--sm" style={{ color: '#10B981' }}>verified</span>
                <span>100% Tested</span>
              </div>
              <div className="hero-trust-badge">
                <span className="icon icon--sm" style={{ color: '#8B5CF6' }}>qr_code_2</span>
                <span>UPI QR &amp; Crypto</span>
              </div>
              <div className="hero-trust-badge">
                <span className="icon icon--sm" style={{ color: '#F59E0B' }}>support_agent</span>
                <span>24/7 Support</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Hot Deals Vault Card */}
          <div className="hero-right-showcase">
            <div className="hero-showcase-card">
              
              {/* Showcase Card Header */}
              <div className="hero-showcase-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="hero-pulse-dot" style={{ background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
                    LIVE SPOTLIGHT DEALS
                  </span>
                </div>
                <div className="hero-showcase-dots">
                  {SHOWCASE_CARDS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveCard(i)}
                      className={`hero-dot-btn ${activeCard === i ? 'is-active' : ''}`}
                      aria-label={`Showcase item ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Item Featured Showcase */}
              {SHOWCASE_CARDS.map((item, idx) => (
                <div
                  key={item.id}
                  className={`hero-card-slide ${activeCard === idx ? 'is-visible' : ''}`}
                  style={{
                    background: item.gradient,
                    borderColor: item.border
                  }}
                >
                  <div className="hero-card-slide__top">
                    <span className="hero-card-slide__badge" style={{ color: item.badgeColor, background: `${item.badgeColor}22` }}>
                      {item.badge}
                    </span>
                    <span className="hero-card-slide__delivery">
                      <span className="icon icon--sm icon--filled">bolt</span>
                      {item.delivery}
                    </span>
                  </div>

                  <div className="hero-card-slide__main">
                    <div className="hero-card-slide__icon-box" style={{ color: item.badgeColor }}>
                      <span className="icon icon--lg">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="hero-card-slide__title">{item.title}</h3>
                      <p className="hero-card-slide__sub">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="hero-card-slide__bottom">
                    <div className="hero-card-slide__price-box">
                      <span className="hero-card-slide__price-label">Starting Price</span>
                      <span className="hero-card-slide__price">{item.price}</span>
                    </div>
                    <Link
                      href={`/products?search=${encodeURIComponent(item.id === 'steam' ? 'Steam' : item.id === 'ai' ? 'ChatGPT' : 'Netflix')}`}
                      className="btn btn--primary btn--sm hero-card-slide__action"
                    >
                      <span>Buy Now</span>
                      <span className="icon icon--sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}

              {/* Mini Highlights Grid at Bottom of Card */}
              <div className="hero-showcase-metrics">
                <div className="hero-metric-cell">
                  <div className="hero-metric-val">15,000+</div>
                  <div className="hero-metric-sub">Orders Completed</div>
                </div>
                <div className="hero-metric-divider" />
                <div className="hero-metric-cell">
                  <div className="hero-metric-val">99.9%</div>
                  <div className="hero-metric-sub">Positive Reviews</div>
                </div>
                <div className="hero-metric-divider" />
                <div className="hero-metric-cell">
                  <div className="hero-metric-val">&lt; 10s</div>
                  <div className="hero-metric-sub">Auto-Delivery</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
