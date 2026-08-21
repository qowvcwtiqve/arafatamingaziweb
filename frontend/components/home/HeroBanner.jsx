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
      background: 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(110, 58, 255, 0.22) 0%, rgba(8, 11, 20, 0) 70%), var(--color-bg)'
    }}>
      {/* Background Animated Glow Elements */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlowMesh {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
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
          box-shadow: 0 16px 32px -10px rgba(110, 58, 255, 0.25);
        }
      `}} />

      <div style={{
        position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(110, 58, 255, 0.2) 0%, rgba(0, 212, 255, 0.08) 50%, transparent 70%)',
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
            background: 'rgba(110, 58, 255, 0.12)',
            border: '1px solid rgba(110, 58, 255, 0.35)',
            boxShadow: '0 0 20px rgba(110, 58, 255, 0.2)',
            marginBottom: 24,
            backdropFilter: 'blur(12px)'
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
              background: 'linear-gradient(135deg, #6E3AFF 0%, #00D4FF 50%, #00FFCC 100%)',
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
              padding: '6px 8px 6px 18px',
              boxShadow: '0 12px 32px -8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
              marginBottom: 36,
              transition: 'border-color 0.25s ease'
            }}
          >
            <span className="icon icon--md" style={{ color: 'var(--color-text-faint)', marginRight: 10 }}>search</span>
            <input
              type="text"
              placeholder="Search software, tools, accounts, licenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--color-text)',
                fontSize: 15,
                padding: '8px 0'
              }}
            />
            <button
              type="submit"
              className="btn btn--primary btn--sm"
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', gap: 6 }}
            >
              <span className="icon icon--sm">search</span>
              <span>Search</span>
            </button>
          </form>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 50 }}>
            <Link
              href="/products"
              className="btn btn--primary btn--lg"
              style={{ padding: '14px 28px', gap: 8, boxShadow: 'var(--shadow-glow)' }}
            >
              <span className="icon icon--md">storefront</span>
              <span>Browse All Products</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
            <Link
              href="/products?featured=true"
              className="btn btn--ghost btn--lg"
              style={{ padding: '14px 24px', gap: 8, border: '1px solid var(--color-border)' }}
            >
              <span className="icon icon--md icon--cyan">star</span>
              <span>Featured Picks</span>
            </Link>
          </div>

          {/* 4 Feature Highlights Grid (No emojis, Pure Google Font Icons) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            width: '100%',
            marginBottom: 44
          }}>
            {featureCards.map((feat) => (
              <div
                key={feat.title}
                className="hero-feature-card"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-primary-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 20,
            width: '100%',
            padding: '20px 24px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)'
          }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(110, 58, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan)',
                  flexShrink: 0
                }}>
                  <span className="icon icon--md">{s.icon}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>
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
