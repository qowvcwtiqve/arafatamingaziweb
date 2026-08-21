'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../lib/api';
import ProductCard from '../../components/product/ProductCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: '', name: 'All Categories', icon: 'grid_view' }]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    sort: 'newest',
    featured: searchParams.get('featured') || '',
    stock_status: 'all', // 'all' | 'in_stock' | 'preorder'
  });

  useEffect(() => {
    const cat = searchParams.get('category');
    const srch = searchParams.get('search');
    const feat = searchParams.get('featured');
    setFilters(f => ({
      ...f,
      category: cat || '',
      search: srch || '',
      featured: feat || '',
    }));
    
    // Fetch categories dynamically
    api.get('/products/categories').then(({ data }) => {
      setCategories([{ id: '', name: 'All Categories', icon: 'grid_view' }, ...(data.categories || [])]);
    }).catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 12, ...filters });
        if (filters.stock_status === 'all') params.delete('stock_status');
        for (const [k, v] of params) { if (!v) params.delete(k); }
        const { data } = await api.get(`/products?${params}`);
        setProducts(data.products || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters, page]);

  const activeCategory = categories.find(c => c.id === filters.category);

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 20px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* HERO STORE HEADER */}
        <div style={{
          padding: '36px 32px',
          borderRadius: 'var(--radius-xl)',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(110, 58, 255, 0.22) 0%, rgba(13, 17, 23, 0.95) 75%)',
          border: '1px solid var(--color-border)',
          marginBottom: 36,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle grid pattern background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px', pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.3)',
              fontSize: 12, fontWeight: 700, color: 'var(--color-cyan)', marginBottom: 12
            }}>
              <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
              <span>Official Digital Marketplace</span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(28px, 4.5vw, 42px)',
              fontWeight: 800,
              margin: '0 0 10px 0',
              lineHeight: 1.15
            }}>
              {filters.category ? (
                <>Category: <span className="text-gradient">{activeCategory?.name || filters.category}</span></>
              ) : filters.search ? (
                <>Results for "<span className="text-gradient">{filters.search}</span>"</>
              ) : filters.featured ? (
                <>Curated <span className="text-gradient">Featured Products</span></>
              ) : (
                <>Explore <span className="text-gradient">Digital Store</span></>
              )}
            </h1>

            <p style={{ color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
              Browse verified software licenses, OTT subscriptions, AI accounts, and developer tools with automated instant credential dispatch.
            </p>

            {/* Quick Guarantees Pill Strip */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 18, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-cyan)', fontWeight: 600 }}>
                <span className="icon icon--sm icon--cyan icon--filled">bolt</span> Instant Dispatch
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-accent)', fontWeight: 600 }}>
                <span className="icon icon--sm icon--accent">verified_user</span> 100% Genuine
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-primary-light)', fontWeight: 600 }}>
                <span className="icon icon--sm icon--primary">support_agent</span> 24/7 Human Help
              </span>
            </div>
          </div>
        </div>

        {/* CATEGORIES NAVIGATION CAROUSEL */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--color-text)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="icon icon--sm icon--cyan">category</span> Categories
            </span>
            <span style={{ color: 'var(--color-text-faint)', fontWeight: 500 }}>
              {categories.length} available categories
            </span>
          </div>

          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 10,
            scrollbarWidth: 'none', msOverflowStyle: 'none'
          }}>
            {categories.map(c => {
              const active = filters.category === c.id;
              return (
                <button
                  key={c.id || 'all'}
                  onClick={() => { setFilters(f => ({ ...f, category: c.id, search: '' })); setPage(1); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 'var(--radius-lg)',
                    background: active ? 'var(--gradient-primary)' : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    border: `1.5px solid ${active ? 'transparent' : 'var(--color-border)'}`,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease', flexShrink: 0,
                    boxShadow: active ? '0 0 25px rgba(110, 58, 255, 0.4)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = 'var(--color-border-glow)';
                      e.currentTarget.style.color = 'var(--color-text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.color = 'var(--color-text-muted)';
                    }
                  }}
                >
                  <span className="icon icon--sm" style={{ color: active ? '#fff' : 'var(--color-cyan)' }}>
                    {c.icon || 'category'}
                  </span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SMART FILTER & SORT TOOLBAR */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 32, padding: '14px 20px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          
          {/* Live Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240,
            background: 'var(--color-surface-2)', padding: '8px 14px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>search</span>
            <input
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--color-text)', fontSize: 14, width: '100%'
              }}
              placeholder="Search in store (e.g. Canva, Zee5, Windows)..."
              value={filters.search}
              onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
            />
            {filters.search && (
              <button
                className="btn btn--ghost btn--icon"
                onClick={() => setFilters(f => ({ ...f, search: '' }))}
                style={{ width: 20, height: 20, padding: 0 }}
              >
                <span className="icon" style={{ fontSize: 14 }}>close</span>
              </button>
            )}
          </div>

          {/* Quick Stock Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'featured', label: 'Featured Picks' },
            ].map(pill => {
              const isActive = (pill.id === 'featured' && filters.featured) || (pill.id === 'all' && !filters.featured);
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setFilters(f => ({
                      ...f,
                      featured: pill.id === 'featured' ? 'true' : '',
                    }));
                    setPage(1);
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-md)',
                    background: isActive ? 'rgba(0, 212, 255, 0.12)' : 'var(--color-surface-2)',
                    border: `1px solid ${isActive ? 'var(--color-cyan)' : 'var(--color-border)'}`,
                    color: isActive ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Sorting Dropdown & Total Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
              <strong>{total}</strong> products found
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>sort</span>
              <select
                className="form-input"
                style={{
                  width: 'auto', padding: '6px 12px', fontSize: 13, height: 36,
                  borderRadius: 'var(--radius-md)', background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)', color: 'var(--color-text)'
                }}
                value={filters.sort}
                onChange={e => { setFilters(f => ({ ...f, sort: e.target.value })); setPage(1); }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

        </div>

        {/* ACTIVE FILTER BADGES STRIP */}
        {(filters.category || filters.search || filters.featured) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-faint)', fontWeight: 600 }}>Active Filters:</span>
            
            {filters.category && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', background: 'rgba(110, 58, 255, 0.15)',
                border: '1px solid rgba(110, 58, 255, 0.3)', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 700, color: 'var(--color-primary-light)'
              }}>
                Category: {activeCategory?.name || filters.category}
                <span
                  className="icon icon--sm"
                  style={{ cursor: 'pointer', fontSize: 14 }}
                  onClick={() => setFilters(f => ({ ...f, category: '' }))}
                >
                  close
                </span>
              </span>
            )}

            {filters.search && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', background: 'rgba(0, 212, 255, 0.15)',
                border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 700, color: 'var(--color-cyan)'
              }}>
                Keyword: "{filters.search}"
                <span
                  className="icon icon--sm"
                  style={{ cursor: 'pointer', fontSize: 14 }}
                  onClick={() => setFilters(f => ({ ...f, search: '' }))}
                >
                  close
                </span>
              </span>
            )}

            <button
              onClick={() => setFilters({ search: '', category: '', sort: 'newest', featured: '', stock_status: 'all' })}
              style={{
                background: 'transparent', border: 'none', color: 'var(--color-error)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <span className="icon icon--sm">restart_alt</span>
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* PRODUCTS GRID */}
        {loading ? (
          <div className="grid grid--4">
            {Array(12).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid--4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
              color: 'var(--color-primary-light)'
            }}>
              <span className="icon icon--xl">search_off</span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, margin: '0 0 8px 0' }}>
              No matching products found
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: '0 0 24px 0', maxWidth: 420, marginInline: 'auto' }}>
              We couldn't find any products matching your current filters. Try changing search keywords or resetting filters.
            </p>
            <button
              className="btn btn--primary btn--md"
              onClick={() => setFilters({ search: '', category: '', sort: 'newest', featured: '', stock_status: 'all' })}
              style={{ gap: 6 }}
            >
              <span className="icon icon--sm">restart_alt</span>
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 8, marginTop: 52, flexWrap: 'wrap'
          }}>
            <button
              className="btn btn--ghost btn--sm btn--icon"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              aria-label="Previous page"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}
            >
              <span className="icon icon--sm">chevron_left</span>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  border: `1px solid ${page === p ? 'transparent' : 'var(--color-border)'}`,
                  background: page === p ? 'var(--gradient-primary)' : 'var(--color-surface)',
                  color: page === p ? '#fff' : 'var(--color-text-muted)',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  boxShadow: page === p ? 'var(--shadow-glow)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {p}
              </button>
            ))}

            <button
              className="btn btn--ghost btn--sm btn--icon"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}
            >
              <span className="icon icon--sm">chevron_right</span>
            </button>
          </div>
        )}

      </div>
    </div>
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

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '120px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="grid grid--4">
            {Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
