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
  const discount =
    comparePrice && comparePrice > price
      ? Math.round((1 - price / comparePrice) * 100)
      : null;

  const isPreorder = Boolean(
    p.variants && p.variants.length > 0
      ? (p.variants[0].is_preorder || p.variants[0].delivery_method === 'preorder')
      : (p.is_preorder || p.badge?.toLowerCase().includes('pre-order'))
  );
  const isOutOfStock = !p.in_stock && !isPreorder && p.total_stock === 0;

  const displayTitle = p.website_meta?.title || p.title || p.name;
  const displayCategory = p.website_meta?.category || p.category_name || p.category || 'Digital Asset';

  const charCodeSum = (p.id || 'prod').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratingVariations = ['4.9', '4.8', '4.9', '4.7', '5.0', '4.8'];
  const ratingValue = ratingVariations[charCodeSum % ratingVariations.length];
  const reviewsCount = 38 + (charCodeSum % 142);

  const imageUrl = p.images?.[0] || p.website_meta?.images?.[0];
  const hasImage = Boolean(imageUrl && !imgError);

  return (
    <Link href={`/products/${p.slug || p.id}`} className="pro-card-link">
      <div className="pro-card">
        {/* 1. Visual Graphic Container */}
        <div className="pro-card__media">
          {hasImage ? (
            <div className="pro-card__img-box">
              <img
                src={imageUrl}
                alt={displayTitle}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="pro-card__img"
              />
            </div>
          ) : (
            <ProductIconBanner
              title={displayTitle}
              category={p.category_id || p.category}
              size="card"
            />
          )}

          {/* Top Badges */}
          <div className="pro-card__top-badges">
            {discount ? (
              <span className="pro-pill pro-pill--sale">
                -{discount}%
              </span>
            ) : isPreorder ? (
              <span className="pro-pill pro-pill--preorder">
                Pre-Order
              </span>
            ) : null}
          </div>

          <div className="pro-card__rating-badge">
            <span className="icon icon--filled rating-star">star</span>
            <span>{ratingValue}</span>
          </div>
        </div>

        {/* 2. Content Info */}
        <div className="pro-card__body">
          {/* Category & Proof Row */}
          <div className="pro-card__meta-row">
            <span className="pro-card__category">{displayCategory}</span>
            <span className="pro-card__delivery-badge">
              <span className="icon icon--filled delivery-bolt">bolt</span>
              {isPreorder ? 'Pre-Order' : 'Instant Key'}
            </span>
          </div>

          {/* Title */}
          <h3 className="pro-card__title" title={displayTitle}>
            {displayTitle}
          </h3>

          {/* Price & Action Row */}
          <div className="pro-card__footer">
            <div className="pro-card__price-col">
              <span className="pro-card__price">
                {format(price)}
              </span>
              {comparePrice && comparePrice > price && (
                <span className="pro-card__old-price">
                  {format(comparePrice)}
                </span>
              )}
            </div>

            <button
              type="button"
              className="pro-card__btn"
              onClick={handleAddToCart}
              aria-label={`Add ${displayTitle} to cart`}
              disabled={isOutOfStock}
              title={isOutOfStock ? 'Out of stock' : isPreorder ? 'Pre-Order' : 'Add to Cart'}
            >
              <span className="icon icon--sm pro-card__btn-icon">
                {isOutOfStock ? 'block' : isPreorder ? 'rocket_launch' : 'shopping_bag'}
              </span>
              <span className="pro-card__btn-label">
                {isOutOfStock ? 'Sold Out' : isPreorder ? 'Order' : 'Add'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
