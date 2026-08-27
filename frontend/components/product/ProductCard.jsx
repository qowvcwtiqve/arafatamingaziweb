'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import { useCurrency } from '../../store/currencyStore';
import toast from 'react-hot-toast';
import ProductIconBanner from './ProductIconBanner';

/* ── Inline SVG icons — zero dependency ──────────────────────────── */
const IconStar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const IconCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconRocket = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const IconBan = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const IconGlobe = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const IconDiscount = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconCheck = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ─────────────────────────────────────────────────────────────────── */

export default function ProductCard({ product: p }) {
  const addItem = useCartStore((s) => s.addItem);
  const { format } = useCurrency();
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: p.id,
      variant_id: p.variants?.[0]?.id || p.id,
      title: p.website_meta?.title || p.title || p.name,
      price: p.min_price || 0,
      seller_name: 'QuantumXD Store',
    });
    toast.success('Added to cart');
  };

  const price = p.min_price || 0;
  const comparePrice = p.website_meta?.compare_price || p.compare_price;
  const discount = comparePrice && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100) : null;
  const saveAmount = comparePrice && comparePrice > price ? comparePrice - price : null;

  const isPreorder = Boolean(
    p.variants && p.variants.length > 0
      ? (p.variants[0].is_preorder || p.variants[0].delivery_method === 'preorder')
      : (p.is_preorder || p.badge?.toLowerCase().includes('pre-order'))
  );
  const isOutOfStock = !p.in_stock && !isPreorder && p.total_stock === 0;

  const displayTitle  = p.website_meta?.title || p.title || p.name;
  const displayCategory = p.website_meta?.category || p.category_name || p.category || 'Digital Key';
  const displayBadge  = p.website_meta?.badge || p.badge;
  const displayDesc   =
    p.website_meta?.short_description ||
    p.website_meta?.description ||
    p.short_description ||
    p.description ||
    'Instant automated digital activation & verified license.';

  // Deterministic social proof metrics
  const seed = (p.id || 'prod').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratings = ['4.9', '4.8', '4.9', '4.7', '5.0', '4.8'];
  const ratingValue  = ratings[seed % ratings.length];
  const reviewsCount = 48 + (seed % 160);
  const soldCount    = 140 + (seed % 380);

  const imageUrl = p.images?.[0] || p.website_meta?.images?.[0];
  const hasImage = Boolean(imageUrl && !imgError);

  return (
    <Link href={`/products/${p.slug || p.id}`} className="pcard-link">
      <div className={`pcard ${isOutOfStock ? 'pcard--oos' : ''}`}>

        {/* ── MEDIA ZONE ─────────────────────────── */}
        <div className="pcard__media">
          {hasImage ? (
            <div className="pcard__img-wrap">
              <img
                src={imageUrl}
                alt={displayTitle}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="pcard__img"
              />
            </div>
          ) : (
            <ProductIconBanner
              title={displayTitle}
              category={p.category_id || p.category}
              size="card"
            />
          )}

          {/* Discount / Custom Badge — top left */}
          {(discount || displayBadge) && (
            <div className="pcard__badge-stack">
              {discount ? (
                <span className="pcard__badge pcard__badge--sale">
                  <IconDiscount />
                  -{discount}%
                </span>
              ) : (
                <span className="pcard__badge pcard__badge--label">
                  {displayBadge}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── CONTENT ZONE ─────────────────────────── */}
        <div className="pcard__body">

          {/* Category & Region */}
          <div className="pcard__meta-row">
            <span className="pcard__category">{displayCategory}</span>
            <span className="pcard__region">
              <IconGlobe /> Global
            </span>
          </div>

          {/* Title */}
          <h3 className="pcard__title" title={displayTitle}>
            {displayTitle}
          </h3>

          {/* Description */}
          <p className="pcard__desc">{displayDesc}</p>

          {/* Rating & Sold */}
          <div className="pcard__trust-row">
            <div className="pcard__stars-block">
              <span className="pcard__stars-svg">
                <IconStar /><IconStar /><IconStar /><IconStar /><IconStar />
              </span>
              <span className="pcard__rating-score">{ratingValue}</span>
              <span className="pcard__rating-count">({reviewsCount})</span>
            </div>
            <span className="pcard__sold-tag">
              <IconCheck />
              {soldCount}+ sold
            </span>
          </div>

          {/* Spacer */}
          <div className="pcard__spacer" />

          {/* Price + Action */}
          <div className="pcard__footer">
            <div className="pcard__pricing">
              <span className="pcard__price">{format(price)}</span>
              {comparePrice && comparePrice > price && (
                <span className="pcard__compare">{format(comparePrice)}</span>
              )}
              {saveAmount && saveAmount > 0 && (
                <span className="pcard__save">Save {format(saveAmount)}</span>
              )}
            </div>

            <button
              type="button"
              className="pcard__btn"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              aria-label={`Add ${displayTitle} to cart`}
            >
              {isOutOfStock ? (
                <><IconBan /> Out of Stock</>
              ) : isPreorder ? (
                <><IconRocket /> Pre-Order Now</>
              ) : (
                <><IconCart /> Add to Cart</>
              )}
            </button>
          </div>

        </div>
      </div>
    </Link>
  );
}
