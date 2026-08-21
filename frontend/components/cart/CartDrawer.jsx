'use client';
import { useCartStore } from '../../store/cartStore';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer({ open, onClose }) {
  const { items, removeItem, total } = useCartStore(s => ({
    items: s.items,
    removeItem: s.removeItem,
    total: s.items.reduce((sum, i) => sum + parseFloat(i.price), 0),
  }));

  if (!open) return null;

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
        <div className="cart-drawer__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="icon icon--lg">shopping_cart</span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700 }}>
              Cart
              {items.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--color-text-faint)', fontWeight: 400 }}>
                  ({items.length} item{items.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
          </div>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close cart">
            <span className="icon icon--md">close</span>
          </button>
        </div>

        {/* Items */}
        <div className="cart-drawer__items">
          {items.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <span className="icon icon--xl empty-state__icon" style={{ fontSize: 56 }}>shopping_cart</span>
              <p className="empty-state__title" style={{ fontSize: 18 }}>Cart is empty</p>
              <p className="empty-state__desc" style={{ fontSize: 14 }}>Browse our products and add something!</p>
              <Link href="/products" className="btn btn--primary btn--sm" onClick={onClose}>
                Browse Products
              </Link>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="cart-item">
                {/* Thumbnail */}
                <div className="cart-item__image" style={{ width: 56, height: 56, position: 'relative', flexShrink: 0 }}>
                  {item.thumbnail_url ? (
                    <Image src={item.thumbnail_url} alt={item.title} fill style={{ objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: 6, background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="icon icon--md" style={{ color: 'var(--color-text-faint)' }}>package_2</span>
                    </div>
                  )}
                </div>

                <div className="cart-item__info">
                  <p className="cart-item__title">{item.title}</p>
                  {item.variant_name && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>{item.variant_name}</p>
                  )}
                  <p className="cart-item__price">₹{parseFloat(item.price).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                </div>

                <button
                  className="btn btn--ghost btn--icon"
                  style={{ padding: 6, alignSelf: 'flex-start' }}
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                >
                  <span className="icon icon--sm" style={{ color: 'var(--color-error)' }}>delete</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer__footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700 }}>
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <Link
              href="/checkout"
              className="btn btn--primary btn--full"
              onClick={onClose}
            >
              <span className="icon icon--md">payments</span>
              Proceed to Checkout
            </Link>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-faint)', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <span className="icon icon--sm">lock</span>
              Secure checkout — UPI, Crypto, Binance Pay
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
