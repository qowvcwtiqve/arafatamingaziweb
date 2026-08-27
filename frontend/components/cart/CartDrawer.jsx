'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useCurrency } from '../../store/currencyStore';
import Link from 'next/link';
import ProductIconBanner from '../product/ProductIconBanner';

export default function CartDrawer({ open, onClose }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const { format } = useCurrency();
  const { items, removeItem, updateQuantity, total } = useCartStore(s => ({
    items: s.items,
    removeItem: s.removeItem,
    updateQuantity: s.updateQuantity,
    total: s.items.reduce((sum, i) => sum + (parseFloat(i.price) * (i.quantity || 1)), 0),
  }));

  if (!open) return null;

  const handleProceedCheckout = (e) => {
    e.preventDefault();
    if (!agreed) return;
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
                  <div style={{
                    width: 56, height: 56, borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', flexShrink: 0, position: 'relative',
                    border: '1px solid var(--color-border)'
                  }}>
                    <ProductIconBanner
                      title={item.title}
                      category=""
                      size="card"
                    />
                  </div>

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

            {/* Mandatory Digital Refund Agreement Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 12,
              cursor: 'pointer',
              fontSize: 11.5,
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
              userSelect: 'none',
              background: agreed ? 'rgba(27, 78, 245, 0.05)' : 'var(--color-surface-2)',
              padding: '8px 10px',
              borderRadius: '8px',
              border: agreed ? '1px solid rgba(27, 78, 245, 0.3)' : '1px solid var(--color-border)',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#1B4EF5', cursor: 'pointer', width: 15, height: 15, flexShrink: 0 }}
              />
              <span>
                I agree to the <Link href="/terms" onClick={onClose} style={{ color: '#1B4EF5', textDecoration: 'underline', fontWeight: 600 }}>Terms</Link> &amp; <Link href="/refund" onClick={onClose} style={{ color: '#1B4EF5', textDecoration: 'underline', fontWeight: 600 }}>Refund Policy</Link> (Digital goods are non-refundable once delivered).
              </span>
            </label>

            <button
              type="button"
              disabled={!agreed}
              onClick={handleProceedCheckout}
              className={`btn btn--primary btn--full ${!agreed ? 'btn--disabled' : ''}`}
              style={{
                gap: 8,
                height: 46,
                fontSize: 14.5,
                fontWeight: 700,
                opacity: agreed ? 1 : 0.45,
                cursor: agreed ? 'pointer' : 'not-allowed',
                boxShadow: agreed ? 'var(--shadow-glow)' : 'none'
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
