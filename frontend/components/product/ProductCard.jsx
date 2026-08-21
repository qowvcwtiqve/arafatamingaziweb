'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductCard({ product: p }) {
  const addItem = useCartStore(s => s.addItem);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: p.id,
      title: p.title,
      price: p.sale_price || p.price,
      thumbnail_url: p.thumbnail_url,
      seller_name: p.seller_name,
    });
    toast.success('Added to cart');
  };

  const price = parseFloat(p.price);
  const salePrice = p.sale_price ? parseFloat(p.sale_price) : null;
  const discount = salePrice ? Math.round((1 - salePrice / price) * 100) : null;

  return (
    <Link href={`/products/${p.slug}`} style={{ textDecoration: 'none' }}>
      <div className="product-card">
        {/* Thumbnail */}
        <div className="product-card__image" style={{ position: 'relative' }}>
          {p.thumbnail_url ? (
            <Image
              src={p.thumbnail_url}
              alt={p.title}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="product-card__image-placeholder">
              <span className="icon icon--xl">package_2</span>
            </div>
          )}
          {discount && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'var(--color-error)', color: '#fff',
              padding: '3px 8px', borderRadius: 6,
              fontSize: 12, fontWeight: 700,
            }}>
              -{discount}%
            </div>
          )}
        </div>

        <div className="product-card__body">
          {/* Badges */}
          <div className="product-card__badges">
            {p.is_featured && <span className="badge badge--featured">Featured</span>}
            {isNew(p.created_at) && <span className="badge badge--new">New</span>}
            {salePrice && <span className="badge badge--sale">Sale</span>}
          </div>

          <h3 className="product-card__title">{p.title}</h3>
          {p.short_desc && <p className="product-card__desc">{p.short_desc}</p>}

          {/* Meta */}
          <div className="product-card__meta">
            <span className="product-card__meta-item">
              <span className="icon icon--sm icon--muted">download</span>
              {(p.downloads_count || 0).toLocaleString()}
            </span>
            {p.rating_count > 0 && (
              <span className="product-card__meta-item">
                <span className="icon icon--sm icon--filled" style={{ color: '#f59e0b', fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
                {parseFloat(p.rating_avg).toFixed(1)} ({p.rating_count})
              </span>
            )}
            {p.seller_name && (
              <span className="product-card__meta-item">
                <span className="icon icon--sm icon--muted">person</span>
                {p.seller_name}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="product-card__footer">
            <div>
              <span className="product-card__price" style={salePrice ? { color: 'var(--color-accent)' } : {}}>
                ₹{(salePrice || price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {salePrice && (
                <span className="product-card__price--original">
                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleAddToCart}
              aria-label={`Add ${p.title} to cart`}
            >
              <span className="icon icon--sm">add_shopping_cart</span>
              Add
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function isNew(dateStr) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) < 7 * 24 * 60 * 60 * 1000;
}
