'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroBanner({ onSearch, activeCategory, onSelectCategory, categories = [] }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  return (
    <section className="hero-minimal">
      <div className="container">
        <div className="hero-minimal__content">
          
          {/* Minimal Badge */}
          <div className="hero-minimal__badge">
            <span className="hero-minimal__dot" />
            <span>Instant Automated Delivery • 24/7 Live</span>
          </div>

          {/* Main Clean Headline */}
          <h1 className="hero-minimal__title">
            Premium Digital <span className="hero-minimal__gradient">Products &amp; Subscriptions</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-minimal__subtitle">
            Get genuine accounts, software licenses, OTT passes, and AI tools with automated delivery.
          </p>

          {/* Fast Minimalist Live Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hero-minimal__search-box">
            <span className="icon hero-minimal__search-icon">search</span>
            <input
              type="text"
              placeholder="Search Netflix, Gemini, Prime, Office, VPN, Canva..."
              value={query}
              onChange={handleInputChange}
              className="hero-minimal__search-input"
              aria-label="Search products"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); if (onSearch) onSearch(''); }}
                className="hero-minimal__clear-btn"
              >
                <span className="icon icon--sm">close</span>
              </button>
            )}
            <button type="submit" className="hero-minimal__search-btn">
              <span>Search</span>
            </button>
          </form>

          {/* Fast Category Filter Chips */}
          <div className="hero-minimal__chips-row">
            <button
              type="button"
              onClick={() => onSelectCategory && onSelectCategory('')}
              className={`hero-minimal__chip ${activeCategory === '' ? 'is-active' : ''}`}
            >
              <span className="icon icon--sm icon--filled">apps</span>
              <span>All Products</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
                className={`hero-minimal__chip ${activeCategory === cat.id ? 'is-active' : ''}`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
