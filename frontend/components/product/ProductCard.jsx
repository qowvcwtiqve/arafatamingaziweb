import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import toast from 'react-hot-toast';
import ProductIconBanner from './ProductIconBanner';

export default function ProductCard({ product: p }) {
  const addItem = useCartStore(s => s.addItem);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: p.id,
      title: p.title || p.name,
      price: p.min_price || 0,
      thumbnail_url: p.images?.[0] || '',
      seller_name: 'QuantumXD Store',
    });
    toast.success('Added to cart');
  };

  const price = p.min_price || 0;
  const comparePrice = p.compare_price;
  const discount = comparePrice && comparePrice > price 
    ? Math.round((1 - price / comparePrice) * 100) 
    : null;

  const isPreorder = p.is_preorder || p.badge?.toLowerCase().includes('pre-order') || p.badge?.toLowerCase().includes('preorder');
  const isOutOfStock = !p.in_stock && !isPreorder && p.total_stock === 0;

  return (
    <Link href={`/products/${p.id}`} style={{ textDecoration: 'none' }}>
      <div className="product-card">
        {/* Thumbnail */}
        <div className="product-card__image" style={{ position: 'relative' }}>
          <ProductIconBanner title={p.title || p.name} category={p.category_id || p.category} size="card" />

          {/* Top Overlays: Sale discount & Pre-order */}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 2 }}>
            {discount && (
              <span style={{
                background: 'var(--color-error)', color: '#fff',
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                -{discount}%
              </span>
            )}
            {isPreorder && (
              <span style={{
                background: 'linear-gradient(135deg, #6E3AFF 0%, #00D4FF 100%)', color: '#fff',
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                boxShadow: '0 2px 8px rgba(110,58,255,0.3)'
              }}>
                PRE-ORDER
              </span>
            )}
          </div>

          {/* Delivery & Stock Ribbon over bottom of thumbnail */}
          <div style={{
            position: 'absolute', bottom: 8, left: 8, right: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(13, 17, 23, 0.88)', backdropFilter: 'blur(8px)',
            borderRadius: 'var(--radius-sm)', padding: '5px 8px', fontSize: 11, fontWeight: 600,
            color: '#fff', border: '1px solid var(--color-border)'
          }}>
            {/* Delivery Process & Timing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {p.delivery_process === 'manual' ? (
                <>
                  <span className="icon icon--sm icon--cyan">support_agent</span>
                  <span style={{ color: 'var(--color-text)' }}>Manual ({p.delivery_time || '24h'})</span>
                </>
              ) : (
                <>
                  <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
                  <span style={{ color: 'var(--color-accent)' }}>Instant Auto</span>
                </>
              )}
            </div>

            {/* Stock status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isPreorder ? (
                <span style={{ color: 'var(--color-primary-light)' }}>Pre-Order</span>
              ) : isOutOfStock ? (
                <span style={{ color: 'var(--color-error)' }}>Out of Stock</span>
              ) : p.total_stock < 9999 ? (
                <span style={{ color: 'var(--color-success)' }}>{p.total_stock} left</span>
              ) : (
                <span style={{ color: 'var(--color-success)' }}>In Stock</span>
              )}
            </div>
          </div>
        </div>

        <div className="product-card__body">
          {/* Badges */}
          <div className="product-card__badges">
            {p.is_featured && <span className="badge badge--featured">Featured</span>}
            {p.badge && <span className="badge badge--new">{p.badge}</span>}
          </div>

          <h3 className="product-card__title">{p.title || p.name}</h3>
          <p className="product-card__desc" style={{
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, color: 'var(--color-text-muted)'
          }}>
            {p.description}
          </p>

          {/* Meta (Rating & Category / Verification) */}
          <div className="product-card__meta">
            <span className="product-card__meta-item">
              <span className="icon icon--sm icon--cyan icon--filled">verified</span>
              <span>Verified Asset</span>
            </span>
            {p.rating_count > 0 && (
              <span className="product-card__meta-item">
                <span className="icon icon--sm" style={{ color: '#f59e0b', fontVariationSettings: "'FILL' 1" }}>star</span>
                {parseFloat(p.rating_avg).toFixed(1)} ({p.rating_count})
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="product-card__footer">
            <div>
              <span className="product-card__price" style={comparePrice ? { color: 'var(--color-accent)' } : {}}>
                ₹{price.toLocaleString('en-IN')}
              </span>
              {comparePrice && (
                <span className="product-card__price--original">
                  ₹{comparePrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleAddToCart}
              aria-label={`Add ${p.title} to cart`}
              disabled={isOutOfStock}
              style={{ gap: 6 }}
            >
              <span className="icon icon--sm">shopping_cart</span>
              <span>{isPreorder ? 'Pre-Order' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
