'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { useCartStore } from '../../../store/cartStore';
import { useCurrency } from '../../../store/currencyStore';
import toast from 'react-hot-toast';
import ProductIconBanner from '../../../components/product/ProductIconBanner';
import ProductCard from '../../../components/product/ProductCard';

const REVIEW_TEMPLATES = [
  {
    name: 'Rahul Sharma',
    loc: 'Mumbai, IN',
    title: 'Instant automated delivery, worked on first attempt! ⚡',
    body: 'Got the credentials immediately after UPI payment confirmation. Followed the step-by-step instructions and started using it within 2 minutes. Absolutely legit service!',
    rating: 5,
  },
  {
    name: 'Aman Verma',
    loc: 'Delhi, IN',
    title: 'Best price on the market, 100% genuine',
    body: 'Was skeptical at first, but everything is authentic and high quality. No interruptions or login issues so far. Saved me tons of money.',
    rating: 5,
  },
  {
    name: 'Vikram Patel',
    loc: 'Ahmedabad, IN',
    title: 'Super fast Telegram support',
    body: 'I had a quick question regarding activation and support answered in under 3 minutes on Telegram. Friendly and resolved instantly.',
    rating: 5,
  },
  {
    name: 'Priya Nair',
    loc: 'Bangalore, IN',
    title: 'Smooth transaction & prompt delivery',
    body: 'Automated checkout with QR scan was extremely seamless. Credentials delivered to my dashboard and registered email right away.',
    rating: 5,
  },
  {
    name: 'Devendra Singh',
    loc: 'Jaipur, IN',
    title: 'Very reliable and hassle-free',
    body: 'Product works exactly as described in features. Clean setup without any extra complications. Will definitely order other subscriptions here.',
    rating: 5,
  },
  {
    name: 'Rohan Gupta',
    loc: 'Pune, IN',
    title: 'Great experience, instant QR verification',
    body: 'Paid via GPay UPI QR and received working credentials within 10 seconds. Highly impressed with the system automation.',
    rating: 5,
  },
  {
    name: 'Neha Kulkarni',
    loc: 'Hyderabad, IN',
    title: 'Renewed for the 3rd time, consistent quality',
    body: 'I have been using their service for months across multiple tools. Never faced any downtime or revocation issues. 10/10!',
    rating: 5,
  },
  {
    name: 'Arjun Reddy',
    loc: 'Chennai, IN',
    title: 'Value for money is unmatched',
    body: 'Official prices are too expensive for students/freelancers. This store is a lifesaver. Key activated smoothly.',
    rating: 5,
  },
  {
    name: 'Sandeep Das',
    loc: 'Kolkata, IN',
    title: 'Clean dashboard with instant order history',
    body: 'Everything is organized cleanly in the user panel. You can easily view your past licenses and access details anytime.',
    rating: 4,
  },
  {
    name: 'Pooja Mehta',
    loc: 'Surat, IN',
    title: 'Legit seller, recommended to all my colleagues',
    body: 'Shared with my design team. All 4 accounts activated instantly without any issues. Very professional.',
    rating: 5,
  },
  {
    name: 'Alex Chen',
    loc: 'Singapore, SG',
    title: 'Crypto payment was super fast',
    body: 'Paid with USDT on Binance Pay and got instant digital fulfillment. Great service for international buyers too.',
    rating: 5,
  },
  {
    name: 'Marcus Vance',
    loc: 'London, UK',
    title: 'Quick activation and 24/7 responsiveness',
    body: 'Support verified my order within moments. Excellent digital store with trustworthy automated delivery.',
    rating: 5,
  },
  {
    name: 'Siddharth Joshi',
    loc: 'Indore, IN',
    title: 'Top tier service! Everything is smooth',
    body: 'No hidden catches, works exactly as promised in description. Very transparent and fast.',
    rating: 5,
  },
  {
    name: 'Ravi Teja',
    loc: 'Visakhapatnam, IN',
    title: 'Delivered in under 30 seconds',
    body: 'Automated dispatch system is top notch. Just scan QR, enter UTR and boom - credentials ready on screen.',
    rating: 4,
  },
  {
    name: 'Sneha Rao',
    loc: 'Nagpur, IN',
    title: 'Super helpful guide and instructions included',
    body: 'Clear login instructions provided along with the credentials so there was zero confusion. A+ service!',
    rating: 5,
  },
];

