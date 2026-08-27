'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import { useCurrency } from '../../store/currencyStore';
import toast from 'react-hot-toast';
import ProductIconBanner from './ProductIconBanner';

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

  const displayTitle = p.website_meta?.title || p.title || p.name;
  const displayCategory = p.website_meta?.category || p.category_name || p.category || 'Digital Key';
  const displayBadge = p.website_meta?.badge || p.badge;
  const displayDesc =
    p.website_meta?.short_description ||
    p.website_meta?.description ||
    p.short_description ||
    p.description ||
    'Instant automated digital activation & verified license.';

  // Deterministic social proof metrics
  const seed = (p.id || 'prod').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratings = ['4.9', '4.8', '4.9', '4.7', '5.0', '4.8'];
  const ratingValue = ratings[seed % ratings.length];
  const reviewsCount = 48 + (seed % 160);
  const soldCount = 140 + (seed % 380);

  const imageUrl = p.images?.[0] || p.website_meta?.images?.[0];
  const hasImage = Boolean(imageUrl && !imgError);

  const btnLabel = isOutOfStock ? 'Out of Stock' : isPreorder ? '🚀 Pre-Order' : '🛒 Add to Cart';

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

          {/* Discount / Custom Badge — top left only */}
          {(discount || displayBadge) && (
            <div className="pcard__badge-stack">
              {discount ? (
                <span className="pcard__badge pcard__badge--sale">
                  🔥 -{discount}%
                </span>
              ) : (
                <span className="pcard__badge pcard__badge--label">
                  {displayBadge}
                </span>
              )}
            </div>
          )}

          {/* Pre-Order top-right indicator */}
          {isPreorder && (
            <span className="pcard__preorder-tag">PRE-ORDER</span>
          )}
        </div>

        {/* ── CONTENT ZONE ─────────────────────────── */}
        <div className="pcard__body">

          {/* Category & Region */}
          <div className="pcard__meta-row">
            <span className="pcard__category">{displayCategory}</span>
            <span className="pcard__region">🌐 Global</span>
          </div>

          {/* Title */}
          <h3 className="pcard__title" title={displayTitle}>
            {displayTitle}
          </h3>

          {/* Description */}
          <p className="pcard__desc">{displayDesc}</p>

          {/* Rating & Sold — clean inline row */}
          <div className="pcard__trust-row">
            <div className="pcard__stars-block">
              <span className="pcard__stars">★★★★★</span>
              <span className="pcard__rating-score">{ratingValue}</span>
              <span className="pcard__rating-count">({reviewsCount})</span>
            </div>
            <span className="pcard__sold-tag">{soldCount}+ sold</span>
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
              {btnLabel}
            </button>
          </div>

        </div>
      </div>
    </Link>
  );
}
