'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { useCartStore } from '../../../store/cartStore';
import toast from 'react-hot-toast';
import ProductIconBanner from '../../../components/product/ProductIconBanner';
import ProductCard from '../../../components/product/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore(s => s.addItem);

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`)
      .then(({ data }) => {
        const prod = data.product;
        setProduct(prod);
        setVariants(prod?.variants || []);
        setReviews(prod?.reviews || []);
        if (prod?.variants?.length) {
          setSelectedVariant(prod.variants[0]);
        }

        // Fetch related products
        if (prod?.category_id || prod?.category) {
          api.get(`/products?category=${prod.category_id || prod.category}&limit=4`)
            .then(res => {
              const filtered = (res.data.products || []).filter(p => p.id !== prod.id);
              setRelatedProducts(filtered.slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Product fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ padding: '120px 0 60px' }}>
        <div className="container">
          <div className="product-detail-skeleton-grid">
            <div className="skeleton" style={{ width: '100%', paddingTop: '65%', borderRadius: 20 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="skeleton" style={{ height: 40, width: '85%' }} />
              <div className="skeleton" style={{ height: 24, width: '50%' }} />
              <div className="skeleton" style={{ height: 60, width: '40%' }} />
              <div className="skeleton" style={{ height: 120, width: '100%' }} />
              <div className="skeleton" style={{ height: 52, width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: '140px 0', textAlign: 'center' }}>
        <div className="container">
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto',
            color: 'var(--color-primary-light)'
          }}>
            <span className="icon icon--xl">search_off</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
            Product Not Found
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            The requested item could not be located or may have been unlisted.
          </p>
          <Link href="/products" className="btn btn--primary btn--md" style={{ gap: 6 }}>
            <span className="icon icon--sm">storefront</span>
            <span>Back to Store</span>
          </Link>
        </div>
      </div>
    );
  }

  const price = parseFloat(selectedVariant?.price || product.min_price || 0);
  const comparePrice = parseFloat(selectedVariant?.compare_price || product.compare_price || 0);
  const discount = comparePrice && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100)
    : null;

  const isPreorder = selectedVariant
    ? Boolean(selectedVariant.is_preorder)
    : Boolean(product.is_preorder);
  const inStock = selectedVariant ? Boolean(selectedVariant.in_stock) : Boolean(product.in_stock);
  const isOutOfStock = !inStock && !isPreorder;

  const deliveryMethodText = (selectedVariant?.delivery_method || product.delivery_process) === 'manual'
    ? 'Manual Delivery'
    : 'Automated Instant Delivery';

  const deliveryTimeText = selectedVariant?.delivery_time || product.delivery_time || 'Instant';

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('This item is currently out of stock.');
      return;
    }
    addItem({
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      title: product.title,
      variant_name: selectedVariant?.name || null,
      price,
      quantity,
      thumbnail_url: product.images?.[0] || '',
    });
    toast.success(isPreorder ? 'Pre-Order added to cart' : 'Added to cart');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const productRules = (selectedVariant?.rules || product.rules || '').trim();
  const hasRules = Boolean(productRules);

  const availableTabs = [
    { id: 'overview', label: 'Product Overview', icon: 'description' },
    ...(hasRules ? [{ id: 'rules', label: 'Usage Rules & Terms', icon: 'gavel' }] : []),
    { id: 'delivery', label: 'How Delivery Works', icon: 'route' },
    { id: 'reviews', label: `Reviews (${reviews.length})`, icon: 'rate_review' },
  ];

  // If currently on rules tab but rules don't exist, fallback to overview
  const currentTab = !hasRules && activeTab === 'rules' ? 'overview' : activeTab;

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 24px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* Top Breadcrumb & Status Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 28, fontSize: 13
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-faint)' }}>
            <Link href="/" style={{ color: 'var(--color-text-faint)', textDecoration: 'none' }}>Home</Link>
            <span className="icon icon--sm">chevron_right</span>
            <Link href="/products" style={{ color: 'var(--color-text-faint)', textDecoration: 'none' }}>Store</Link>
            {product.category_id && (
              <>
                <span className="icon icon--sm">chevron_right</span>
                <Link href={`/products?category=${product.category_id}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                  {product.category || 'Category'}
                </Link>
              </>
            )}
            <span className="icon icon--sm">chevron_right</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{product.title}</span>
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
            background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)',
            fontSize: 12, fontWeight: 700, color: 'var(--color-cyan)'
          }}>
            <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
            <span>Automated 24/7 Dispatch</span>
          </div>
        </div>

        {/* Main Product Showcase Grid */}
        <div className="product-detail-grid" style={{ marginBottom: 60 }}>
          
          {/* LEFT COLUMN: Visual Showcase & Guarantees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Visual Graphic Banner */}
            <div style={{
              borderRadius: 'var(--radius-xl, 20px)',
              overflow: 'hidden',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              position: 'relative',
              paddingTop: '62%',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6), 0 0 30px rgba(110, 58, 255, 0.15)'
            }}>
              <ProductIconBanner
                title={product.title || product.name}
                category={product.category_id || product.category}
                size="detail"
              />
            </div>

            {/* 3 Guarantee Highlights Pods */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12
            }}>
              <div style={{
                padding: 14, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span className="icon icon--md icon--cyan icon--filled">bolt</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Instant Auto</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Direct Credential Delivery</div>
                </div>
              </div>

              <div style={{
                padding: 14, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span className="icon icon--md icon--primary">verified_user</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>100% Genuine</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Tested &amp; Quality Checked</div>
                </div>
              </div>

              <div style={{
                padding: 14, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span className="icon icon--md icon--accent">support_agent</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>24/7 Support</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Telegram &amp; Helpdesk</div>
                </div>
              </div>
            </div>

            {/* Accepted Payment Strip */}
            <div style={{
              padding: '14px 18px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
            }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-faint)', fontWeight: 600 }}>
                Instant Payment Via:
              </span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-cyan)' }}>
                  <span className="icon icon--sm">account_balance</span> UPI QR
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                  <span className="icon icon--sm">currency_bitcoin</span> Crypto
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#F0B90B' }}>
                  <span className="icon icon--sm">account_balance_wallet</span> Binance Pay
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Configurator & Action Center */}
          <div style={{ position: 'sticky', top: 90 }}>
            
            {/* Badges Bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {product.is_featured && <span className="badge badge--featured">Featured</span>}
              {product.badge && <span className="badge badge--new">{product.badge}</span>}
              {product.category && <span className="badge badge--new" style={{ textTransform: 'capitalize' }}>{product.category}</span>}
              {discount && <span className="badge badge--sale">-{discount}% Off</span>}
              {isPreorder && (
                <span className="badge" style={{ background: 'linear-gradient(135deg, #6E3AFF 0%, #00D4FF 100%)', color: '#fff' }}>
                  Pre-Order
                </span>
              )}
            </div>

            {/* Main Title */}
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 800,
              lineHeight: 1.2,
              margin: '0 0 12px 0',
              color: 'var(--color-text)'
            }}>
              {product.title}
            </h1>

            {/* Rating & Sold count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {product.rating_count > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className="icon" style={{ fontSize: 16, color: s <= Math.round(product.rating_avg) ? '#f59e0b' : 'var(--color-text-faint)', fontVariationSettings: s <= Math.round(product.rating_avg) ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                  ))}
                  <span style={{ fontSize: 14, color: 'var(--color-text-muted)', marginLeft: 4, fontWeight: 600 }}>
                    {parseFloat(product.rating_avg).toFixed(1)} ({product.rating_count} reviews)
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#f59e0b' }}>
                  <span className="icon icon--sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span style={{ fontWeight: 600 }}>5.0 Top Rated</span>
                </div>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-cyan)', fontWeight: 600 }}>
                <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
                Instant Delivery
              </span>
            </div>

            {/* Price Box */}
            <div style={{
              padding: '18px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(30px, 4vw, 40px)',
                  fontWeight: 800,
                  color: 'var(--color-accent)',
                  lineHeight: 1
                }}>
                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
                {comparePrice > price && (
                  <span style={{
                    fontSize: 20,
                    color: 'var(--color-text-faint)',
                    textDecoration: 'line-through',
                    fontWeight: 500
                  }}>
                    ₹{comparePrice.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                )}
              </div>

              {discount && (
                <div style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-error)', fontSize: 13, fontWeight: 700
                }}>
                  Save {discount}%
                </div>
              )}
            </div>

            {/* Plan / Variant Selector Cards */}
            {variants.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 10, fontSize: 13, fontWeight: 700, color: 'var(--color-text)'
                }}>
                  <span>Select Plan / License</span>
                  <span style={{ color: 'var(--color-text-faint)', fontWeight: 500 }}>
                    {variants.length} available options
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {variants.map(v => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: isSelected ? 'rgba(110, 58, 255, 0.12)' : 'var(--color-surface)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 0 20px rgba(110, 58, 255, 0.2)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="icon icon--md" style={{
                            color: isSelected ? 'var(--color-primary-light)' : 'var(--color-text-faint)',
                            fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0"
                          }}>
                            {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                          <div>
                            <div style={{
                              fontSize: 14, fontWeight: 700,
                              color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)'
                            }}>
                              {v.name}
                            </div>
                            <div style={{
                              fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2,
                              display: 'flex', alignItems: 'center', gap: 8
                            }}>
                              {v.is_preorder ? (
                                <span style={{ color: 'var(--color-primary-light)' }}>Pre-Order</span>
                              ) : v.is_infinite ? (
                                <span style={{ color: 'var(--color-cyan)' }}>Instant Auto Stock</span>
                              ) : v.stock > 0 ? (
                                <span style={{ color: 'var(--color-success)' }}>{v.stock} in stock</span>
                              ) : (
                                <span style={{ color: 'var(--color-error)' }}>Out of stock</span>
                              )}
                              <span>•</span>
                              <span>{v.delivery_time || 'Instant'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{
                          fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800,
                          color: isSelected ? 'var(--color-accent)' : 'var(--color-text)'
                        }}>
                          ₹{parseFloat(v.price).toLocaleString('en-IN')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4 Technical Specs Grid */}
            <div style={{
              padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', marginBottom: 24, display: 'grid',
              gridTemplateColumns: '1fr 1fr', gap: 14
            }}>
              {/* Delivery timing */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 212, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="icon icon--sm icon--cyan">schedule</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Delivery Time</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{deliveryTimeText}</div>
                </div>
              </div>

              {/* Delivery process */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(110, 58, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="icon icon--sm icon--primary icon--filled">bolt</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Delivery Method</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{deliveryMethodText}</div>
                </div>
              </div>

              {/* Stock Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: isPreorder ? 'rgba(110, 58, 255, 0.1)' : inStock ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="icon icon--sm" style={{ color: isPreorder ? 'var(--color-primary-light)' : inStock ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {isPreorder ? 'update' : inStock ? 'inventory_2' : 'do_not_disturb'}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Stock Status</div>
                  <div style={{ fontWeight: 700, color: isPreorder ? 'var(--color-primary-light)' : inStock ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {isPreorder
                      ? 'Pre-Order Active'
                      : selectedVariant?.is_infinite
                      ? 'Instant Ready (Unlimited)'
                      : selectedVariant?.stock > 0
                      ? `${selectedVariant.stock} units left`
                      : inStock
                      ? 'In Stock'
                      : 'Out of Stock'}
                  </div>
                </div>
              </div>

              {/* Quality verification */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-muted)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 255, 204, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="icon icon--sm icon--accent">verified</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Quality Check</div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>Verified &amp; Guaranteed</div>
                </div>
              </div>
            </div>

            {/* CTA Container */}
            <div className="product-cta-container">
              {!isOutOfStock && (
                <div className="product-qty-selector">
                  <button className="product-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">
                    <span className="icon">remove</span>
                  </button>
                  <span className="product-qty-value">{quantity}</span>
                  <button className="product-qty-btn" onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">
                    <span className="icon">add</span>
                  </button>
                </div>
              )}

              {isPreorder ? (
                <button
                  className="btn btn--primary product-btn-buy"
                  onClick={handleBuyNow}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #6E3AFF 0%, #00D4FF 100%)',
                    boxShadow: '0 0 25px rgba(110, 58, 255, 0.4)',
                    height: 52,
                    fontSize: 16,
                    fontWeight: 700
                  }}
                >
                  <span className="icon icon--md">rocket_launch</span>
                  <span>Pre-Order Now (₹{(price * quantity).toLocaleString('en-IN')})</span>
                </button>
              ) : isOutOfStock ? (
                <button className="btn btn--outline" disabled style={{ flex: 1, opacity: 0.6, height: 52 }}>
                  <span className="icon icon--md">do_not_disturb</span>
                  <span>Currently Out of Stock</span>
                </button>
              ) : (
                <>
                  <button className="btn btn--ghost product-btn-cart" onClick={handleAddToCart}>
                    <span className="icon icon--md">shopping_cart</span>
                    <span>Add to Cart</span>
                  </button>
                  <button
                    className="btn btn--primary product-btn-buy"
                    onClick={handleBuyNow}
                  >
                    <span className="icon icon--md icon--filled">bolt</span>
                    <span>Buy Now</span>
                  </button>
                </>
              )}
            </div>

          </div>

        </div>

        {/* TABBED INFORMATION SECTION (Description, Rules, Delivery Flow, Reviews) */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          marginBottom: 60
        }}>
          {/* Tab Navigation Header */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-surface-2)',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}>
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 24px',
                  background: currentTab === tab.id ? 'var(--color-surface)' : 'transparent',
                  color: currentTab === tab.id ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  border: 'none',
                  borderBottom: currentTab === tab.id ? '2px solid var(--color-cyan)' : '2px solid transparent',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <span className="icon icon--sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div style={{ padding: '32px 28px' }}>
            
            {/* 1. OVERVIEW TAB */}
            {currentTab === 'overview' && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 16, color: 'var(--color-text)' }}>
                  {selectedVariant?.description ? `${selectedVariant.name} - Specification` : 'Product Description & Features'}
                </h3>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedVariant?.description || product.description || 'No specific description provided for this product.'}
                </p>
              </div>
            )}

            {/* 2. RULES TAB (Only rendered if product has actual rules) */}
            {currentTab === 'rules' && hasRules && (
              <div>
                <div style={{
                  padding: '16px 20px', background: 'rgba(110, 58, 255, 0.08)',
                  border: '1px solid rgba(110, 58, 255, 0.25)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20
                }}>
                  <span className="icon icon--md icon--accent">gavel</span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                    Please review these product-specific guidelines:
                  </div>
                </div>

                <div style={{ color: 'var(--color-text-muted)', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap' }}>
                  {productRules}
                </div>
              </div>
            )}

            {/* 3. DELIVERY FLOW TAB */}
            {currentTab === 'delivery' && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--color-text)' }}>
                  Automated 3-Step Instant Delivery Process
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                  <div style={{ padding: 20, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(0, 212, 255, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-cyan)',
                      fontSize: 18, fontWeight: 800, marginBottom: 14
                    }}>
                      1
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                      Instant Payment
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      Pay securely via UPI QR, Binance Pay, or Crypto. Real-time auto webhook checks payment in seconds.
                    </p>
                  </div>

                  <div style={{ padding: 20, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(110, 58, 255, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary-light)',
                      fontSize: 18, fontWeight: 800, marginBottom: 14
                    }}>
                      2
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                      Credential Dispatch
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      Server atomically pops the assigned license key or link directly to your order summary page.
                    </p>
                  </div>

                  <div style={{ padding: 20, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: 'rgba(0, 255, 204, 0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)',
                      fontSize: 18, fontWeight: 800, marginBottom: 14
                    }}>
                      3
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                      Access &amp; Support
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                      Your order is stored in your Dashboard. If you need any help, our 24/7 team is ready on Telegram.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--color-text)' }}>
                  Customer Feedback ({reviews.length})
                </h3>

                {reviews.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {reviews.map(r => (
                      <div key={r.id} style={{
                        padding: 18, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                              fontFamily: 'var(--font-heading)', fontWeight: 700
                            }}>
                              {(r.reviewer_name || 'A')[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{r.reviewer_name}</div>
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
                        {r.title && <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>{r.title}</div>}
                        {r.body && <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>{r.body}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    <span className="icon icon--xl icon--muted" style={{ marginBottom: 8 }}>star_outline</span>
                    <div>No customer reviews yet. Be the first to try this product!</div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* RELATED PRODUCTS SECTION */}
        {relatedProducts.length > 0 && (
          <div>
            <div className="section-header" style={{ marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="icon icon--sm icon--cyan">recommend</span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-cyan)' }}>
                    More in this category
                  </span>
                </div>
                <h2 className="section-title">
                  Related <span className="text-gradient">Products</span>
                </h2>
              </div>
            </div>

            <div className="grid grid--4">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
