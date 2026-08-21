'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import ProductCard from '../components/product/ProductCard';
import HeroBanner from '../components/home/HeroBanner';

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

      {/* 2. BROWSE CATEGORIES */}
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14
            }}>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.id}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '24px 16px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    textAlign: 'center'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border-glow)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px -6px rgba(110, 58, 255, 0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--gradient-primary-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-cyan)'
                  }}>
                    <span className="icon icon--lg">{cat.icon || 'category'}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                      Instant Delivery
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-faint)' }}>
              Loading categories...
            </div>
          )}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS */}
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

      {/* 4. LATEST ARRIVALS */}
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

      {/* 5. WHY US / TRUST SECTION */}
      <section className="section section--sm" style={{ paddingBottom: 90, borderTop: '1px solid var(--color-border)' }}>
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

          <div className="grid grid--4">
            {[
              { icon: 'bolt', title: 'Instant Dispatch', desc: 'Credentials and licenses delivered automatically within seconds of payment.' },
              { icon: 'lock', title: 'Encrypted Payments', desc: 'Direct UPI QR, Binance Pay, and Crypto with real-time automatic verification.' },
              { icon: 'verified_user', title: 'Pre-Verified Quality', desc: 'Every product is hand-tested and backed with dedicated replacement guarantees.' },
              { icon: 'support_agent', title: '24/7 Fast Support', desc: 'Direct help via Telegram and email tickets whenever you need assistance.' },
            ].map(f => (
              <div
                key={f.title}
                className="card"
                style={{
                  padding: 28,
                  textAlign: 'left',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--gradient-primary-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-cyan)'
                }}>
                  <span className="icon icon--lg">{f.icon}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ProductCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div className="skeleton" style={{ width: '100%', paddingTop: '56.25%' }} />
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
