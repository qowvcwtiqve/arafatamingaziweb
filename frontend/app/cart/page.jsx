'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useCurrency } from '../../store/currencyStore';
import Link from 'next/link';
import ProductIconBanner from '../../components/product/ProductIconBanner';
import AgreementCheckbox from '../../components/ui/AgreementCheckbox';

function CartItemImage({ item, size = 76 }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = item.image_url || item.thumbnail_url || item.image || (Array.isArray(item.images) ? item.images[0] : null);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      border: '1px solid var(--color-border)',
      background: 'var(--color-surface-2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {imgUrl && !imgError ? (
        <img
          src={imgUrl}
          alt={item.title || 'Product'}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: 6
          }}
        />
      ) : (
        <ProductIconBanner
          title={item.title}
          category={item.category || ''}
          size="thumb"
        />
      )}
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const { format } = useCurrency();
  const { items = [], removeItem, updateQuantity } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = (items || []).reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || 1)), 0);

  const handleProceedCheckout = (e) => {
    e.preventDefault();
    if (!agreed) return;
    router.push('/checkout');
  };

  if (!mounted) {
    return (
      <div style={{ paddingTop: 'calc(var(--header-height) + 60px)', minHeight: '80vh', textAlign: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 30px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="icon icon--sm icon--cyan">shopping_cart</span>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
              Order Review
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, margin: 0 }}>
            Your <span className="text-gradient">Cart</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 6, margin: 0 }}>
            Review your digital items before proceeding to instant payment
          </p>
        </div>

        {items.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)'
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto',
              color: 'var(--color-primary-light)'
            }}>
              <span className="icon icon--xl">shopping_cart</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Your cart is empty
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px auto' }}>
              Explore our verified digital licenses, streaming subscriptions, and developer tools.
            </p>
            <Link href="/products" className="btn btn--primary btn--md" style={{ gap: 8 }}>
              <span className="icon icon--sm">storefront</span>
              <span>Explore Store</span>
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            alignItems: 'start'
          }}>
            
            {/* Left: Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {items.map(item => (
                <div
                  key={item.id || `${item.product_id}-${item.variant_id}`}
                  style={{
                    padding: 20,
                    borderRadius: 'var(--radius-xl)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {/* Visual Graphic Thumbnail */}
                  <CartItemImage item={item} size={76} />

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
                      margin: '0 0 4px 0', color: 'var(--color-text)'
                    }}>
                      {item.title}
                    </h3>

                    {item.variant_name && (
                      <div style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 212, 255, 0.1)', color: 'var(--color-cyan)',
                        fontSize: 12, fontWeight: 600, marginBottom: 8
                      }}>
                        {item.variant_name}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 10, marginTop: 4
                    }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, color: 'var(--color-accent)' }}>
                        {format(parseFloat(item.price) * (item.quantity || 1))}
                      </div>

                      {/* Quantity Modifier */}
                      <div style={{
                        display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '2px 4px'
                      }}>
                        <button
                          className="btn btn--ghost btn--icon"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                          style={{ width: 28, height: 28 }}
                          aria-label="Decrease quantity"
                        >
                          <span className="icon" style={{ fontSize: 16 }}>remove</span>
                        </button>
                        <span style={{ width: 32, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
                          {item.quantity || 1}
                        </span>
                        <button
                          className="btn btn--ghost btn--icon"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                          style={{ width: 28, height: 28 }}
                          aria-label="Increase quantity"
                        >
                          <span className="icon" style={{ fontSize: 16 }}>add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    className="btn btn--ghost btn--icon"
                    style={{ color: 'var(--color-error)' }}
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <span className="icon icon--md">delete</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Right: Order Summary Card */}
            <div style={{ position: 'sticky', top: 90 }}>
              <div style={{
                padding: 28,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
              }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, marginBottom: 20 }}>
                  Order Summary
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Items Count</span>
                    <span style={{ fontWeight: 700 }}>{items.length} items</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Delivery Method</span>
                    <span style={{ color: 'var(--color-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="icon icon--sm icon--filled">bolt</span> Automated Instant
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Service / Tax Fee</span>
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>Free</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Total Price</span>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800, color: 'var(--color-accent)' }}>
                      {format(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Mandatory Digital Refund Agreement Checkbox */}
                <AgreementCheckbox
                  checked={agreed}
                  onChange={setAgreed}
                  mode="checkout"
                  style={{ marginBottom: 16 }}
                />

                <button
                  type="button"
                  disabled={!agreed}
                  onClick={handleProceedCheckout}
                  className={`btn btn--primary btn--full btn--lg ${!agreed ? 'btn--disabled' : ''}`}
                  style={{
                    gap: 8,
                    marginBottom: 16,
                    opacity: agreed ? 1 : 0.45,
                    cursor: agreed ? 'pointer' : 'not-allowed',
                    boxShadow: agreed ? 'var(--shadow-glow)' : 'none'
                  }}
                >
                  <span className="icon icon--md icon--filled">bolt</span>
                  <span>Proceed to Checkout</span>
                </button>

                <div style={{
                  padding: 14, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8,
                  fontSize: 12, color: 'var(--color-text-muted)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="icon icon--sm icon--cyan">check_circle</span>
                    <span>Instant automatic credential generation</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="icon icon--sm icon--accent">shield</span>
                    <span>Encrypted UPI, Crypto &amp; Binance Pay</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
