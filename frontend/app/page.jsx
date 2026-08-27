'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '../lib/api';
import ProductCard from '../components/product/ProductCard';
import HeroBanner from '../components/home/HeroBanner';
import LiveTicker from '../components/home/LiveTicker';
import LiveSalesNotification from '../components/home/LiveSalesNotification';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TelegramCommunityBanner from '../components/home/TelegramCommunityBanner';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);

  // 1. Fetch live products and categories on mount
  useEffect(() => {
    Promise.all([
      api.get('/products?limit=100'),
      api.get('/products/categories')
    ]).then(([prodRes, catRes]) => {
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // 2. Filter and Sort the REAL Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Category
    if (selectedCategory) {
      result = result.filter(p => p.category_id === selectedCategory || p.category_name?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.short_description?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
      );
    }

    // Sort Products
    if (sortBy === 'price-low') {
      result.sort((a, b) => (Number(a.min_price || a.price || 0)) - (Number(b.min_price || b.price || 0)));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (Number(b.min_price || b.price || 0)) - (Number(a.min_price || a.price || 0)));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="home-page-minimal">
      
      {/* 1. MINIMAL HERO WITH INTEGRATED LIVE SEARCH & CATEGORY CHIPS */}
      <HeroBanner
        onSearch={setSearchQuery}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
      />

      {/* 2. SUBTLE LIVE TICKER */}
      <LiveTicker />

      {/* 3. REAL STORE PRODUCTS (CENTRAL STREAMLINED CATALOG) */}
      <section className="section section--sm home-catalog-section" id="catalog">
        <div className="container">
          
          {/* Catalog Toolbar Header */}
          <div className="catalog-toolbar">
            <div className="catalog-toolbar__info">
              <h2 className="catalog-toolbar__title">
                {selectedCategory ? (
                  categories.find(c => c.id === selectedCategory)?.name || 'Category'
                ) : searchQuery ? (
                  `Search: "${searchQuery}"`
                ) : (
                  'Available Products'
                )}
              </h2>
              <span className="catalog-toolbar__count">
                ({filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'})
              </span>
            </div>

            {/* Sort & Reset Filters */}
            <div className="catalog-toolbar__controls">
              {(selectedCategory || searchQuery) && (
                <button
                  type="button"
                  onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
                  className="catalog-reset-btn"
                >
                  <span className="icon icon--sm">restart_alt</span>
                  <span>Clear Filters</span>
                </button>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="catalog-sort-select"
                aria-label="Sort products"
              >
                <option value="popular">⚡ Most Popular</option>
                <option value="newest">✨ Newest First</option>
                <option value="price-low">📉 Price: Low to High</option>
                <option value="price-high">📈 Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Real Products Grid */}
          <div className="grid grid--4 catalog-products-grid">
            {loading ? (
              Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="catalog-empty-state">
                <span className="icon icon--xl icon--cyan">search_off</span>
                <h3>No products found</h3>
                <p>Try searching for a different keyword or select &quot;All Products&quot;.</p>
                <button
                  type="button"
                  onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
                  className="btn btn--primary btn--sm"
                  style={{ marginTop: 14 }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 4. HOW IT WORKS (3 SIMPLE CLEAN STEPS) */}
      <HowItWorksSection />

      {/* 5. TELEGRAM VIP COMMUNITY & FAST SUPPORT */}
      <TelegramCommunityBanner />

      {/* 6. SUBTLE REALTIME NOTIFICATION POPUP */}
      <LiveSalesNotification />

    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', padding: 12 }}>
      <div className="skeleton" style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: 8, marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '85%', marginBottom: 14 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ height: 20, width: '40%' }} />
        <div className="skeleton" style={{ height: 28, width: '35%', borderRadius: 6 }} />
      </div>
    </div>
  );
}
