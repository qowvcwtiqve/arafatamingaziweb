'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '../../lib/api';
import ProductCard from '../../components/product/ProductCard';
import CustomDropdown from '../../components/ui/CustomDropdown';
import { useCurrency } from '../../store/currencyStore';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: 'schedule' },
  { value: 'popular', label: 'Most Popular', icon: 'local_fire_department' },
  { value: 'price_asc', label: 'Price: Low to High', icon: 'arrow_upward' },
  { value: 'price_desc', label: 'Price: High to Low', icon: 'arrow_downward' },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { format } = useCurrency();

  const BUDGET_PRESETS = [
    { label: 'All Prices', min: '', max: '' },
    { label: `Under ${format(299)}`, min: '', max: '299' },
    { label: `${format(300)} – ${format(699)}`, min: '300', max: '699' },
    { label: `${format(700)} – ${format(1499)}`, min: '700', max: '1499' },
    { label: `${format(1500)} & Above`, min: '1500', max: '' },
  ];

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: '', name: 'All Categories', icon: 'grid_view' }]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    sort: 'newest',
    featured: searchParams.get('featured') || '',
    stock_status: 'all', // 'all' | 'in_stock' | 'preorder' | 'infinite'
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
  });

  // Local price input state for user typing before submitting
  const [customMinPrice, setCustomMinPrice] = useState(filters.min_price);
  const [customMaxPrice, setCustomMaxPrice] = useState(filters.max_price);

  useEffect(() => {
    const cat = searchParams.get('category');
    const srch = searchParams.get('search');
    const feat = searchParams.get('featured');
    const minP = searchParams.get('min_price');
    const maxP = searchParams.get('max_price');
    setFilters((f) => ({
      ...f,
      category: cat || '',
      search: srch || '',
      featured: feat || '',
      min_price: minP || '',
      max_price: maxP || '',
    }));
    if (minP !== null) setCustomMinPrice(minP);
    if (maxP !== null) setCustomMaxPrice(maxP);

    // Fetch categories dynamically
    api
      .get('/products/categories')
      .then(({ data }) => {
        setCategories([{ id: '', name: 'All Categories', icon: 'grid_view' }, ...(data.categories || [])]);
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 12, ...filters });
        if (filters.stock_status === 'all') params.delete('stock_status');
        for (const [k, v] of params) {
          if (!v) params.delete(k);
        }
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

  const activeCategory = categories.find((c) => c.id === filters.category);

  const handleApplyCustomPrice = (e) => {
    e?.preventDefault();
    setFilters((f) => ({
      ...f,
      min_price: customMinPrice.trim(),
      max_price: customMaxPrice.trim(),
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: '',
      sort: 'newest',
      featured: '',
      stock_status: 'all',
      min_price: '',
      max_price: '',
    });
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setPage(1);
  };

  const hasActiveFilters = !!(
    filters.category ||
    filters.search ||
    filters.featured ||
    filters.min_price ||
    filters.max_price ||
    filters.stock_status !== 'all'
  );

  // Sidebar Filter Content (Shared between desktop sidebar & mobile drawer)
  const FilterSidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="icon icon--sm" style={{ color: 'var(--color-cyan)' }}>tune</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Filters & Categories</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <span className="icon icon--sm" style={{ fontSize: 14 }}>restart_alt</span>
            Reset
          </button>
        )}
      </div>

      {/* Categories List */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="icon icon--sm" style={{ color: 'var(--color-primary-light)' }}>category</span>
          Categories ({categories.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
          {categories.map((c) => {
            const isActive = filters.category === c.id;
            return (
              <button
                key={c.id || 'all'}
                onClick={() => {
                  setFilters((f) => ({ ...f, category: c.id }));
                  setPage(1);
                  setMobileFilterOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'linear-gradient(135deg, rgba(110, 58, 255, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)' : 'transparent',
                  border: isActive ? '1px solid rgba(110, 58, 255, 0.4)' : '1px solid transparent',
                  color: isActive ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-surface-2)';
                    e.currentTarget.style.color = 'var(--color-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span className="icon icon--sm" style={{ color: isActive ? 'var(--color-cyan)' : 'var(--color-text-faint)', fontSize: 16 }}>
                    {c.icon || 'folder'}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                </div>
                {isActive && (
                  <span className="icon icon--sm" style={{ color: 'var(--color-cyan)', fontSize: 16 }}>check</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Budget Filter */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="icon icon--sm" style={{ color: 'var(--color-accent)' }}>payments</span>
          Price Budget
        </div>

        {/* Quick Budget Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {BUDGET_PRESETS.map((b) => {
            const isSelected = filters.min_price === b.min && filters.max_price === b.max;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, min_price: b.min, max_price: b.max }));
                  setCustomMinPrice(b.min);
                  setCustomMaxPrice(b.max);
                  setPage(1);
                  setMobileFilterOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-2)',
                  border: isSelected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-border)',
                  color: isSelected ? '#10b981' : 'var(--color-text-muted)',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{b.label}</span>
                {isSelected && <span className="icon icon--sm" style={{ fontSize: 14 }}>check</span>}
              </button>
            );
          })}
        </div>

        {/* Custom Price Range Form */}
        <form onSubmit={handleApplyCustomPrice} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Min Price"
            value={customMinPrice}
            onChange={(e) => setCustomMinPrice(e.target.value)}
            className="form-input"
            style={{ height: 32, fontSize: 12, padding: '0 8px', flex: 1 }}
          />
          <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>–</span>
          <input
            type="number"
            placeholder="Max Price"
            value={customMaxPrice}
            onChange={(e) => setCustomMaxPrice(e.target.value)}
            className="form-input"
            style={{ height: 32, fontSize: 12, padding: '0 8px', flex: 1 }}
          />
          <button type="submit" className="btn btn--secondary btn--sm" style={{ height: 32, padding: '0 10px', fontSize: 12 }}>
            Go
          </button>
        </form>
      </div>

      {/* Stock Availability */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="icon icon--sm" style={{ color: '#00D4FF' }}>inventory_2</span>
          Availability
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'all', label: 'All Items', icon: 'apps' },
            { id: 'in_stock', label: 'In Stock (Instant)', icon: 'check_circle', color: '#10b981' },
            { id: 'preorder', label: 'Pre-Orders Active', icon: 'rocket_launch', color: '#a855f7' },
            { id: 'infinite', label: 'Infinite Stock', icon: 'all_inclusive', color: '#00D4FF' },
          ].map((item) => {
            const isSelected = filters.stock_status === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, stock_status: item.id }));
                  setPage(1);
                  setMobileFilterOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  borderRadius: 6,
                  background: isSelected ? 'rgba(0, 212, 255, 0.12)' : 'var(--color-surface-2)',
                  border: isSelected ? '1px solid var(--color-cyan)' : '1px solid var(--color-border)',
                  color: isSelected ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="icon icon--sm" style={{ color: item.color || 'inherit', fontSize: 14 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isSelected && <span className="icon icon--sm" style={{ fontSize: 14 }}>check</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Picks Toggle */}
      <div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '10px 12px',
            background: filters.featured ? 'rgba(245, 158, 11, 0.12)' : 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            border: filters.featured ? '1px solid #f59e0b' : '1px solid var(--color-border)',
            transition: 'all 0.15s ease',
          }}
        >
          <input
            type="checkbox"
            checked={!!filters.featured}
            onChange={(e) => {
              setFilters((f) => ({ ...f, featured: e.target.checked ? 'true' : '' }));
              setPage(1);
            }}
            style={{ width: 16, height: 16, accentColor: '#f59e0b' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: filters.featured ? '#f59e0b' : 'var(--color-text)' }}>
            <span className="icon icon--sm" style={{ color: '#f59e0b', fontSize: 16 }}>star</span>
            Featured Picks Only
          </div>
        </label>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 20px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* HERO STORE HEADER */}
        <div className="store-hero-banner">
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(0, 212, 255, 0.12)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--color-cyan)',
                marginBottom: 8,
              }}
            >
              <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
              <span>Official Digital Marketplace</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                margin: '0 0 8px 0',
                lineHeight: 1.2,
              }}
            >
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

            <p style={{ color: 'var(--color-text-muted)', fontSize: 13.5, lineHeight: 1.5, margin: 0 }}>
              Browse verified software licenses, OTT subscriptions, AI accounts, and developer tools with automated instant credential dispatch.
            </p>
          </div>
        </div>

        {/* 2-COLUMN MAIN STORE LAYOUT (LEFT SIDEBAR + PRODUCTS GRID) */}
        <div className="store-main-layout">
          
          {/* DESKTOP LEFT SIDEBAR */}
          <aside className="store-sidebar-desktop">
            <FilterSidebarContent />
          </aside>

          {/* RIGHT PRODUCTS MAIN CONTENT */}
          <main className="store-main-content">
            
            {/* TOP CONTROLS & SEARCH TOOLBAR */}
            <div className="store-toolbar-container">
              {/* Search Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flex: '1 1 240px',
                  minWidth: 200,
                  background: 'var(--color-surface-2)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)' }}>search</span>
                <input
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--color-text)',
                    fontSize: 13.5,
                    width: '100%',
                  }}
                  placeholder="Search in store (e.g. Canva, ChatGPT, Netflix)..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, search: e.target.value }));
                    setPage(1);
                  }}
                />
                {filters.search && (
                  <button
                    className="btn btn--ghost btn--icon"
                    onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                    style={{ width: 20, height: 20, padding: 0 }}
                  >
                    <span className="icon" style={{ fontSize: 14 }}>close</span>
                  </button>
                )}
              </div>

              {/* Toolbar Actions Row (Filters + Sort + Desktop Count) */}
              <div className="store-toolbar-actions-row" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Mobile Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="btn btn--secondary btn--sm store-mobile-filter-btn"
                  style={{ gap: 6, display: 'none' }}
                >
                  <span className="icon icon--sm">tune</span>
                  <span>Filters</span>
                  {hasActiveFilters && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-cyan)' }} />
                  )}
                </button>

                {/* Count (Desktop only) */}
                <div className="store-product-count-desktop" style={{ fontSize: 13, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
                  <strong>{total}</strong> products
                </div>

                {/* Sort Dropdown */}
                <div className="store-toolbar-sort-wrap">
                  <CustomDropdown
                    options={SORT_OPTIONS}
                    value={filters.sort}
                    onChange={(val) => {
                      setFilters((f) => ({ ...f, sort: val }));
                      setPage(1);
                    }}
                    icon="sort"
                    minWidth={160}
                  />
                </div>
              </div>
            </div>

            {/* QUICK HORIZONTAL CATEGORY PILLS BAR */}
            <div className="store-category-pills-bar">
              {categories.map((c) => {
                const isActive = (!filters.category && !c.id) || filters.category === c.id;
                return (
                  <button
                    key={c.id || 'all'}
                    type="button"
                    onClick={() => {
                      setFilters((f) => ({ ...f, category: c.id }));
                      setPage(1);
                    }}
                    className={`store-cat-pill ${isActive ? 'store-cat-pill--active' : ''}`}
                  >
                    {c.icon && <span className="icon icon--sm" style={{ fontSize: 14 }}>{c.icon}</span>}
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>

            {/* ACTIVE FILTER BADGES STRIP */}
            {hasActiveFilters && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-faint)', fontWeight: 600 }}>Active Filters:</span>

                {filters.category && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      background: 'rgba(110, 58, 255, 0.15)',
                      border: '1px solid rgba(110, 58, 255, 0.3)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-primary-light)',
                    }}
                  >
                    Category: {activeCategory?.name || filters.category}
                    <span
                      className="icon icon--sm"
                      style={{ cursor: 'pointer', fontSize: 14 }}
                      onClick={() => setFilters((f) => ({ ...f, category: '' }))}
                    >
                      close
                    </span>
                  </span>
                )}

                {(filters.min_price || filters.max_price) && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#10b981',
                    }}
                  >
                    Budget: {filters.min_price ? format(filters.min_price) : format(0)} – {filters.max_price ? format(filters.max_price) : 'Any'}
                    <span
                      className="icon icon--sm"
                      style={{ cursor: 'pointer', fontSize: 14 }}
                      onClick={() => {
                        setFilters((f) => ({ ...f, min_price: '', max_price: '' }));
                        setCustomMinPrice('');
                        setCustomMaxPrice('');
                      }}
                    >
                      close
                    </span>
                  </span>
                )}

                {filters.stock_status !== 'all' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      background: 'rgba(0, 212, 255, 0.15)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-cyan)',
                    }}
                  >
                    Status: {filters.stock_status}
                    <span
                      className="icon icon--sm"
                      style={{ cursor: 'pointer', fontSize: 14 }}
                      onClick={() => setFilters((f) => ({ ...f, stock_status: 'all' }))}
                    >
                      close
                    </span>
                  </span>
                )}

                {filters.featured && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#f59e0b',
                    }}
                  >
                    Featured Only
                    <span
                      className="icon icon--sm"
                      style={{ cursor: 'pointer', fontSize: 14 }}
                      onClick={() => setFilters((f) => ({ ...f, featured: '' }))}
                    >
                      close
                    </span>
                  </span>
                )}

                {filters.search && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      background: 'rgba(0, 212, 255, 0.15)',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--color-cyan)',
                    }}
                  >
                    "{filters.search}"
                    <span
                      className="icon icon--sm"
                      style={{ cursor: 'pointer', fontSize: 14 }}
                      onClick={() => setFilters((f) => ({ ...f, search: '' }))}
                    >
                      close
                    </span>
                  </span>
                )}

                <button
                  onClick={handleResetFilters}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span className="icon icon--sm">restart_alt</span>
                  <span>Clear All</span>
                </button>
              </div>
            )}

            {/* PRODUCTS GRID */}
            {loading ? (
              <div className="grid grid--3">
                {Array(9).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid--3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '70px 20px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(110, 58, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    color: 'var(--color-primary-light)',
                  }}
                >
                  <span className="icon icon--xl">search_off</span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, margin: '0 0 8px 0' }}>
                  No matching products found
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 20px 0', maxWidth: 400, marginInline: 'auto' }}>
                  We couldn't find any items matching your selected category or price budget. Try widening your price range or resetting filters.
                </p>
                <button className="btn btn--primary btn--md" onClick={handleResetFilters} style={{ gap: 6 }}>
                  <span className="icon icon--sm">restart_alt</span>
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

            {/* PAGINATION BAR */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 48,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="btn btn--ghost btn--sm btn--icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)' }}
                >
                  <span className="icon icon--sm">chevron_left</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${page === p ? 'transparent' : 'var(--color-border)'}`,
                      background: page === p ? 'var(--gradient-primary)' : 'var(--color-surface)',
                      color: page === p ? '#fff' : 'var(--color-text-muted)',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: page === p ? 'var(--shadow-glow)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {p}
                  </button>
                ))}

                <button
                  className="btn btn--ghost btn--sm btn--icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)' }}
                >
                  <span className="icon icon--sm">chevron_right</span>
                </button>
              </div>
            )}

          </main>
        </div>

      </div>

      {/* MOBILE FILTER OVERLAY DRAWER */}
      {mobileFilterOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-start',
          }}
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            style={{
              width: '85%',
              maxWidth: 340,
              height: '100%',
              background: 'var(--color-surface)',
              borderRight: '1px solid var(--color-border)',
              padding: 24,
              overflowY: 'auto',
              animation: 'slideInLeft 0.25s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={() => setMobileFilterOpen(false)} className="btn btn--ghost btn--sm">
                <span className="icon icon--sm">close</span>
              </button>
            </div>
            <FilterSidebarContent />
          </div>
        </div>
      )}
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
    <Suspense
      fallback={
        <div style={{ padding: '120px 0', textAlign: 'center' }}>
          <div className="container">
            <div className="grid grid--3">
              {Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
