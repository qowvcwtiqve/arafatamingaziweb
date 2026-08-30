'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import ProductCard from '../components/product/ProductCard';
import HeroBanner from '../components/home/HeroBanner';
import LiveTicker from '../components/home/LiveTicker';
import LiveSalesNotification from '../components/home/LiveSalesNotification';
import CategoryShowcase from '../components/home/CategoryShowcase';
import HowItWorksSection from '../components/home/HowItWorksSection';
import HomeFaqSection from '../components/home/HomeFaqSection';
import TelegramCommunityBanner from '../components/home/TelegramCommunityBanner';

function getCategoryVisual(name = '', id = '') {
  const lower = (name + ' ' + id).toLowerCase();
  if (lower.includes('ps5') || lower.includes('game') || lower.includes('gaming') || lower.includes('playstation') || lower.includes('xbox')) {
    return { icon: 'sports_esports', color: '#A78BFA', bg: 'rgba(139, 92, 246, 0.15)', label: 'Keys & Accounts' };
  }
  if (lower.includes('stream') || lower.includes('netflix') || lower.includes('prime') || lower.includes('spotify') || lower.includes('music') || lower.includes('ott')) {
    return { icon: 'smart_display', color: '#F472B6', bg: 'rgba(236, 72, 153, 0.15)', label: 'Subscriptions' };
  }
  if (lower.includes('vpn') || lower.includes('proxy') || lower.includes('shield') || lower.includes('security')) {
    return { icon: 'vpn_lock', color: '#22D3EE', bg: 'rgba(6, 182, 212, 0.15)', label: 'Fast & Secure' };
  }
  if (lower.includes('ai') || lower.includes('chatgpt') || lower.includes('bot') || lower.includes('claude') || lower.includes('midjourney')) {
    return { icon: 'psychology', color: '#00FFCC', bg: 'rgba(0, 255, 204, 0.15)', label: 'AI Subscriptions' };
  }
  if (lower.includes('edu') || lower.includes('tool') || lower.includes('software') || lower.includes('canva') || lower.includes('adobe') || lower.includes('course')) {
    return { icon: 'school', color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.15)', label: 'Pro & Student' };
  }
  if (lower.includes('free') || lower.includes('freebie') || lower.includes('gift') || lower.includes('giveaway')) {
    return { icon: 'card_giftcard', color: '#34D399', bg: 'rgba(16, 185, 129, 0.15)', label: 'Claim Free' };
  }
  if (lower.includes('paid') || lower.includes('legal') || lower.includes('service') || lower.includes('license') || lower.includes('official')) {
    return { icon: 'verified_user', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.15)', label: 'Official Access' };
  }
  return { icon: 'category', color: 'var(--color-cyan)', bg: 'var(--gradient-primary-soft)', label: 'Instant Delivery' };
}

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products?featured=true&limit=8'),
      api.get('/products?sort=newest&limit=8'),
      api.get('/products/categories')
    ]).then(([feat, lat, cats]) => {
      setFeatured(feat.data.products || []);
      setLatest(lat.data.products || []);
      setCategories(cats.data.categories || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* 1. HERO BANNER */}
      <HeroBanner />

      {/* 2. LIVE ANNOUNCEMENT MARQUEE TICKER */}
      <LiveTicker />

      {/* 3. BROWSE CATEGORIES CARDS */}
      <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="icon icon--sm icon--cyan">category</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
                  Organized Catalog
                </span>
              </div>
              <h2 className="section-title">
                Browse by <span className="text-gradient">Category</span>
              </h2>
            </div>
            <Link href="/products" className="btn btn--ghost btn--sm" style={{ gap: 6 }}>
              <span>View All</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="home-categories-grid">
              {categories.map(cat => {
                const visual = getCategoryVisual(cat.name, cat.id);
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="home-category-card"
                  >
                    <div
                      className="home-category-card__icon-box"
                      style={{
                        background: visual.bg,
                        color: visual.color,
                        boxShadow: `0 4px 14px ${visual.bg}`
                      }}
                    >
                      <span className="icon icon--lg" style={{ color: visual.color }}>
                        {visual.icon}
                      </span>
                    </div>
                    <div>
                      <div className="home-category-card__name">
                        {cat.name}
                      </div>
                      <div className="home-category-card__sub">
                        {visual.label}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>
              Loading categories...
            </div>
          )}
        </div>
      </section>

      {/* 4. DYNAMIC INTERACTIVE TABBED CATALOG SHOWCASE */}
      <CategoryShowcase initialCategories={categories} />

      {/* 5. FEATURED PRODUCTS (CURATED PICKS) */}
      {(loading || featured.length > 0) && (
        <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="container">
            <div className="section-header" style={{ marginBottom: 28 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="icon icon--sm icon--accent">star</span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                    Curated Picks
                  </span>
                </div>
                <h2 className="section-title">
                  Featured <span className="text-gradient">Products</span>
                </h2>
              </div>
              <Link href="/products?featured=true" className="btn btn--ghost btn--sm" style={{ gap: 6 }}>
                <span>View All Featured</span>
                <span className="icon icon--sm">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid--4">
              {loading
                ? Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
                : featured.map(p => <ProductCard key={p.id} product={p} />)
              }
            </div>
          </div>
        </section>
      )}

      {/* 6. HOW IT WORKS IN 3 STEPS */}
      <HowItWorksSection />

      {/* 7. LATEST ARRIVALS */}
      <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
                  Fresh Listings
                </span>
              </div>
              <h2 className="section-title">
                Latest <span className="text-gradient">Arrivals</span>
              </h2>
            </div>
            <Link href="/products?sort=newest" className="btn btn--ghost btn--sm" style={{ gap: 6 }}>
              <span>View All Store</span>
              <span className="icon icon--sm">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid--4">
            {loading
              ? Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
              : latest.map(p => <ProductCard key={p.id} product={p} />)
            }
          </div>
        </div>
      </section>

      {/* 8. WHY US / TRUST SECTION */}
      <section className="section section--sm" style={{ paddingBottom: 60, borderTop: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 48px auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              background: 'rgba(110, 58, 255, 0.1)', border: '1px solid rgba(110, 58, 255, 0.3)',
              marginBottom: 16
            }}>
              <span className="icon icon--sm icon--cyan">verified</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Why Choose Us
              </span>
            </div>
            <h2 className="section-title">
              Built for <span className="text-gradient">Speed &amp; Security</span>
            </h2>
            <p className="section-subtitle" style={{ margin: '8px auto 0 auto' }}>
              We make digital asset purchases instant, transparent, and completely automated.
            </p>
          </div>

          <div className="home-features-grid">
            {[
              { icon: 'bolt', title: 'Instant Dispatch', desc: 'Credentials and licenses delivered automatically within seconds of payment.' },
              { icon: 'lock', title: 'Encrypted Payments', desc: 'Direct UPI QR, Binance Pay, and Crypto with real-time automatic verification.' },
              { icon: 'verified_user', title: 'Pre-Verified Quality', desc: 'Every product is hand-tested and backed with dedicated replacement guarantees.' },
              { icon: 'support_agent', title: '24/7 Fast Support', desc: 'Direct help via Telegram and email tickets whenever you need assistance.' },
            ].map(f => (
              <div
                key={f.title}
                className="home-feature-card"
              >
                <div className="home-feature-card__icon-box">
                  <span className="icon icon--lg">{f.icon}</span>
                </div>
                <div className="home-feature-card__content">
                  <h3 className="home-feature-card__title">
                    {f.title}
                  </h3>
                  <p className="home-feature-card__desc">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. TELEGRAM COMMUNITY VIP BANNER */}
      <TelegramCommunityBanner />

      {/* 10. VERIFIED CUSTOMER REVIEWS & LIVE PROOF */}
      <section className="section section--sm" style={{ paddingBottom: 60, borderTop: '1px solid var(--color-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 40px auto' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 'var(--radius-full)',
              background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
              marginBottom: 14
            }}>
              <span className="icon icon--sm icon--filled" style={{ color: '#F59E0B' }}>star</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4.9 / 5.0 Rating • 3,500+ Reviews
              </span>
            </div>
            <h2 className="section-title">
              Loved by <span className="text-gradient">3,500+ Happy Buyers</span>
            </h2>
            <p className="section-subtitle" style={{ margin: '8px auto 0 auto' }}>
              Real feedback from verified purchasers who rely on our automated instant key &amp; account deliveries daily.
            </p>
          </div>

          <div className="home-testimonials-grid">
            {[
              {
                name: 'Rahul Sharma',
                loc: 'Mumbai, IN',
                stars: 5,
                title: 'Instant activation, key worked on first try',
                text: 'Purchased tool access and license. Got credentials in less than 30 seconds right inside the dashboard. 100% genuine.',
                product: 'Software License'
              },
              {
                name: 'Aman Verma',
                loc: 'Delhi, IN',
                stars: 5,
                title: 'Telegram support solved my query in 2 minutes',
                text: 'Had a quick question on login steps and the support team helped me immediately on Telegram. Exceptional service and pricing.',
                product: 'Digital Subscription'
              },
              {
                name: 'Vikram Patel',
                loc: 'Ahmedabad, IN',
                stars: 5,
                title: 'Best automated store with seamless UPI QR',
                text: 'Payment verified instantly and credentials were ready immediately. Saved over 70% compared to standard pricing.',
                product: 'Developer Toolkit'
              }
            ].map(r => (
              <div
                key={r.name}
                className="home-testimonial-card"
              >
                <div className="home-testimonial-card__header">
                  <div className="home-testimonial-card__stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="icon icon--filled" style={{ fontSize: 15, color: '#F59E0B' }}>star</span>
                    ))}
                  </div>
                  <span className="home-testimonial-card__verified-badge">
                    <span className="icon icon--sm icon--accent" style={{ fontSize: 13 }}>verified</span>
                    <span>Verified Purchase</span>
                  </span>
                </div>

                <div>
                  <h4 className="home-testimonial-card__title">
                    {r.title}
                  </h4>
                  <p className="home-testimonial-card__quote" style={{ marginTop: 8 }}>
                    "{r.text}"
                  </p>
                </div>

                <div className="home-testimonial-card__footer">
                  <div className="home-testimonial-card__avatar">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="home-testimonial-card__name">{r.name}</div>
                    <div className="home-testimonial-card__meta">{r.loc} • {r.product}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FAQ ACCORDION SECTION */}
      <HomeFaqSection />

      {/* 12. FLOATING LIVE SALES POPUP PROOF */}
      <LiveSalesNotification />
    </>
  );
}

function ProductCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '1 / 1' }} />
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
        <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 16, width: '75%', marginBottom: 16 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ height: 22, width: '30%' }} />
          <div className="skeleton" style={{ height: 32, width: '35%', borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
