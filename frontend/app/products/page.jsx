'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import ProductCard from '../../components/product/ProductCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const CLEAN_CATEGORIES = [
  { key: '', label: 'All Products' },
  { key: 'software', label: 'Software & OS' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'developer', label: 'Developer Tools' },
  { key: 'gaming', label: 'Gaming' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    sort: 'newest',
    featured: searchParams.get('featured') || '',
    min_price: '',
    max_price: '',
  });

  useEffect(() => {
    const cat = searchParams.get('category');
    const srch = searchParams.get('search');
    if (cat !== null || srch !== null) {
      setFilters(f => ({
        ...f,
        category: cat || '',
        search: srch || '',
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 12, ...filters });
        for (const [k, v] of params) { if (!v) params.delete(k); }
        const { data } = await api.get(`/products?${params}`);
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch { setProducts([]); }
      finally { setLoading(false); }
    };
    load();
  }, [filters, page]);

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 30px)', paddingBottom: 60 }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, marginBottom: 8 }}>
            {filters.category
              ? <><span className="text-gradient" style={{ textTransform: 'capitalize' }}>{CLEAN_CATEGORIES.find(c => c.key === filters.category)?.label || filters.category}</span></>
              : filters.search
              ? <>Results for "<span className="text-gradient">{filters.search}</span>"</>
              : <>Explore <span className="text-gradient">Products</span></>
            }
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{total} premium digital products available</p>
        </div>

        {/* Mobile & Desktop Horizontal Category Slider Pills */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 24,
          scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          {CLEAN_CATEGORIES.map(c => {
            const active = filters.category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => { setFilters(f => ({ ...f, category: c.key })); setPage(1); }}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-full)',
                  background: active ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                  border: `1px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'var(--transition-fast)', flexShrink: 0,
                  boxShadow: active ? 'var(--shadow-glow)' : 'none'
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Search & Sort Bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 24, padding: '12px 16px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>search</span>
            <input
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, width: '100%' }}
              placeholder="Search in this category..."
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>Sort:</span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 13, height: 34 }}
              value={filters.sort}
              onChange={e => { setFilters(f => ({ ...f, sort: e.target.value })); setPage(1); }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid--3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div className="skeleton" style={{ paddingTop: '56.25%' }} />
                <div style={{ padding: 16 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 16 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ height: 22, width: '30%' }} />
                    <div className="skeleton" style={{ height: 32, width: '35%', borderRadius: 8 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state card card--elevated" style={{ padding: 48, textAlign: 'center' }}>
            <span className="icon empty-state__icon" style={{ fontSize: 48, color: 'var(--color-text-faint)' }}>search_off</span>
            <h3 className="empty-state__title" style={{ marginTop: 12 }}>No products found</h3>
            <p className="empty-state__desc">Try choosing a different category or clearing your search term.</p>
            <button
              className="btn btn--outline btn--sm"
              style={{ marginTop: 16 }}
              onClick={() => setFilters({ search: '', category: '', sort: 'newest', featured: '', min_price: '', max_price: '' })}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid--3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 40 }}>
            <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <span className="icon icon--sm">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`btn btn--sm ${page === p ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button className="btn btn--ghost btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <span className="icon icon--sm">chevron_right</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="skeleton" style={{ height: 40, width: 250, marginBottom: 20 }} />
          <div className="grid grid--3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />)}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
