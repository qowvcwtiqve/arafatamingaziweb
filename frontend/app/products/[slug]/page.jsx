'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../lib/api';
import { useCartStore } from '../../../store/cartStore';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore(s => s.addItem);

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api.get(`/products/${slug}`)
      .then(({ data }) => {
        setProduct(data.product);
        setVariants(data.variants || []);
        setReviews(data.reviews || []);
        if (data.variants?.length) setSelectedVariant(data.variants[0]);
      })
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '100px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            <div className="skeleton" style={{ width: '100%', paddingTop: '56.25%', borderRadius: 16 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="skeleton" style={{ height: 36, width: '80%' }} />
              <div className="skeleton" style={{ height: 20, width: '60%' }} />
              <div className="skeleton" style={{ height: 100, width: '100%' }} />
              <div className="skeleton" style={{ height: 48, width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const price = parseFloat(selectedVariant?.price || product.sale_price || product.price);
  const originalPrice = parseFloat(product.price);
  const discount = product.sale_price && !selectedVariant
    ? Math.round((1 - parseFloat(product.sale_price) / originalPrice) * 100)
    : null;

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      title: product.title,
      variant_name: selectedVariant?.name || null,
      price,
      thumbnail_url: product.thumbnail_url,
    });
    toast.success('Added to cart');
  };

  const images = [product.thumbnail_url, ...(product.preview_images || [])].filter(Boolean);

  return (
    <div style={{ padding: '100px 0 60px' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontSize: 14, color: 'var(--color-text-faint)' }}>
          <a href="/" style={{ color: 'var(--color-text-faint)' }}>Home</a>
          <span className="icon icon--sm">chevron_right</span>
          <a href="/products" style={{ color: 'var(--color-text-faint)' }}>Products</a>
          <span className="icon icon--sm">chevron_right</span>
          <span style={{ color: 'var(--color-text-muted)' }}>{product.title}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, alignItems: 'start' }}>
          {/* Images */}
          <div>
            <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-border)', marginBottom: 12, position: 'relative', paddingTop: '56.25%' }}>
              {images[activeImage] ? (
                <Image src={images[activeImage]} alt={product.title} fill style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary-soft)', color: 'var(--color-primary)' }}>
                  <span className="icon" style={{ fontSize: 72 }}>package_2</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    style={{
                      width: 72, height: 48, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === activeImage ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      cursor: 'pointer', background: 'var(--color-surface-2)', position: 'relative',
                    }}
                  >
                    <Image src={img} alt="" fill style={{ objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ position: 'sticky', top: 90 }}>
            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {product.is_featured && <span className="badge badge--featured">Featured</span>}
              {product.category && <span className="badge badge--new" style={{ textTransform: 'capitalize' }}>{product.category}</span>}
              {discount && <span className="badge badge--sale">-{discount}% Off</span>}
            </div>

            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, marginBottom: 12, lineHeight: 1.2 }}>{product.title}</h1>

            {/* Rating & Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {product.rating_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className="icon" style={{ fontSize: 16, color: s <= Math.round(product.rating_avg) ? '#f59e0b' : 'var(--color-text-faint)', fontVariationSettings: s <= Math.round(product.rating_avg) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  ))}
                  <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 4 }}>
                    {parseFloat(product.rating_avg).toFixed(1)} ({product.rating_count} reviews)
                  </span>
                </div>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-text-faint)' }}>
                <span className="icon icon--sm">download</span>
                {(product.downloads_count || 0).toLocaleString()} downloads
              </span>
            </div>

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 36, fontWeight: 700, color: 'var(--color-accent)' }}>
                ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
              {product.sale_price && !selectedVariant && (
                <span style={{ fontSize: 18, color: 'var(--color-text-faint)', textDecoration: 'line-through', marginLeft: 10 }}>
                  ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              )}
            </div>

            {/* Variants */}
            {variants.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="form-label" style={{ marginBottom: 10 }}>Select Plan</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-md)',
                        border: `1px solid ${selectedVariant?.id === v.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: selectedVariant?.id === v.id ? 'rgba(110,58,255,0.12)' : 'var(--color-surface-2)',
                        color: selectedVariant?.id === v.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                        cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'var(--transition-fast)',
                      }}
                    >
                      {v.name} — ₹{parseFloat(v.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={handleAddToCart}>
                <span className="icon icon--md">add_shopping_cart</span>
                Add to Cart
              </button>
              {product.demo_url && (
                <a href={product.demo_url} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                  <span className="icon icon--md">preview</span>
                  Demo
                </a>
              )}
            </div>

            {/* Trust badges */}
            <div style={{ padding: 14, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              {[
                { icon: 'bolt', text: 'Instant delivery after payment' },
                { icon: 'lock', text: 'Secure checkout (UPI / Crypto / Binance)' },
                { icon: 'verified', text: 'Quality verified product' },
              ].map(t => (
                <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <span className="icon icon--sm" style={{ color: 'var(--color-accent)' }}>{t.icon}</span>
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
              Product Description
            </h2>
            <div className="card card--elevated" style={{ padding: 32 }}>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {product.description}
              </p>
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
              Customer Reviews ({reviews.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map(r => (
                <div key={r.id} className="card card--elevated" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {(r.reviewer_name || 'A')[0]}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14 }}>{r.reviewer_name}</p>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => (
                            <span key={s} className="icon" style={{ fontSize: 12, color: s <= r.rating ? '#f59e0b' : 'var(--color-text-faint)', fontVariationSettings: s <= r.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.title && <p style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</p>}
                  {r.body && <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{r.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
