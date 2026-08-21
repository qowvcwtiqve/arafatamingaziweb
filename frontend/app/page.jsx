'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import ProductCard from '../components/product/ProductCard';

const CATEGORIES = [
  { id: 'software', icon: 'terminal', label: 'Software' },
  { id: 'tools', icon: 'build', label: 'Tools' },
  { id: 'accounts', icon: 'manage_accounts', label: 'Accounts' },
  { id: 'templates', icon: 'description', label: 'Templates' },
  { id: 'scripts', icon: 'code', label: 'Scripts' },
  { id: 'other', icon: 'category', label: 'Other' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [stats, setStats] = useState({ products: 500, orders: 12000, users: 5000 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products?featured=true&limit=8'),
      api.get('/products?sort=newest&limit=8'),
    ]).then(([feat, lat]) => {
      setFeatured(feat.data.products || []);
      setLatest(lat.data.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg" />
        <div className="container">
          <div className="hero__content">
            <div className="hero__tag">
              <span className="icon icon--sm icon--filled">bolt</span>
              Instant Digital Delivery
            </div>

            <h1 className="hero__title">
              Your Premium{' '}
              <span className="text-gradient">Digital Marketplace</span>
            </h1>

            <p className="hero__description">
              Software, tools, accounts, templates and more — delivered instantly
              after payment. Secure checkout via UPI, Crypto &amp; Binance Pay.
            </p>

            <div className="hero__actions">
              <Link href="/products" className="btn btn--primary btn--lg">
                <span className="icon icon--md">storefront</span>
                Browse Products
              </Link>
              <Link href="/register" className="btn btn--ghost btn--lg">
                <span className="icon icon--md">person_add</span>
                Create Account
              </Link>
            </div>

            <div className="hero__stats">
              {[
                { value: '500+', label: 'Products' },
                { value: '12K+', label: 'Orders Fulfilled' },
                { value: '5K+', label: 'Happy Customers' },
              ].map(s => (
                <div key={s.label}>
                  <div className="hero__stat-value">{s.value}</div>
                  <div className="hero__stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section section--sm">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Browse <span className="text-gradient">Categories</span></h2>
              <p className="section-subtitle">Find exactly what you need</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '20px 16px', background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                  transition: 'var(--transition-base)', cursor: 'pointer', textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border-glow)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--gradient-primary-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-primary)',
                }}>
                  <span className="icon icon--lg">{cat.icon}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      {(loading || featured.length > 0) && (
        <section className="section section--sm">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  <span className="badge badge--featured" style={{ marginRight: 10, verticalAlign: 'middle' }}>Featured</span>
                  Top Picks
                </h2>
                <p className="section-subtitle">Hand-picked premium products</p>
              </div>
              <Link href="/products?featured=true" className="btn btn--ghost btn--sm">
                View All <span className="icon icon--sm">arrow_forward</span>
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

      {/* LATEST PRODUCTS */}
      <section className="section section--sm">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Latest <span className="text-gradient">Arrivals</span></h2>
              <p className="section-subtitle">Fresh digital products added daily</p>
            </div>
            <Link href="/products?sort=newest" className="btn btn--ghost btn--sm">
              View All <span className="icon icon--sm">arrow_forward</span>
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

      {/* WHY US */}
      <section className="section section--sm" style={{ paddingBottom: 80 }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 className="section-title">Why <span className="text-gradient">QuantumXD Store</span>?</h2>
            <p className="section-subtitle">We make digital shopping simple, secure, and instant</p>
          </div>
          <div className="grid grid--4">
            {[
              { icon: 'bolt', title: 'Instant Delivery', desc: 'Get your product the moment payment clears. No waiting.' },
              { icon: 'lock', title: 'Secure Payments', desc: 'UPI, Crypto & Binance Pay — all auto-verified and encrypted.' },
              { icon: 'verified', title: 'Quality Assured', desc: 'Every product is tested before listing.' },
              { icon: 'support_agent', title: '24/7 Support', desc: 'Email, Telegram & live chat support always available.' },
            ].map(f => (
              <div key={f.title} className="card" style={{ padding: 24, textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
                  background: 'var(--gradient-primary-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-cyan)',
                }}>
                  <span className="icon icon--xl">{f.icon}</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
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
