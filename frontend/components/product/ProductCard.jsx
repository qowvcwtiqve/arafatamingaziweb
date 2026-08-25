'use client';

import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';
import ProductIconBanner from './ProductIconBanner';

export default function ProductCard({ product: p }) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: p.id,
      title: p.website_meta?.title || p.title || p.name,
      price: p.min_price || 0,
      seller_name: 'QuantumXD Store',
    });
    toast.success('Added to cart');
  };

  const price = p.min_price || 0;
  const comparePrice = p.website_meta?.compare_price || p.compare_price;
  const discount =
    comparePrice && comparePrice > price
      ? Math.round((1 - price / comparePrice) * 100)
      : null;
  const saveAmount = comparePrice && comparePrice > price ? comparePrice - price : null;

  const isPreorder =
    p.is_preorder ||
    p.website_meta?.badge?.toLowerCase().includes('pre-order') ||
    p.badge?.toLowerCase().includes('pre-order');
  const isOutOfStock = !p.in_stock && !isPreorder && p.total_stock === 0;

  const displayTitle = p.website_meta?.title || p.title || p.name;
  const displayBadge = p.website_meta?.badge || p.badge;

  const displayDesc =
    p.website_meta?.short_description ||
    p.website_meta?.description ||
    p.short_description ||
    p.description ||
    'Instant verified credentials & automated delivery with genuine license.';

  // Deterministic realistic ratings & orders based on product id
  const charCodeSum = (p.id || 'prod').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratingVariations = ['4.9', '4.8', '4.9', '4.7', '5.0', '4.8'];
  const ratingValue = ratingVariations[charCodeSum % ratingVariations.length];
  const reviewsCount = 38 + (charCodeSum % 142);
  const soldCount = 120 + (charCodeSum % 380);

  return (
    <Link href={`/products/${p.slug || p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div className="product-card">
        {/* 1. Visual Graphic Banner (1:1 Square Ratio) */}
        <div
          className="product-card__image-container"
          style={{
            width: '100%',
            aspectRatio: '1 / 1',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--color-surface-2)'
          }}
        >
          <ProductIconBanner
            title={displayTitle}
            category={p.category_id || p.category}
            size="card"
          />

          {/* Top-Left Floating Badges (Sale / Pre-Order / Custom) */}
          <div className="product-card__floating-badges">
            {discount && (
              <span className="badge-pill badge-pill--sale">
                <span className="icon icon--sm" style={{ fontSize: 10 }}>local_fire_department</span>
                -{discount}%
              </span>
            )}
            {isPreorder && (
              <span className="badge-pill badge-pill--preorder">
                <span className="icon icon--sm" style={{ fontSize: 10 }}>rocket_launch</span>
                Pre-Order
              </span>
            )}
            {displayBadge && !isPreorder && !discount && (
              <span className="badge-pill badge-pill--custom">
                <span className="icon icon--sm" style={{ fontSize: 10 }}>stars</span>
                {displayBadge}
              </span>
            )}
          </div>

          {/* Top-Right Ultra-Stylish Rating Glass Pill */}
          <div className="product-card__rating-badge-pos">
            <div className="rating-pill-glass">
              <span className="rating-pill-glass__star icon icon--sm icon--filled">star</span>
              <span className="rating-pill-glass__score">{ratingValue}</span>
            </div>
          </div>
        </div>

        {/* 2. Stylish Card Body */}
        <div className="product-card__content-box">
          {/* Realistic Social Proof & Review Bar */}
          <div className="product-card__review-trust-bar">
            <div className="product-card__stars-inline">
              <span className="icon icon--sm icon--filled" style={{ color: '#F59E0B', fontSize: 13 }}>star</span>
              <span className="product-card__score-text">{ratingValue}</span>
              <span className="product-card__count-text">({reviewsCount})</span>
            </div>
            <span className="product-card__bullet-sep" />
            <span className="product-card__sold-text">{soldCount}+ sold</span>
          </div>

          {/* Title */}
          <h3 className="product-card__clean-title" title={displayTitle}>
            {displayTitle}
          </h3>

          {/* Description Preview */}
          <p className="product-card__desc-preview" title={displayDesc}>
            {displayDesc}
          </p>

          {/* Price & Action Row (Price on top, Full-Width Button below) */}
          <div className="product-card__action-row">
            <div className="product-card__price-wrapper">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <span className="product-card__current-price">
                  ₹{price.toLocaleString('en-IN')}
                </span>
                {comparePrice && comparePrice > price && (
                  <span className="product-card__old-price">
                    ₹{comparePrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              {saveAmount && saveAmount > 0 && (
                <span className="product-card__save-tag">
                  Save ₹{saveAmount.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <button
              type="button"
              className="product-card__add-btn"
              onClick={handleAddToCart}
              aria-label={`Add ${displayTitle} to cart`}
              disabled={isOutOfStock}
              title={isOutOfStock ? 'Out of stock' : isPreorder ? 'Pre-Order' : 'Add to Cart'}
            >
              <span className="icon icon--sm" style={{ fontSize: 15 }}>
                {isOutOfStock ? 'block' : isPreorder ? 'rocket_launch' : 'add_shopping_cart'}
              </span>
              <span className="product-card__add-btn-text">
                {isOutOfStock ? 'Sold Out' : isPreorder ? 'Pre-Order' : 'Add to Cart'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