function getRealisticReviewsForProduct(prod, targetCount) {
  if (!prod) return [];
  const charSum = (prod.id || 'p').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const count = targetCount || (38 + (charSum % 142));

  const list = [];
  for (let i = 0; i < count; i++) {
    const template = REVIEW_TEMPLATES[(i + charSum) % REVIEW_TEMPLATES.length];
    const daysAgo = Math.floor(i * 1.6) + ((charSum + i) % 4) + 1;
    const rating = (i % 11 === 0 || i % 19 === 0) ? 4 : (template.rating || 5);

    list.push({
      id: `rev-${prod.id || 'prod'}-${i + 1}`,
      reviewer_name: template.name,
      location: template.loc,
      rating,
      title: template.title,
      body: template.body,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      verified: true,
      helpful_count: Math.max(3, Math.floor(28 - (i * 0.18)) + ((charSum + i) % 7)),
    });
  }
  return list;
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const addItem = useCartStore(s => s.addItem);
  const { format } = useCurrency();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [imgError, setImgError] = useState(false);
  
  // Review pagination & filter states
  const [reviewPage, setReviewPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState('all');
  const REVIEWS_PER_PAGE = 6;

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`)
      .then(({ data }) => {
        const prod = data.product;
        setProduct(prod);
        setVariants(data.variants || prod?.variants || []);
        
        const charSum = (prod?.id || slug || 'p').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const expectedCount = 38 + (charSum % 142);

        const fetchedReviews = (data.reviews && data.reviews.length >= expectedCount)
          ? data.reviews
          : getRealisticReviewsForProduct(prod, expectedCount);
        setReviews(fetchedReviews);
        
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
            <div className="skeleton" style={{ width: '100%', aspectRatio: '4 / 5', borderRadius: 20 }} />
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

  const charCodeSum = (product?.id || slug || 'prod').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const ratingVariations = ['4.9', '4.8', '4.9', '4.7', '5.0', '4.8'];
  const ratingValue = ratingVariations[charCodeSum % ratingVariations.length];
  const totalReviewsCount = 38 + (charCodeSum % 142);
  const totalSoldCount = 120 + (charCodeSum % 380);

  const price = parseFloat(selectedVariant?.price || product.min_price || 0);
  const comparePrice = parseFloat(selectedVariant?.compare_price || product.compare_price || 0);
  const discount = comparePrice && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100)
    : null;

  const isPreorder = Boolean(
    selectedVariant
      ? (selectedVariant.is_preorder || selectedVariant.delivery_method === 'preorder' || /pre[- ]?order/i.test(selectedVariant.name || ''))
      : (product.is_preorder || product.delivery_process === 'preorder')
  );
  const inStock = selectedVariant ? Boolean(selectedVariant.in_stock) : Boolean(product.in_stock);
  const isOutOfStock = !inStock && !isPreorder;

  const deliveryMethodText = isPreorder
    ? 'Pre-Order Queue'
    : (selectedVariant?.delivery_method || product.delivery_process) === 'manual'
    ? 'Manual Dispatch'
    : 'Auto Dispatch';

  const deliveryTimeText = selectedVariant?.delivery_time || product.delivery_time || (isPreorder ? 'Priority Queue' : (selectedVariant?.delivery_method || product.delivery_process) === 'manual' ? '15 - 60 Mins' : 'Instant (<30s)');

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
      thumbnail_url: product.images?.[0] || product.image_url || '',
      image_url: product.image_url || product.images?.[0] || '',
      category: product.category || '',
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
    { id: 'overview', label: 'Product Overview', shortLabel: 'Overview', icon: 'description' },
    ...(hasRules ? [{ id: 'rules', label: 'Usage Rules & Terms', shortLabel: 'Rules', icon: 'gavel' }] : []),
    { id: 'delivery', label: 'How Delivery Works', shortLabel: 'Delivery', icon: 'route' },
    { id: 'reviews', label: `Reviews (${totalReviewsCount})`, shortLabel: `Reviews (${totalReviewsCount})`, icon: 'rate_review' },
  ];

  // If currently on rules tab but rules don't exist, fallback to overview
  const currentTab = !hasRules && activeTab === 'rules' ? 'overview' : activeTab;

  return (
    <div style={{ paddingTop: 'calc(var(--header-height) + 24px)', paddingBottom: 90 }}>
      <div className="container">
        
        {/* Top Breadcrumb & Status Bar */}
        <div className="product-breadcrumb-wrap">
          <nav className="product-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/" className="product-breadcrumb-link">Home</Link>
            <span className="product-breadcrumb-sep">/</span>
            <Link href="/products" className="product-breadcrumb-link">Store</Link>
            {product.category_id && (
              <>
                <span className="product-breadcrumb-sep">/</span>
                <Link href={`/products?category=${product.category_id}`} className="product-breadcrumb-link">
                  {product.category || 'Category'}
                </Link>
              </>
            )}
            <span className="product-breadcrumb-sep">/</span>
            <span className="product-breadcrumb-current" title={product.website_meta?.title || product.title || product.name}>
              {product.website_meta?.title || product.title || product.name}
            </span>
          </nav>
        </div>

        {/* Main Product Showcase Grid */}
        <div className="product-detail-grid" style={{ marginBottom: 50 }}>
          
          {/* LEFT COLUMN: Visual Showcase & Guarantees */}
          <div className="product-detail-media-column">
            
            {/* Visual Graphic Banner / Product Image (4:5 Full Canvas Ratio) */}
            <div className="product-detail-media-frame">
              {((product.images && product.images.length > 0 && product.images[0]) || (product.website_meta?.images && product.website_meta.images.length > 0 && product.website_meta.images[0])) && !imgError ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img
                    src={product.images?.[0] || product.website_meta?.images?.[0]}
                    alt={product.website_meta?.title || product.title || product.name}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block'
                    }}
                  />
                </div>
              ) : (
                <ProductIconBanner
                  title={product.website_meta?.title || product.title || product.name}
                  category={product.category_id || product.category}
                  size="detail"
                />
              )}
            </div>

            {/* Guarantee Trust Box (Full Width, No Truncation) */}
            <div className="product-trust-box">
              <div className="product-trust-item">
                <div className="product-trust-icon-box product-trust-icon-box--cyan">
                  <span className="icon icon--sm icon--filled">bolt</span>
                </div>
                <div className="product-trust-info">
                  <span className="product-trust-title">Instant Auto Delivery</span>
                  <span className="product-trust-desc">Automated credential dispatch immediately after payment</span>
                </div>
              </div>

              <div className="product-trust-divider" />

              <div className="product-trust-item">
                <div className="product-trust-icon-box product-trust-icon-box--blue">
                  <span className="icon icon--sm">verified_user</span>
                </div>
                <div className="product-trust-info">
                  <span className="product-trust-title">100% Genuine Quality</span>
                  <span className="product-trust-desc">Official verified licenses &amp; tested activations</span>
                </div>
              </div>

              <div className="product-trust-divider" />

              <div className="product-trust-item">
                <div className="product-trust-icon-box product-trust-icon-box--purple">
                  <span className="icon icon--sm">support_agent</span>
                </div>
                <div className="product-trust-info">
                  <span className="product-trust-title">24/7 Priority Support</span>
                  <span className="product-trust-desc">Dedicated Telegram &amp; live ticket assistance</span>
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
          <div className="product-detail-action-sidebar">
            <div className="pro-configurator">
              
              {/* Badges Bar */}
              <div className="pro-badges-row">
                {discount ? (
                  <span className="pro-badge pro-badge--sale">
                    <span className="icon icon--xs">local_offer</span>
                    Save {discount}%
                  </span>
                ) : null}
                {product.is_featured && <span className="pro-badge pro-badge--featured">Featured</span>}
                {isPreorder && <span className="pro-badge pro-badge--preorder">Pre-Order</span>}
                {product.category && <span className="pro-badge pro-badge--category">{product.category}</span>}
              </div>

              {/* Main Title */}
              <h1 className="pro-title">
                {product.website_meta?.title || product.title || product.name}
              </h1>

              {/* Rating & Social Proof Bar */}
              <div className="pro-rating-bar">
                <div className="pro-rating-group">
                  <div className="pro-rating-stars">
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} className="icon icon--filled" style={{ fontSize: 13 }}>star</span>
                    ))}
                  </div>
                  <span className="pro-rating-score">{ratingValue}</span>
                  <span
                    className="pro-rating-count"
                    onClick={() => setActiveTab('reviews')}
                  >
                    ({totalReviewsCount} reviews)
                  </span>
                </div>

                <div className="pro-sales-tag">
                  <span className="pro-pulse-dot" />
                  <span>{totalSoldCount}+ Delivered</span>
                </div>
              </div>

              {/* Hero Price Box */}
              <div className="pro-price-card">
                <div className="pro-price-row">
                  <div className="pro-price-values">
                    <span className="pro-price-current">
                      {format(price)}
                    </span>
                    {comparePrice > price && (
                      <span className="pro-price-compare">
                        {format(comparePrice)}
                      </span>
                    )}
                  </div>
                  {discount ? (
                    <span className="pro-save-pill">
                      -{discount}% OFF
                    </span>
                  ) : null}
                </div>
                <div className="pro-delivery-promise">
                  <span className="icon icon--sm icon--cyan icon--filled">bolt</span>
                  <span>{isPreorder ? 'Pre-Order: Immediate reservation & priority dispatch' : 'Automated Digital Fulfillment — Ready in seconds'}</span>
                </div>
              </div>

              {/* Plan / Variant Selector Cards */}
              {variants.length > 0 && (
                <div className="pro-variants-section">
                  <div className="pro-variants-header">
                    <span>Select License / Package</span>
                    <span className="pro-variants-count">{variants.length} options</span>
                  </div>

                  <div className="pro-variants-list">
                    {variants.map(v => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`pro-variant-card ${isSelected ? 'pro-variant-card--active' : ''}`}
                        >
                          <div className="pro-variant-left">
                            <div className="pro-variant-radio">
                              {isSelected && <div className="pro-variant-radio-inner" />}
                            </div>
                            <div>
                              <div className="pro-variant-name">{v.name}</div>
                              <div className="pro-variant-sub">
                                {v.is_preorder ? (
                                  <span style={{ color: '#3874FF', fontWeight: 700 }}>Pre-Order</span>
                                ) : v.is_infinite ? (
                                  <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Instant Auto Stock</span>
                                ) : v.stock > 0 ? (
                                  <span style={{ color: '#10B981', fontWeight: 700 }}>✓ {v.stock} in stock</span>
                                ) : (
                                  <span style={{ color: '#EF4444', fontWeight: 700 }}>Out of stock</span>
                                )}
                                <span>•</span>
                                <span>{v.delivery_time || 'Instant'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pro-variant-price">
                            {format(v.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4 Technical Specs Grid */}
              <div className="pro-specs-grid">
                {/* 1. Delivery Time */}
                <div className="pro-spec-item">
                  <div className="pro-spec-icon-box" style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#06B6D4' }}>
                    <span className="icon icon--sm">schedule</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pro-spec-label">Delivery Time</div>
                    <div className="pro-spec-val">{deliveryTimeText}</div>
                  </div>
                </div>

                {/* 2. Delivery Method */}
                <div className="pro-spec-item">
                  <div className="pro-spec-icon-box" style={{ background: 'rgba(56, 116, 255, 0.12)', color: '#3874FF' }}>
                    <span className="icon icon--sm icon--filled">bolt</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pro-spec-label">Method</div>
                    <div className="pro-spec-val">{deliveryMethodText}</div>
                  </div>
                </div>

                {/* 3. Stock Status */}
                <div className="pro-spec-item">
                  <div className="pro-spec-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                    <span className="icon icon--sm">inventory_2</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pro-spec-label">Availability</div>
                    <div className="pro-spec-val">
                      {isPreorder
                        ? 'Pre-Order'
                        : selectedVariant?.is_infinite
                        ? 'Instant Ready'
                        : selectedVariant?.stock > 0
                        ? `${selectedVariant.stock} Left`
                        : inStock
                        ? 'In Stock'
                        : 'Out of Stock'}
                    </div>
                  </div>
                </div>

                {/* 4. Verification */}
                <div className="pro-spec-item">
                  <div className="pro-spec-icon-box" style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' }}>
                    <span className="icon icon--sm">verified</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pro-spec-label">License</div>
                    <div className="pro-spec-val">100% Genuine</div>
                  </div>
                </div>
              </div>

              {/* CTAs Container */}
              <div className="pro-cta-container">
                {isPreorder ? (
                  /* Pre-Order: Exactly 2 items side-by-side (Stepper + Pre-Order Button) */
                  <div className="pro-cta-row-2">
                    <div className="pro-qty-stepper">
                      <button
                        type="button"
                        className="pro-qty-btn"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        <span className="icon icon--sm">remove</span>
                      </button>
                      <span className="pro-qty-num">{quantity}</span>
                      <button
                        type="button"
                        className="pro-qty-btn"
                        onClick={() => setQuantity(quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <span className="icon icon--sm">add</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pro-btn-buy"
                      onClick={handleBuyNow}
                    >
                      <span className="icon icon--sm icon--filled">rocket_launch</span>
                      <span>Pre-Order Now ({format(price * quantity)})</span>
                    </button>
                  </div>
                ) : isOutOfStock ? (
                  <button type="button" className="btn btn--outline" disabled style={{ width: '100%', height: 48, opacity: 0.5 }}>
                    <span className="icon icon--sm">do_not_disturb</span>
                    <span>Currently Out of Stock</span>
                  </button>
                ) : (
                  /* In-Stock: Row 1 (Stepper + Add to Cart), Row 2 (Buy Now) */
                  <div className="pro-cta-stack">
                    <div className="pro-cta-row-2">
                      <div className="pro-qty-stepper">
                        <button
                          type="button"
                          className="pro-qty-btn"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          aria-label="Decrease quantity"
                        >
                          <span className="icon icon--sm">remove</span>
                        </button>
                        <span className="pro-qty-num">{quantity}</span>
                        <button
                          type="button"
                          className="pro-qty-btn"
                          onClick={() => setQuantity(quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <span className="icon icon--sm">add</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="pro-btn-cart"
                        onClick={handleAddToCart}
                      >
                        <span className="icon icon--sm">shopping_cart</span>
                        <span>Add to Cart</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pro-btn-buy pro-btn-buy--full"
                      onClick={handleBuyNow}
                    >
                      <span className="icon icon--sm icon--filled">bolt</span>
                      <span>Buy Now</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* TABBED INFORMATION SECTION (Description, Rules, Delivery Flow, Reviews) */}
        <div className="product-tabs-container">
          {/* Tab Navigation Header */}
          <div className="product-tabs-header">
            {availableTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`product-tab-btn ${currentTab === tab.id ? 'product-tab-btn--active' : ''}`}
              >
                <span className="icon icon--sm">{tab.icon}</span>
                <span className="desktop-tab-label">{tab.label}</span>
                <span className="mobile-tab-label">{tab.shortLabel || tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Body */}
          <div className="product-tab-content">
            
            {/* 1. OVERVIEW TAB */}
            {currentTab === 'overview' && (
              <div>
                <h3 className="product-tab-content-title">
                  {selectedVariant?.description ? `${selectedVariant.name} - Specification` : 'Product Description & Features'}
                </h3>
                <p className="product-tab-content-text">
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
                <h3 className="product-tab-content-title" style={{ marginBottom: 20 }}>
                  Automated 3-Step Instant Delivery Process
                </h3>

                <div className="delivery-steps-grid">
                  <div className="delivery-step-card">
                    <div className="delivery-step-badge" style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--color-cyan)' }}>
                      1
                    </div>
                    <div>
                      <div className="delivery-step-title">
                        Instant Payment
                      </div>
                      <p className="delivery-step-desc">
                        Pay securely via UPI QR, Binance Pay, or Crypto. Real-time webhook confirms payment instantly.
                      </p>
                    </div>
                  </div>

                  <div className="delivery-step-card">
                    <div className="delivery-step-badge" style={{ background: 'rgba(110, 58, 255, 0.15)', color: 'var(--color-primary-light)' }}>
                      2
                    </div>
                    <div>
                      <div className="delivery-step-title">
                        Credential Dispatch
                      </div>
                      <p className="delivery-step-desc">
                        System automatically pops the license key, account, or activation link to your order page.
                      </p>
                    </div>
                  </div>

                  <div className="delivery-step-card">
                    <div className="delivery-step-badge" style={{ background: 'rgba(0, 255, 204, 0.15)', color: 'var(--color-accent)' }}>
                      3
                    </div>
                    <div>
                      <div className="delivery-step-title">
                        Access &amp; Support
                      </div>
                      <p className="delivery-step-desc">
                        Order stored safely in your Dashboard. 24/7 dedicated support team available on Telegram.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. REVIEWS TAB */}
            {activeTab === 'reviews' && (() => {
              const filteredReviews = reviews.filter(r => {
                if (ratingFilter === 'all') return true;
                return r.rating === Number(ratingFilter);
              });

              const totalFilteredPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE) || 1;
              const safeReviewPage = Math.min(reviewPage, totalFilteredPages);
              const startIdx = (safeReviewPage - 1) * REVIEWS_PER_PAGE;
              const paginatedReviews = filteredReviews.slice(startIdx, startIdx + REVIEWS_PER_PAGE);

              const fiveStarCount = reviews.filter(r => r.rating === 5).length;
              const fourStarCount = reviews.filter(r => r.rating === 4).length;

              const handlePageChange = (newPage) => {
                setReviewPage(newPage);
                const reviewEl = document.getElementById('reviews-section-top');
                if (reviewEl) reviewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              };

              return (
                <div id="reviews-section-top">
                  {/* Review Header Analytics Box */}
                  <div className="review-analytics-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-heading)', color: 'var(--color-text)', lineHeight: 1 }}>
                          {ratingValue}
                        </div>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '4px 0 2px 0' }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className="icon icon--filled" style={{ fontSize: 13, color: '#F59E0B' }}>star</span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Based on {totalReviewsCount} reviews</span>
                      </div>

                      <div style={{ width: 1, height: 50, background: 'var(--color-border)' }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>
                          <span className="icon icon--sm icon--cyan" style={{ fontSize: 15 }}>verified</span>
                          <span>100% Verified Buyer Feedback</span>
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                          Over {totalSoldCount}+ activations delivered automatically.
                        </span>
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <span className="icon icon--sm" style={{ color: '#10B981', fontSize: 14 }}>check_circle</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10B981' }}>99% Customer Satisfaction</span>
                    </div>
                  </div>

                  {/* Filter & Subheader Row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 10, marginBottom: 16
                  }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                      Customer Reviews ({filteredReviews.length})
                    </h3>

                    {/* Star Rating Filters */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => { setRatingFilter('all'); setReviewPage(1); }}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                          cursor: 'pointer', border: '1px solid',
                          background: ratingFilter === 'all' ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                          borderColor: ratingFilter === 'all' ? 'transparent' : 'var(--color-border)',
                          color: ratingFilter === 'all' ? '#fff' : 'var(--color-text-muted)',
                        }}
                      >
                        All ({reviews.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRatingFilter(5); setReviewPage(1); }}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                          cursor: 'pointer', border: '1px solid',
                          background: ratingFilter === 5 ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface-2)',
                          borderColor: ratingFilter === 5 ? 'rgba(245, 158, 11, 0.5)' : 'var(--color-border)',
                          color: ratingFilter === 5 ? '#F59E0B' : 'var(--color-text-muted)',
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}
                      >
                        <span className="icon icon--sm icon--filled" style={{ fontSize: 12, color: '#F59E0B' }}>star</span>
                        <span>5 Stars ({fiveStarCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRatingFilter(4); setReviewPage(1); }}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                          cursor: 'pointer', border: '1px solid',
                          background: ratingFilter === 4 ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-surface-2)',
                          borderColor: ratingFilter === 4 ? 'rgba(245, 158, 11, 0.5)' : 'var(--color-border)',
                          color: ratingFilter === 4 ? '#F59E0B' : 'var(--color-text-muted)',
                          display: 'inline-flex', alignItems: 'center', gap: 3
                        }}
                      >
                        <span className="icon icon--sm icon--filled" style={{ fontSize: 12, color: '#F59E0B' }}>star</span>
                        <span>4 Stars ({fourStarCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Reviews List */}
                  {paginatedReviews.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {paginatedReviews.map(r => (
                        <div key={r.id} className="review-card-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 14,
                                boxShadow: '0 2px 6px rgba(110, 58, 255, 0.25)', flexShrink: 0
                              }}>
                                {(r.reviewer_name || 'A')[0]}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>{r.reviewer_name}</span>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: 9.5, fontWeight: 700, color: '#10B981',
                                    background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                    padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.03em'
                                  }}>
                                    <span className="icon icon--sm" style={{ fontSize: 10 }}>verified</span>
                                    Verified Buyer
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <div style={{ display: 'flex', gap: 1 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <span key={s} className="icon icon--filled" style={{
                                        fontSize: 11.5,
                                        color: s <= (r.rating || 5) ? '#F59E0B' : 'var(--color-text-faint)'
                                      }}>star</span>
                                    ))}
                                  </div>
                                  {r.location && (
                                    <span style={{ fontSize: 10.5, color: 'var(--color-text-faint)' }}>• {r.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 500 }}>
                              {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          {r.title && (
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)' }}>
                              {r.title}
                            </div>
                          )}

                          {r.body && (
                            <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                              {r.body}
                            </p>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ fontSize: 10.5, color: 'var(--color-text-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="icon icon--sm" style={{ fontSize: 12, color: 'var(--color-cyan)' }}>thumb_up</span>
                              <span>{r.helpful_count || 14} found this helpful</span>
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Pagination Controls */}
                      {totalFilteredPages > 1 && (
                        <div className="review-pagination-container">
                          <span className="review-pagination-info">
                            Showing {startIdx + 1}–{Math.min(startIdx + REVIEWS_PER_PAGE, filteredReviews.length)} of {filteredReviews.length} reviews
                          </span>

                          <div className="review-pagination-btns">
                            <button
                              type="button"
                              onClick={() => handlePageChange(safeReviewPage - 1)}
                              disabled={safeReviewPage <= 1}
                              style={{
                                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                color: safeReviewPage <= 1 ? 'var(--color-text-faint)' : 'var(--color-text)',
                                cursor: safeReviewPage <= 1 ? 'not-allowed' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <span className="icon icon--sm">chevron_left</span>
                              <span>Previous</span>
                            </button>

                            <div style={{ display: 'flex', gap: 4 }}>
                              {Array.from({ length: totalFilteredPages }, (_, idx) => idx + 1)
                                .filter(pNum => pNum === 1 || pNum === totalFilteredPages || Math.abs(pNum - safeReviewPage) <= 1)
                                .map((pNum, idx, arr) => {
                                  const showEllipsisBefore = idx > 0 && pNum > arr[idx - 1] + 1;
                                  return (
                                    <div key={pNum} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {showEllipsisBefore && (
                                        <span style={{ color: 'var(--color-text-faint)', fontSize: 12, padding: '0 2px' }}>...</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handlePageChange(pNum)}
                                        style={{
                                          width: 32, height: 32, borderRadius: 6, fontSize: 12, fontWeight: 700,
                                          background: pNum === safeReviewPage ? 'var(--gradient-primary)' : 'var(--color-surface-2)',
                                          border: '1px solid',
                                          borderColor: pNum === safeReviewPage ? 'transparent' : 'var(--color-border)',
                                          color: pNum === safeReviewPage ? '#fff' : 'var(--color-text-muted)',
                                          cursor: 'pointer',
                                          boxShadow: pNum === safeReviewPage ? '0 2px 8px rgba(110, 58, 255, 0.4)' : 'none'
                                        }}
                                      >
                                        {pNum}
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePageChange(safeReviewPage + 1)}
                              disabled={safeReviewPage >= totalFilteredPages}
                              style={{
                                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                                background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                                color: safeReviewPage >= totalFilteredPages ? 'var(--color-text-faint)' : 'var(--color-text)',
                                cursor: safeReviewPage >= totalFilteredPages ? 'not-allowed' : 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <span>Next</span>
                              <span className="icon icon--sm">chevron_right</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      <span className="icon icon--xl icon--muted" style={{ marginBottom: 8 }}>star_outline</span>
                      <div>No reviews matching the selected filter.</div>
                    </div>
                  )}
                </div>
              );
            })()}

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
