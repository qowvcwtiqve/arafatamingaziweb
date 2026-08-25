/**
 * Bot DB Service
 * Provides clean helpers to read from the bot's MongoDB Atlas database.
 * All operations are READ-ONLY on bot collections (products, categories, users).
 * The website_meta field is the ONLY writable part of bot's product documents.
 */

import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import Category from '../models/category.model.js';
import WebsiteProduct from '../models/websiteProduct.model.js';

// ── Get the native MongoDB driver collection for direct low-level ops ─────────
const getCollection = (name) => mongoose.connection.collection(name);

/**
 * Generate a clean, SEO-friendly human-readable slug from product name (no random ID codes)
 * Example: "Adobe Express Premium", "p-cd345e" -> "adobe-express-premium"
 */
export function generateProductSlug(name, id) {
  const clean = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return clean || id || 'product';
}

export function formatWebProduct(webProd) {
  const idStr = webProd._id.toString();
  return {
    id: idStr,
    slug: generateProductSlug(webProd.name, idStr),
    name: webProd.name,
    title: webProd.name,
    description: webProd.description || '',
    rules: webProd.rules || '',
    min_price: webProd.price,
    max_price: webProd.price,
    images: webProd.images || [],
    badge: webProd.badge || '',
    is_featured: webProd.is_featured || false,
    is_published: webProd.is_published || false,
    compare_price: webProd.compare_price || null,
    category_id: webProd.category_id || null,
    delivery_process: 'manual',
    delivery_time: webProd.delivery_time || 'Instant',
    is_website_only: true,
    total_stock: 9999,
    in_stock: true,
    is_preorder: false,
    variants: [{
      id: 'v-standard',
      name: 'Standard',
      price: webProd.price,
      duration: 0,
      stock: 'Available',
      is_infinite: true,
      rules: webProd.rules || '',
      description: webProd.description || '',
      delivery_time: webProd.delivery_time || 'Instant',
      delivery_method: 'manual'
    }],
    pools: {}
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all active products with computed stock info.
 * @param {Object} opts - { categoryId, search, sort, page, limit }
 */
export const getActiveProducts = async (opts = {}) => {
  const { categoryId, search, sort = 'priority', min_price, max_price, stock_status, featured, page = 1, limit = 24, isAdmin = false } = opts;

  // 1. Fetch Bot Products
  const botQuery = {};
  if (!isAdmin) {
    botQuery.is_active = true;
    botQuery['website_meta.is_published'] = { $ne: false };
  }
  if (categoryId) botQuery.category_id = categoryId;
  if (search) botQuery.name = { $regex: search, $options: 'i' };
  if (featured === 'true' || featured === true) botQuery['website_meta.is_featured'] = true;

  let rawBotProducts = await Product.find(botQuery).lean();
  let mappedBotProducts = rawBotProducts.map((p) => formatProductForAPI(p, false));

  // 2. Fetch Website Products
  const webQuery = {};
  if (!isAdmin) webQuery.is_published = true;
  if (categoryId) webQuery.category_id = categoryId;
  if (search) webQuery.name = { $regex: search, $options: 'i' };
  if (featured === 'true' || featured === true) webQuery.is_featured = true;

  let rawWebProducts = await WebsiteProduct.find(webQuery).lean();
  let mappedWebProducts = rawWebProducts.map((p) => formatWebProduct(p));

  // 3. Combine
  let combined = [...mappedBotProducts, ...mappedWebProducts];

  // Apply price range filter
  if (min_price !== undefined && min_price !== '' && !isNaN(min_price)) {
    const minP = parseFloat(min_price);
    combined = combined.filter((p) => (p.min_price !== undefined ? p.min_price >= minP || p.max_price >= minP : true));
  }
  if (max_price !== undefined && max_price !== '' && !isNaN(max_price)) {
    const maxP = parseFloat(max_price);
    combined = combined.filter((p) => (p.min_price !== undefined ? p.min_price <= maxP : true));
  }

  // Apply stock_status filter
  if (stock_status === 'in_stock') {
    combined = combined.filter((p) => p.in_stock && !p.is_preorder);
  } else if (stock_status === 'preorder') {
    combined = combined.filter((p) => p.is_preorder);
  } else if (stock_status === 'infinite') {
    combined = combined.filter((p) => p.is_infinite);
  }

  // 4. Sort
  if (sort === 'price_asc') {
    combined.sort((a, b) => a.min_price - b.min_price);
  } else if (sort === 'price_desc') {
    combined.sort((a, b) => b.min_price - a.min_price);
  } else if (sort === 'name_asc') {
    combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sort === 'newest') {
    combined.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // Default / Priority / Popular
    combined.sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  // 5. Paginate
  const total = combined.length;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const paginated = combined.slice(skip, skip + parseInt(limit));

  return { 
    products: paginated, 
    total, 
    page: parseInt(page), 
    totalPages: Math.ceil(total / parseInt(limit)) 
  };
};

/**
 * Get a single product by its ID or SEO slug (e.g. "p-cd345e" or "netflix-premium-4k-p-cd345e").
 */
export const getProductById = async (identifier) => {
  if (!identifier) return null;

  // 1. Direct ID match for WebsiteProduct (24-char ObjectId)
  if (identifier.length === 24 && /^[0-9a-fA-F]{24}$/.test(identifier)) {
    const webProd = await WebsiteProduct.findById(identifier).lean();
    if (webProd) return formatWebProduct(webProd);
  }

  // 2. Direct ID match for Bot Product (e.g. "p-cd345e")
  let p = await Product.findById(identifier).lean();
  if (p) return formatProductForAPI(p, true);

  // 3. Extract bot ID from slug suffix (e.g. "netflix-premium-p-cd345e" -> "p-cd345e")
  const botIdMatch = identifier.match(/(p-[a-zA-Z0-9_-]+)$/);
  if (botIdMatch) {
    p = await Product.findById(botIdMatch[1]).lean();
    if (p) return formatProductForAPI(p, true);
  }

  // 4. Extract 24-char hex ObjectId from slug suffix
  const hexIdMatch = identifier.match(/([0-9a-fA-F]{24})$/);
  if (hexIdMatch) {
    const webProd = await WebsiteProduct.findById(hexIdMatch[1]).lean();
    if (webProd) return formatWebProduct(webProd);
  }

  // 5. Fallback search by computed slug matching
  const allProds = await Product.find({ is_active: true }).lean();
  for (const prod of allProds) {
    const s = generateProductSlug(prod.website_meta?.title || prod.name, prod._id);
    if (s === identifier) return formatProductForAPI(prod, true);
  }

  const allWeb = await WebsiteProduct.find({ is_published: true }).lean();
  for (const web of allWeb) {
    const s = generateProductSlug(web.name, web._id.toString());
    if (s === identifier) return formatWebProduct(web);
  }

  return null;
};

/**
 * Format a raw MongoDB product document into a clean API response.
 * Computes: min_price, max_price, total_stock, variants with stock info, and SEO slug.
 */
export function formatProductForAPI(p, full = false) {
  const variants = p.variants || {};
  const stockPools = p.stock_pools || {};
  const infinitePools = p.infinite_pools || {};
  const preorderPools = p.preorder_pools || {};
  const websiteMeta = p.website_meta || {};
  const poolRules = p.pool_rules || {};

  // Compute per-variant info
  const variantList = Object.entries(variants).map(([vid, v]) => {
    const poolId = v.pool_id;
    const poolStock = stockPools[poolId] || [];
    const isInfinite = infinitePools[poolId] || false;

    // 1. Variant website meta
    const varMeta = websiteMeta.variants?.[vid] || {};

    // 2. Rules priority: variant-specific → pool-level → global
    const rules =
      varMeta.rules ||
      (poolId ? poolRules[poolId] : '') ||
      p.rules ||
      '';

    // 3. Preorder check
    const isPreorder = Boolean(
      preorderPools[poolId] ||
      varMeta.is_preorder ||
      varMeta.delivery_method === 'preorder' ||
      (v.name && /pre[- ]?order/i.test(v.name)) ||
      (p.name && /pre[- ]?order/i.test(p.name))
    );

    // 4. Delivery method: prioritize bot delivery_process / varMeta
    let deliveryMethod = 'auto';
    if (isPreorder) {
      deliveryMethod = 'preorder';
    } else if (varMeta.delivery_method) {
      deliveryMethod = varMeta.delivery_method;
    } else if (p.delivery_process) {
      deliveryMethod = String(p.delivery_process).toLowerCase().includes('manual') ? 'manual' : 'auto';
    }

    // 5. Delivery time: prioritize bot delivery_time / varMeta
    const deliveryTime =
      varMeta.delivery_time ||
      p.delivery_time ||
      (isPreorder ? 'Release Date / On Queue' : deliveryMethod === 'manual' ? '15 - 60 Minutes' : 'Instant');

    const stockCount = isInfinite ? 9999 : poolStock.length;

    return {
      id: vid,
      name: v.name,
      price: v.price,
      duration: v.duration || 0,  // months; 0 = lifetime
      pool_id: poolId,
      stock: stockCount,
      is_infinite: isInfinite,
      is_preorder: isPreorder,
      in_stock: isInfinite || stockCount > 0 || isPreorder,
      // Website-meta fields
      compare_price: varMeta.compare_price ? parseFloat(varMeta.compare_price) : null,
      description: varMeta.description || '',
      rules,
      delivery_time: deliveryTime,
      delivery_method: deliveryMethod,
    };
  });

  // Sort variants by price ascending
  variantList.sort((a, b) => a.price - b.price);

  const prices = variantList.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const isInfiniteProduct = variantList.some((v) => v.is_infinite) || Object.values(infinitePools).some(Boolean);
  const totalStock = isInfiniteProduct
    ? 9999
    : variantList.reduce((sum, v) => sum + (typeof v.stock === 'number' ? v.stock : 0), 0);
  const isPreorderProduct = variantList.some((v) => v.is_preorder) || Object.values(preorderPools || {}).some(Boolean) || (p.name && /pre[- ]?order/i.test(p.name)) || false;
  const hasAnyStock = isInfiniteProduct || totalStock > 0 || variantList.some((v) => v.in_stock || v.is_preorder);

  const displayTitle = websiteMeta.title || p.name;
  const slug = generateProductSlug(displayTitle, p._id);

  const productDeliveryProcess = isPreorderProduct
    ? 'preorder'
    : (p.delivery_process || (variantList[0]?.delivery_method) || 'auto');
  const productDeliveryTime = p.delivery_time || (variantList[0]?.delivery_time) || (isPreorderProduct ? 'Release Date / On Queue' : 'Instant');

  return {
    id: p._id,
    slug,
    name: p.name,
    // Website display overrides
    title: displayTitle,
    description: websiteMeta.description || p.description || '',
    rules: p.rules || '',
    images: websiteMeta.images || [],
    badge: websiteMeta.badge || '',
    is_featured: websiteMeta.is_featured || false,
    is_published: websiteMeta.is_published !== undefined ? websiteMeta.is_published : true,
    compare_price: variantList[0]?.compare_price || websiteMeta.compare_price || null,
    category_id: p.category_id || null,
    delivery_process: productDeliveryProcess,
    delivery_time: productDeliveryTime,
    is_active: p.is_active || false,
    min_price: minPrice,
    max_price: maxPrice,
    total_stock: totalStock,
    is_infinite: isInfiniteProduct,
    in_stock: hasAnyStock,
    is_preorder: isPreorderProduct,
    preorder_pools: preorderPools,
    infinite_pools: infinitePools,
    variants: variantList,
    // Full data only for admin / product detail page
    ...(full && {
      stock_pools: stockPools,
      pool_rules: poolRules,
      raw_variants: variants,
      website_meta: websiteMeta,
    }),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all categories, sorted by priority.
 */
export const getAllCategories = async () => {
  const cats = await Category.find({}).sort({ priority: 1 }).lean();
  return cats.map((c) => ({
    id: c._id,
    name: c.name,
    priority: c.priority || 999999,
    image: c.website_meta?.image || '',
    description: c.website_meta?.description || '',
    icon: c.website_meta?.icon || '',
  }));
};

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK (atomic operations)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Atomically pop ONE stock item from a pool.
 * Returns the popped credential string, or null if empty.
 *
 * Uses MongoDB's $pop operator which is atomic — no race conditions.
 * This is equivalent to `pool_stock.pop(0)` in the Python bot.
 */
export const atomicPopStock = async (productId, poolId) => {
  // First, get the first item
  const prod = await Product.findById(productId, { [`stock_pools.${poolId}`]: 1 }).lean();
  if (!prod) return null;

  const pool = (prod.stock_pools || {})[poolId] || [];
  if (pool.length === 0) return null;

  const item = pool[0];

  // Remove the first element atomically
  await Product.findByIdAndUpdate(productId, {
    $pop: { [`stock_pools.${poolId}`]: -1 }, // -1 = remove first element
  });

  await touchBotLastModified();
  return item;
};

/**
 * Get current stock count for a pool (no credentials exposed).
 */
export const getStockCount = async (productId, poolId) => {
  const prod = await Product.findById(productId, {
    [`stock_pools.${poolId}`]: 1,
    [`infinite_pools.${poolId}`]: 1,
  }).lean();
  if (!prod) return 0;
  if ((prod.infinite_pools || {})[poolId]) return Infinity;
  return ((prod.stock_pools || {})[poolId] || []).length;
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSITE META (writable — bot ignores this field)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update website_meta for a product.
 */
export const updateWebsiteMeta = async (productId, metaUpdate) => {
  // If it's a website-only product, update it directly
  if (productId.length === 24) {
    await WebsiteProduct.findByIdAndUpdate(productId, { $set: metaUpdate }, { upsert: false });
    return;
  }

  const setObj = {};
  for (const [key, val] of Object.entries(metaUpdate)) {
    setObj[`website_meta.${key}`] = val;
  }
  await Product.findByIdAndUpdate(productId, { $set: setObj }, { upsert: false });
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSITE PRODUCTS (CRUD)
// ═══════════════════════════════════════════════════════════════════════════════

export const createWebsiteProduct = async (data) => {
  const prod = new WebsiteProduct(data);
  await prod.save();
  return prod;
};

export const deleteWebsiteProduct = async (productId) => {
  if (productId.length !== 24) throw new Error("Cannot delete bot products from website.");
  await WebsiteProduct.findByIdAndDelete(productId);
};

export const updateVariantMeta = async (productId, variantId, varMeta) => {
  if (productId.length === 24) {
    // It's a website product. They only have a dummy v-standard variant.
    // Map variant meta to the root document.
    const setObj = {};
    if (varMeta.rules !== undefined) setObj.rules = varMeta.rules;
    if (varMeta.delivery_time !== undefined) setObj.delivery_time = varMeta.delivery_time;
    if (varMeta.description !== undefined) setObj.description = varMeta.description;
    await WebsiteProduct.findByIdAndUpdate(productId, { $set: setObj }, { upsert: false });
    return;
  }

  const setObj = {};
  for (const [key, val] of Object.entries(varMeta)) {
    setObj[`website_meta.variants.${variantId}.${key}`] = val;
  }
  await Product.findByIdAndUpdate(productId, { $set: setObj }, { upsert: false });
};

/**
 * Update category website_meta (image, description, icon).
 */
export const updateCategoryMeta = async (categoryId, metaUpdate) => {
  const setObj = {};
  for (const [key, val] of Object.entries(metaUpdate)) {
    setObj[`website_meta.${key}`] = val;
  }
  await Category.findByIdAndUpdate(categoryId, { $set: setObj }, { upsert: false });
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOT PRODUCT, STOCK POOLS & RULES MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export const touchBotLastModified = async () => {
  try {
    const now = Date.now() / 1000;
    await getCollection('system').updateOne(
      { _id: 'last_modified' },
      { $set: { time: now, timestamp: now, value: now, updated_at: now } },
      { upsert: true }
    );
    await getCollection('system').updateOne(
      { key: 'last_modified' },
      { $set: { time: now, timestamp: now, value: now, updated_at: now } },
      { upsert: true }
    );
    console.log(`[BotSync] Updated system.last_modified timestamp to ${now}`);
  } catch (err) {
    console.error('Failed to touch bot last_modified:', err.message);
  }
};

export const toggleProductActive = async (productId) => {
  const p = await Product.findById(productId);
  if (!p) throw new Error('Product not found');
  const nextVal = !p.is_active;
  await Product.findByIdAndUpdate(productId, { $set: { is_active: nextVal } });
  await touchBotLastModified();
  return nextVal;
};

export const updateProductGeneral = async (productId, data) => {
  const allowed = ['name', 'description', 'rules', 'delivery_process', 'delivery_time', 'category_id', 'global_priority'];
  const update = {};
  allowed.forEach(k => {
    if (data[k] !== undefined) update[k] = data[k];
  });
  await Product.findByIdAndUpdate(productId, { $set: update });
  await touchBotLastModified();
};

export const addStockToPool = async (productId, poolId, stockItems) => {
  const items = (Array.isArray(stockItems) ? stockItems : [stockItems]).map(s => String(s).trim()).filter(Boolean);
  if (!items.length) return;
  await Product.findByIdAndUpdate(productId, {
    $push: { [`stock_pools.${poolId}`]: { $each: items } }
  });
  await touchBotLastModified();
};

export const clearStockPool = async (productId, poolId) => {
  await Product.findByIdAndUpdate(productId, {
    $set: { [`stock_pools.${poolId}`]: [] }
  });
  await touchBotLastModified();
};

export const toggleInfinitePool = async (productId, poolId) => {
  const p = await Product.findById(productId);
  if (!p) throw new Error('Product not found');
  const current = !!(p.infinite_pools || {})[poolId];
  const nextVal = !current;
  await Product.findByIdAndUpdate(productId, {
    $set: { [`infinite_pools.${poolId}`]: nextVal }
  });
  await touchBotLastModified();
  return nextVal;
};

export const togglePreorderPool = async (productId, poolId) => {
  const p = await Product.findById(productId);
  if (!p) throw new Error('Product not found');
  const current = !!(p.preorder_pools || {})[poolId];
  const nextVal = !current;
  await Product.findByIdAndUpdate(productId, {
    $set: { [`preorder_pools.${poolId}`]: nextVal }
  });
  await touchBotLastModified();
  return nextVal;
};

export const updatePoolRules = async (productId, poolId, rules) => {
  await Product.findByIdAndUpdate(productId, {
    $set: { [`pool_rules.${poolId}`]: rules }
  });
  await touchBotLastModified();
};

export const createStockPool = async (productId, poolId, rules = '', isInfinite = false) => {
  await Product.findByIdAndUpdate(productId, {
    $set: {
      [`stock_pools.${poolId}`]: [],
      [`pool_rules.${poolId}`]: rules,
      [`infinite_pools.${poolId}`]: isInfinite,
      [`preorder_pools.${poolId}`]: false,
    }
  });
  await touchBotLastModified();
};

export const deleteStockPool = async (productId, poolId) => {
  await Product.findByIdAndUpdate(productId, {
    $unset: {
      [`stock_pools.${poolId}`]: '',
      [`pool_rules.${poolId}`]: '',
      [`infinite_pools.${poolId}`]: '',
      [`preorder_pools.${poolId}`]: '',
    }
  });
  await touchBotLastModified();
};

export const saveVariant = async (productId, variantId, variantData) => {
  const vid = variantId || `v-${Date.now().toString(36)}`;
  const poolId = variantData.pool_id || 'default';
  const updateObj = {
    [`variants.${vid}`]: {
      name: variantData.name,
      price: parseFloat(variantData.price),
      pool_id: poolId,
      duration: parseInt(variantData.duration || 1),
    }
  };

  if (variantData.compare_price !== undefined) {
    const cp = parseFloat(variantData.compare_price);
    updateObj[`website_meta.variants.${vid}.compare_price`] = !isNaN(cp) && cp > 0 ? cp : null;
  }

  if (variantData.create_pool && poolId) {
    updateObj[`stock_pools.${poolId}`] = [];
    updateObj[`infinite_pools.${poolId}`] = !!variantData.is_infinite;
    updateObj[`preorder_pools.${poolId}`] = false;
  }

  await Product.findByIdAndUpdate(productId, { $set: updateObj });
  await touchBotLastModified();
  return vid;
};

export const deleteVariant = async (productId, variantId) => {
  await Product.findByIdAndUpdate(productId, {
    $unset: {
      [`variants.${variantId}`]: '',
      [`website_meta.variants.${variantId}`]: '',
    }
  });
  await touchBotLastModified();
};

export const createBotProduct = async (productData) => {
  const crypto = await import('crypto');
  const pid = productData.id || `p-${crypto.randomBytes(3).toString('hex')}`;
  
  const poolId = productData.pool_id || 'default';
  const rawStock = productData.initial_stock || '';
  const stockLines = typeof rawStock === 'string'
    ? rawStock.split('\n').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(rawStock) ? rawStock : []);

  const isInfinite = !!productData.is_infinite;
  const isPreorder = !!productData.is_preorder;

  const newDoc = new Product({
    _id: pid,
    name: productData.name,
    description: productData.description || '',
    category_id: productData.category_id || 'cat-ott',
    delivery_process: productData.delivery_process || 'auto',
    delivery_time: productData.delivery_time || 'Instant Automated Delivery',
    rules: productData.rules || '',
    global_priority: 99,
    is_active: productData.is_active !== false,
    stock_pools: {
      [poolId]: stockLines,
    },
    infinite_pools: {
      [poolId]: isInfinite,
    },
    preorder_pools: {
      [poolId]: isPreorder,
    },
    pool_rules: {
      [poolId]: productData.pool_rules || '',
    },
    variants: {
      'v-1': {
        name: productData.variant_name || 'Standard Plan',
        price: parseFloat(productData.price || 0),
        pool_id: poolId,
        duration: parseInt(productData.duration || 1),
        is_infinite: isInfinite,
      },
    },
    website_meta: {
      title: productData.website_title || productData.name,
      description: productData.description || '',
      images: Array.isArray(productData.images) && productData.images.length > 0
        ? productData.images
        : (productData.images ? [productData.images] : ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop']),
      compare_price: parseFloat(productData.compare_price || 0),
      badge: productData.badge || '',
      is_featured: !!productData.is_featured,
      is_published: productData.is_published !== false,
    },
  });

  await newDoc.save();
  await touchBotLastModified();
  return formatProductForAPI(newDoc);
};

export const deleteBotProduct = async (productId) => {
  await Product.findByIdAndDelete(productId);
  await touchBotLastModified();
};



