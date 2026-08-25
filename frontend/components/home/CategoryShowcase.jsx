'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import ProductCard from '../product/ProductCard';

export default function CategoryShowcase({ initialCategories = [] }) {
  const [selectedCat, setSelectedCat] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState(initialCategories);

  useEffect(() => {
    if (!categories.length) {
      api.get('/products/categories').then(({ data }) => {
        setCategories(data.categories || []);
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedCat
      ? `/products?category=${selectedCat}&limit=12`
      : '/products?limit=12';
    
    api.get(url)
      .then(({ data }) => {
        setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCat]);

  return (
    <section className="section section--sm" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">
        
        {/* Section Header */}
        <div className="section-header" style={{ marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="icon icon--sm icon--cyan icon--filled">apps</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
                Instant Catalog Explorer
              </span>
            </div>
            <h2 className="section-title">
              Explore Our <span className="text-gradient">Products</span>
            </h2>
          </div>
          
          <Link href="/products" className="btn btn--primary btn--sm" style={{ gap: 6 }}>
            <span>Full Catalog</span>
            <span className="icon icon--sm">arrow_forward</span>
          </Link>
        </div>

        {/* Category Tabs Strip */}
        <div className="category-tabs-container">
          <style jsx>{`
            .category-tabs-container {
              display: flex;
              align-items: center;
              gap: 10px;
              overflow-x: auto;
              padding-bottom: 14px;
              margin-bottom: 24px;
              scrollbar-width: none;
            }
            .category-tabs-container::-webkit-scrollbar {
              display: none;
            }
            .cat-tab-btn {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 9px 18px;
              border-radius: var(--radius-full);
              font-size: 13.5px;
              font-weight: 700;
              cursor: pointer;
              background: var(--color-surface-2);
              border: 1px solid var(--color-border);
              color: var(--color-text-muted);
              transition: all 0.25s ease;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .cat-tab-btn:hover {
              border-color: var(--color-border-glow);
              color: var(--color-text);
              transform: translateY(-2px);
            }
            .cat-tab-btn.is-active {
              background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-cyan) 100%);
              border-color: transparent;
              color: #ffffff;
              box-shadow: 0 4px 16px rgba(124, 58, 237, 0.35);
            }
          `}</style>

          <button
            className={`cat-tab-btn ${selectedCat === '' ? 'is-active' : ''}`}
            onClick={() => setSelectedCat('')}
          >
            <span className="icon icon--sm icon--filled">grid_view</span>
            <span>All Products</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-tab-btn ${selectedCat === cat.id ? 'is-active' : ''}`}
              onClick={() => setSelectedCat(cat.id)}
            >
              <span className="icon icon--sm">category</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid--4">
          {loading ? (
            Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((p) => <ProductCard key={p.id} product={p} />)
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)' }}>
              <span className="icon icon--xl icon--muted" style={{ display: 'block', margin: '0 auto 12px' }}>search_off</span>
              <p style={{ fontSize: 16, fontWeight: 600 }}>No products found in this category.</p>
            </div>
          )}
        </div>

      </div>
    </section>
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
