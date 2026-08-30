'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useCurrency } from '../../store/currencyStore';
import Link from 'next/link';
import ProductIconBanner from '../product/ProductIconBanner';
import AgreementCheckbox from '../ui/AgreementCheckbox';
import { toast } from 'react-hot-toast';

function CartItemImage({ item, size = 56 }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = item.image_url || item.thumbnail_url || item.image || (Array.isArray(item.images) ? item.images[0] : null);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 'var(--radius-md)',
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
            padding: 4
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

export default function CartDrawer({ open, onClose }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const { format } = useCurrency();
  const { items = [], removeItem, updateQuantity } = useCartStore();
  const total = (items || []).reduce((sum, i) => sum + (parseFloat(i.price || 0) * (i.quantity || 1)), 0);

  if (!open) return null;

  const handleProceedCheckout = (e) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please agree to the Terms of Service & Refund Policy');
      return;
    }
    onClose();
    router.push('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className={`cart-drawer ${open ? 'open' : ''}`} aria-label="Shopping cart">
        {/* Header */}
        <div className="cart-drawer__header" style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-primary-soft)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)'
            }}>
              <span className="icon icon--md">shopping_cart</span>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700, margin: 0 }}>
                Shopping Cart
              </h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                {items.length} {items.length === 1 ? 'item' : 'items'} ready for instant delivery
              </span>
            </div>
          </div>

          <button
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Close cart"
            style={{ width: 34, height: 34, borderRadius: '50%' }}
          >
            <span className="icon icon--md">close</span>
          </button>
        </div>

        {/* Items Container */}
        <div className="cart-drawer__items" style={{ padding: '20px 24px', overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto',
                color: 'var(--color-primary-light)'
              }}>
                <span className="icon icon--xl">shopping_bag</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, margin: '0 0 6px 0' }}>
                Your cart is empty
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '0 0 20px 0' }}>
                Explore premium licenses, subscriptions &amp; tools.
              </p>
              <Link href="/products" className="btn btn--primary btn--sm" onClick={onClose} style={{ gap: 6 }}>
                <span className="icon icon--sm">storefront</span>
                <span>Browse Products</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map(item => (
                <div
                  key={item.id || `${item.product_id}-${item.variant_id}`}
                  style={{
                    padding: 14,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center'
                  }}
                >
                  {/* Thumbnail / Product Icon */}
                  <CartItemImage item={item} size={56} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </div>

                    {item.variant_name && (
                      <div style={{ fontSize: 12, color: 'var(--color-cyan)', fontWeight: 600, marginTop: 2 }}>
                        {item.variant_name}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginTop: 8, flexWrap: 'wrap', gap: 6
                    }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 800, color: 'var(--color-accent)' }}>
                        {format(parseFloat(item.price) * (item.quantity || 1))}
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{
                        display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)',
                        border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '2px'
                      }}>
                        <button
                          className="btn btn--ghost btn--icon"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                          style={{ padding: 2, height: 22, width: 22 }}
                          aria-label="Decrease quantity"
                        >
                          <span className="icon" style={{ fontSize: 14 }}>remove</span>
                        </button>
                        <span style={{ width: 24, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                          {item.quantity || 1}
                        </span>
                        <button
                          className="btn btn--ghost btn--icon"
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                          style={{ padding: 2, height: 22, width: 22 }}
                          aria-label="Increase quantity"
                        >
                          <span className="icon" style={{ fontSize: 14 }}>add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove Item */}
                  <button
                    className="btn btn--ghost btn--icon"
                    style={{ padding: 6, alignSelf: 'flex-start', color: 'var(--color-error)' }}
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove item"
                  >
                    <span className="icon icon--sm">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer" style={{
            padding: '18px 22px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>Total Amount</span>
                <div style={{ fontSize: 11, color: 'var(--color-cyan)', fontWeight: 600 }}>Automated Dispatch</div>
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 800, color: 'var(--color-accent)' }}>
                {format(total)}
              </span>
            </div>

            {/* Policy Agreement Checkbox */}
            <div style={{ marginBottom: 14 }}>
              <AgreementCheckbox
                checked={agreed}
                onChange={setAgreed}
                mode="checkout"
              />
            </div>

            <button
              type="button"
              onClick={handleProceedCheckout}
              className="btn btn--primary btn--full"
              style={{
                gap: 8,
                height: 46,
                fontSize: 14.5,
                fontWeight: 700,
                cursor: 'pointer',
                opacity: agreed ? 1 : 0.7,
                boxShadow: agreed ? 'var(--shadow-glow)' : 'none',
                transition: 'all 0.25s ease'
              }}
            >
              <span className="icon icon--md icon--filled">bolt</span>
              <span>Proceed to Checkout</span>
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 12, marginTop: 10, fontSize: 11, color: 'var(--color-text-faint)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="icon icon--sm icon--cyan">bolt</span> Instant Delivery
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="icon icon--sm icon--accent">shield</span> Encrypted Checkout
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
