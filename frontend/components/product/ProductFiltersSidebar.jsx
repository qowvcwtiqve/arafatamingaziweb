'use client';

import { useState } from 'react';
import { useCurrency } from '../../store/currencyStore';

export default function ProductFiltersSidebar({
  categories = [],
  filters,
  setFilters,
  onReset,
  totalProducts = 0,
  onCloseMobile,
}) {
  const { format, currency } = useCurrency();
  const [minPriceInput, setMinPriceInput] = useState(filters.min_price || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.max_price || '');
  const [categorySearch, setCategorySearch] = useState('');

  const BUDGET_PRESETS = [
    { label: 'All Budgets', min: '', max: '' },
    { label: `Under ${format(299)}`, min: '', max: '299' },
    { label: `${format(300)} – ${format(699)}`, min: '300', max: '699' },
    { label: `${format(700)} – ${format(1499)}`, min: '700', max: '1499' },
    { label: `${format(1500)}+`, min: '1500', max: '' },
  ];

  const STOCK_OPTIONS = [
    { id: 'all', label: 'All Catalog', icon: 'apps', color: 'var(--color-text-muted)' },
    { id: 'in_stock', label: 'Instant Auto-Dispatch', icon: 'bolt', color: '#10B981' },
    { id: 'preorder', label: 'Pre-Order Drops', icon: 'rocket_launch', color: '#3874FF' },
    { id: 'infinite', label: 'Unlimited Master Keys', icon: 'all_inclusive', color: '#00D4FF' },
  ];

  const hasActiveFilters = !!(
    filters.category ||
    filters.search ||
    filters.featured ||
    filters.min_price ||
    filters.max_price ||
    (filters.stock_status && filters.stock_status !== 'all')
  );

  const activeCount = [
    filters.category ? 1 : 0,
    filters.min_price || filters.max_price ? 1 : 0,
    filters.stock_status && filters.stock_status !== 'all' ? 1 : 0,
    filters.featured ? 1 : 0,
    filters.search ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const handleApplyPrice = (e) => {
    e?.preventDefault();
    setFilters((prev) => ({
      ...prev,
      min_price: minPriceInput.trim(),
      max_price: maxPriceInput.trim(),
    }));
    if (onCloseMobile) onCloseMobile();
  };

  const filteredCategories = categories.filter((c) =>
    (c.name || '').toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="pro-filter-panel">
      <style jsx>{`
        .pro-filter-panel {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--color-border);
        }

        .filter-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-icon-box {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(27, 78, 245, 0.12);
          border: 1px solid rgba(27, 78, 245, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1B4EF5;
        }

        .filter-main-title {
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.01em;
        }

        .filter-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 10px;
          background: #1B4EF5;
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 800;
        }

        .reset-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #EF4444;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          background: #EF4444;
          color: #ffffff;
          border-color: #EF4444;
        }

        .filter-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .section-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-text-faint);
        }

        .section-label-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text);
        }

        /* Category Item Styles */
        .category-search-input {
          width: 100%;
          padding: 7px 12px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .category-search-input:focus {
          border-color: #1B4EF5;
        }

        .category-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .category-list::-webkit-scrollbar {
          width: 4px;
        }
        .category-list::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }

        .category-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 10px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          color: var(--color-text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s ease;
        }

        .category-item:hover {
          background: var(--color-surface-2);
          color: var(--color-text);
        }

        .category-item.active {
          background: linear-gradient(135deg, rgba(27, 78, 245, 0.18) 0%, rgba(56, 116, 255, 0.08) 100%);
          border: 1px solid rgba(27, 78, 245, 0.35);
          color: #3874FF;
          font-weight: 700;
        }

        .cat-info {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cat-icon {
          font-size: 16px;
          color: var(--color-text-faint);
          transition: color 0.18s ease;
        }

        .category-item.active .cat-icon {
          color: #3874FF;
        }

        /* Budget Presets */
        .budget-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }

        .budget-pill {
          padding: 7px 8px;
          border-radius: var(--radius-sm);
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: all 0.18s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .budget-pill:hover {
          background: var(--color-surface-3);
          color: var(--color-text);
          border-color: var(--color-border-hover);
        }

        .budget-pill.active {
          background: rgba(27, 78, 245, 0.18);
          border-color: #1B4EF5;
          color: #3874FF;
          font-weight: 700;
        }

        /* Custom Price Form */
        .price-custom-form {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }

        .price-input-wrap {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
        }

        .price-input {
          width: 100%;
          height: 34px;
          padding: 0 8px 0 22px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text);
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }

        .price-input:focus {
          border-color: #1B4EF5;
        }

        .currency-symbol {
          position: absolute;
          left: 7px;
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-faint);
          pointer-events: none;
        }

        .price-apply-btn {
          height: 34px;
          padding: 0 12px;
          border-radius: var(--radius-sm);
          background: #1B4EF5;
          color: #ffffff;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .price-apply-btn:hover {
          background: #1B2CC1;
          box-shadow: 0 4px 12px rgba(27, 78, 245, 0.35);
        }

        /* Stock Status */
        .stock-option-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: var(--radius-md);
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
        }

        .stock-option-btn:hover {
          background: var(--color-surface-3);
          color: var(--color-text);
        }

        .stock-option-btn.active {
          background: rgba(27, 78, 245, 0.14);
          border-color: #1B4EF5;
          color: var(--color-text);
        }

        .stock-indicator {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Featured Switch */
        .featured-card-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: ${filters.featured ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)' : 'var(--color-surface-2)'};
          border: 1px solid ${filters.featured ? 'rgba(245, 158, 11, 0.45)' : 'var(--color-border)'};
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .featured-card-toggle:hover {
          border-color: rgba(245, 158, 11, 0.6);
        }

        .switch-track {
          width: 34px;
          height: 18px;
          border-radius: 20px;
          background: ${filters.featured ? '#F59E0B' : 'var(--color-border)'};
          position: relative;
          transition: all 0.2s ease;
        }

        .switch-knob {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffffff;
          position: absolute;
          top: 2px;
          left: ${filters.featured ? '18px' : '2px'};
          transition: all 0.2s ease;
        }
      `}</style>

      {/* 1. Header Bar */}
      <div className="filter-header">
        <div className="filter-title-wrap">
          <div className="filter-icon-box">
            <span className="icon icon--sm">tune</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="filter-main-title">Filters &amp; Browse</span>
              {activeCount > 0 && (
                <span className="filter-count-badge">{activeCount}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              {totalProducts} products available
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={onReset} className="reset-btn" title="Reset all filters">
            <span className="icon icon--sm" style={{ fontSize: 13 }}>restart_alt</span>
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* 2. Categories List */}
      <div className="filter-section">
        <div className="section-label-row">
          <span className="section-label-title">
            <span className="icon icon--sm" style={{ color: '#1B4EF5' }}>category</span>
            Categories
          </span>
          <span>{categories.length} total</span>
        </div>

        {categories.length > 6 && (
          <input
            type="text"
            placeholder="Search categories..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            className="category-search-input"
          />
        )}

        <div className="category-list">
          {filteredCategories.map((c) => {
            const isActive = filters.category === c.id;
            return (
              <button
                key={c.id || 'all'}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, category: c.id }));
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`category-item ${isActive ? 'active' : ''}`}
              >
                <div className="cat-info">
                  <span className="icon cat-icon">{c.icon || 'folder'}</span>
                  <span>{c.name}</span>
                </div>
                {isActive ? (
                  <span className="icon icon--sm" style={{ color: '#3874FF', fontSize: 15 }}>
                    check_circle
                  </span>
                ) : (
                  <span className="icon icon--sm" style={{ color: 'var(--color-text-faint)', fontSize: 14 }}>
                    chevron_right
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Price Budget Filter */}
      <div className="filter-section">
        <div className="section-label-row">
          <span className="section-label-title">
            <span className="icon icon--sm" style={{ color: '#10B981' }}>payments</span>
            Price Range
          </span>
          <span>{currency || 'INR'}</span>
        </div>

        {/* Quick Budget Presets */}
        <div className="budget-grid">
          {BUDGET_PRESETS.map((b) => {
            const isSelected = filters.min_price === b.min && filters.max_price === b.max;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, min_price: b.min, max_price: b.max }));
                  setMinPriceInput(b.min);
                  setMaxPriceInput(b.max);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`budget-pill ${isSelected ? 'active' : ''}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>

        {/* Custom Min / Max Inputs */}
        <form onSubmit={handleApplyPrice} className="price-custom-form">
          <div className="price-input-wrap">
            <span className="currency-symbol">{currency === 'USD' ? '$' : '₹'}</span>
            <input
              type="number"
              placeholder="Min"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="price-input"
            />
          </div>
          <span style={{ color: 'var(--color-text-faint)', fontSize: 12 }}>–</span>
          <div className="price-input-wrap">
            <span className="currency-symbol">{currency === 'USD' ? '$' : '₹'}</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="price-input"
            />
          </div>
          <button type="submit" className="price-apply-btn" title="Apply price range">
            Go
          </button>
        </form>
      </div>

      {/* 4. Stock & Delivery Method */}
      <div className="filter-section">
        <div className="section-label-row">
          <span className="section-label-title">
            <span className="icon icon--sm" style={{ color: '#3874FF' }}>inventory_2</span>
            Delivery &amp; Stock
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {STOCK_OPTIONS.map((opt) => {
            const isSelected = (filters.stock_status || 'all') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, stock_status: opt.id }));
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`stock-option-btn ${isSelected ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="stock-indicator"
                    style={{ background: opt.color }}
                  />
                  <span className="icon icon--sm" style={{ color: opt.color, fontSize: 15 }}>
                    {opt.icon}
                  </span>
                  <span>{opt.label}</span>
                </div>
                {isSelected && (
                  <span className="icon icon--sm" style={{ color: '#3874FF', fontSize: 14 }}>
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Featured Toggle */}
      <div
        className="featured-card-toggle"
        onClick={() => {
          setFilters((prev) => ({ ...prev, featured: prev.featured ? '' : 'true' }));
          if (onCloseMobile) onCloseMobile();
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="icon icon--sm" style={{ color: '#F59E0B' }}>stars</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              Featured Top Picks
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              Showcase editor-verified items only
            </div>
          </div>
        </div>
        <div className="switch-track">
          <div className="switch-knob" />
        </div>
      </div>
    </div>
  );
}
