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

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all active products with computed stock info.
 * @param {Object} opts - { categoryId, search, sort, page, limit }
 */
export const getActiveProducts = async (opts = {}) => {
  const { categoryId, search, sort = 'priority', page = 1, limit = 24, isAdmin = false } = opts;

  // 1. Fetch Bot Products
  const botQuery = { is_active: true };
  if (!isAdmin) botQuery['website_meta.is_published'] = true;
  if (categoryId) botQuery.category_id = categoryId;
  if (search) botQuery.name = { $regex: search, $options: 'i' };

  let rawBotProducts = await Product.find(botQuery).lean();
  let mappedBotProducts = rawBotProducts.map((p) => formatProductForAPI(p, false));

  // 2. Fetch Website Products
  const webQuery = {};
  if (!isAdmin) webQuery.is_published = true;
  if (categoryId) webQuery.category_id = categoryId;
  if (search) webQuery.name = { $regex: search, $options: 'i' };

  let rawWebProducts = await WebsiteProduct.find(webQuery).lean();
  let mappedWebProducts = rawWebProducts.map((p) => ({
    id: p._id.toString(),
    name: p.name,
    title: p.name,
    description: p.description || '',
    rules: p.rules || '',
    min_price: p.price,
    max_price: p.price,
    images: p.images || [],
    badge: p.badge || '',
    is_featured: p.is_featured || false,
    is_published: p.is_published || false,
    compare_price: p.compare_price || null,
    category_id: p.category_id || null,
    delivery_process: 'manual',
    delivery_time: p.delivery_time || 'Instant',
    total_stock: 9999,
    in_stock: true,
    is_preorder: false,
    is_website_only: true,
  }));

  // 3. Combine
  let combined = [...mappedBotProducts, ...mappedWebProducts];

  // 4. Sort
  if (sort === 'price_asc') {
    combined.sort((a, b) => a.min_price - b.min_price);
  } else if (sort === 'price_desc') {
    combined.sort((a, b) => b.min_price - a.min_price);
  } else if (sort === 'name_asc') {
    combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else {
    // Default / Priority / Popular: Featured first, then newest (we just fallback to name/featured)
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
 * Get a single product by its bot ID (e.g. "p-abc123").
 */
export const getProductById = async (productId) => {
  // Check if it's a website product first (ObjectId length 24)
  if (productId.length === 24) {
    const webProd = await WebsiteProduct.findById(productId).lean();
    if (webProd) {
      return {
        id: webProd._id.toString(),
        name: webProd.name,
        title: webProd.name,
        description: webProd.description,
        rules: webProd.rules || '',
        min_price: webProd.price,
        max_price: webProd.price,
        images: webProd.images || [],
        badge: webProd.badge || '',
        is_featured: webProd.is_featured || false,
        compare_price: webProd.compare_price || null,
        category_id: webProd.category_id,
        delivery_process: 'manual',
        delivery_time: webProd.delivery_time,
        is_website_only: true,
        // Mock variants for the frontend standard structure
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
  }

  const p = await Product.findById(productId).lean();
  if (!p) return null;
  return formatProductForAPI(p, true); // full=true includes stock pool sizes
};

/**
 * Format a raw MongoDB product document into a clean API response.
 * Computes: min_price, max_price, total_stock, variants with stock info.
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
    const isPreorder = preorderPools[poolId] || false;
    const stockCount = isInfinite ? 9999 : poolStock.length;

    // Website-meta overrides for this variant
    const varMeta = websiteMeta.variants?.[vid] || {};
    
    // Rules priority: variant-specific → pool-level → global
    const rules =
      varMeta.rules ||
      (poolId ? poolRules[poolId] : '') ||
      p.rules ||
      '';

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
      description: varMeta.description || '',
      rules,
      delivery_time: varMeta.delivery_time || p.delivery_time || 'Instant',
      delivery_method: varMeta.delivery_method || p.delivery_process || 'auto',
    };
  });

  // Sort variants by price ascending
  variantList.sort((a, b) => a.price - b.price);

  const prices = variantList.map((v) => v.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const totalStock = variantList.reduce((sum, v) => sum + (v.is_infinite ? 9999 : v.stock), 0);
  const hasAnyStock = variantList.some((v) => v.in_stock);

  return {
    id: p._id,
    name: p.name,
    // Website display overrides
    title: websiteMeta.title || p.name,
    description: websiteMeta.description || p.description || '',
    rules: p.rules || '',
    images: websiteMeta.images || [],
    badge: websiteMeta.badge || '',
    is_featured: websiteMeta.is_featured || false,
    is_published: websiteMeta.is_published || false,
    compare_price: websiteMeta.compare_price || null,
    category_id: p.category_id || null,
    delivery_process: p.delivery_process || 'auto',
    delivery_time: p.delivery_time || 'Instant',
    is_active: p.is_active || false,
    min_price: minPrice,
    max_price: maxPrice,
    total_stock: totalStock,
    in_stock: hasAnyStock,
    is_preorder: variantList.some((v) => v.is_preorder),
    variants: variantList,
    // Full data only for product detail page
    ...(full && {
      pool_rules: poolRules,
      preorder_pools: preorderPools,
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
