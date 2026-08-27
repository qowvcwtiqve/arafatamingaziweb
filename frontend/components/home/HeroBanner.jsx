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
      title: 'Instant Automated Dispatch',
      description: 'Credentials and licenses delivered immediately upon payment verification.'
    },
    {
      icon: 'verified_user',
      colorClass: 'icon--primary',
      title: '100% Verified Products',
      description: 'Every product, account, and license key is pre-tested and genuine.'
    },
    {
      icon: 'shield',
      colorClass: 'icon--accent',
      title: 'Secure Multi-Payment',
      description: 'Instant auto-checkout via UPI QR, Binance Pay, and Cryptocurrencies.'
    },
    {
      icon: 'support_agent',
      colorClass: 'icon--cyan',
      title: '24/7 Dedicated Support',
      description: 'Round-the-clock customer assistance available via Telegram and email.'
    }
  ];

  const stats = [
    { value: '500+', label: 'Digital Products', icon: 'inventory_2' },
    { value: '12,000+', label: 'Orders Completed', icon: 'shopping_bag' },
    { value: '99.8%', label: 'Positive Rating', icon: 'thumb_up' },
    { value: '< 5 Sec', label: 'Average Delivery Time', icon: 'speed' }
  ];

  return (
    <section className="hero-banner" style={{
      position: 'relative',
      padding: '130px 0 70px',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(27, 78, 245, 0.18) 0%, transparent 70%), var(--color-bg)'
    }}>
      {/* Background Animated Glow Elements */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlowMesh {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.65; }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .hero-feature-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hero-feature-card:hover {
          transform: translateY(-5px);
          border-color: var(--color-border-glow) !important;
          box-shadow: 0 16px 32px -10px rgba(27, 78, 245, 0.35);
        }
      `}} />

      <div style={{
        position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(27, 78, 245, 0.20) 0%, rgba(56, 116, 255, 0.08) 50%, transparent 70%)',
        filter: 'blur(70px)', pointerEvents: 'none',
        animation: 'pulseGlowMesh 8s ease-in-out infinite'
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 900,
          margin: '0 auto'
        }}>

          {/* Top Pill Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 18px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            marginBottom: 24,
          }}>
            <span className="icon icon--sm icon--cyan icon--filled">verified</span>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--color-text)'
            }}>
              Verified Digital Marketplace
            </span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
            fontSize: 'clamp(34px, 5.5vw, 60px)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
            color: 'var(--color-text)'
          }}>
            Instant Delivery for Premium <br />
            <span style={{
              background: 'linear-gradient(135deg, #3874FF 0%, #1B4EF5 50%, #60A5FA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Digital Products &amp; Software
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: 'var(--color-text-muted)',
            lineHeight: 1.65,
            maxWidth: 720,
            margin: '0 0 32px 0'
          }}>
            Get genuine software licenses, developer tools, subscriptions, and accounts
            dispatched automatically within seconds of payment verification.
          </p>

          {/* Integrated Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              width: '100%',
              maxWidth: 580,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '6px 8px 6px 16px',
              boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
              marginBottom: 32,
              transition: 'border-color 0.25s ease'
            }}
          >
            <span className="icon icon--md" style={{ color: 'var(--color-text-faint)', marginRight: 8 }}>search</span>
            <input
              type="text"
              placeholder="Search software, accounts, licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: 14,
                padding: '8px 0'
              }}
            />
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              style={{ padding: '9px 16px', borderRadius: 'var(--radius-md)', gap: 6, flexShrink: 0 }}
            >
              <span className="icon icon--sm">search</span>
              <span>Search</span>
            </button>
          </form>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 44 }}>
            <Link
              href="/products"
              className="btn btn--primary btn--lg"
              style={{ padding: '12px 24px', gap: 8, boxShadow: 'var(--shadow-glow)' }}
            >
              <span className="icon icon--md">storefront</span>
              <span>Browse All Products</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
            <Link
              href="/products?featured=true"
              className="btn btn--ghost btn--lg"
              style={{ padding: '12px 20px', gap: 8, border: '1px solid var(--color-border)' }}
            >
              <span className="icon icon--md icon--cyan">star</span>
              <span>Featured Picks</span>
            </Link>
          </div>

          {/* 4 Feature Highlights Grid (Responsive 2x2 on mobile) */}
          <div className="hero-features-grid">
            {featureCards.map((feat) => (
              <div
                key={feat.title}
                className="hero-feature-card"
              >
                <div className="hero-feature-icon-box">
                  <span className={`icon icon--lg ${feat.colorClass}`}>{feat.icon}</span>
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  margin: 0
                }}>
                  {feat.title}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  margin: 0
                }}>
                  {feat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="hero-stats-bar">
            {stats.map((s) => (
              <div key={s.label} className="hero-stat-item">
                <div className="hero-stat-item__icon">
                  <span className="icon icon--md">{s.icon}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="hero-stat-item__value">
                    {s.value}
                  </div>
                  <div className="hero-stat-item__label">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
