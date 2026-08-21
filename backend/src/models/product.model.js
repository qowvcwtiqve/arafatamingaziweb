/**
 * Bot Product Schema — mirrors exact MongoDB structure used by Telegram bot.
 * The bot stores products with _id as string (e.g. "p-abc123").
 * We use strict:false so bot's new fields don't break the model.
 *
 * Structure (bot side, read-only from website):
 * {
 *   name, description, rules, delivery_process, delivery_time,
 *   is_active, category_id,
 *   variants: { "v-xxx": { name, price, pool_id, duration } },
 *   stock_pools: { "pool_a": ["cred1", "cred2", ...] },
 *   pool_rules: { "pool_a": "pool specific rules" },
 *   infinite_pools: { "pool_a": true/false },
 *   preorder_pools: { "pool_a": true/false }
 * }
 *
 * Website adds (website-only, bot ignores):
 * {
 *   website_meta: {
 *     images: ["url1"],
 *     title: "Custom title",
 *     description: "Rich description",
 *     badge: "Best Seller",
 *     variants: {
 *       "v-xxx": {
 *         rules: "Variant-specific rules",
 *         description: "Variant description",
 *         delivery_time: "Instant",
 *         delivery_method: "auto"  // "auto" | "manual"
 *       }
 *     }
 *   }
 * }
 */

import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    _id: { type: String },  // Bot uses string IDs like "p-abc123"

    // ── BOT FIELDS (read-only from website) ──────────────────────
    name: { type: String, required: true },
    description: { type: String, default: '' },
    rules: { type: String, default: '' },
    delivery_process: { type: String, default: 'auto' }, // "auto" | "manual"
    delivery_time: { type: String, default: 'Instant' },
    is_active: { type: Boolean, default: false },
    category_id: { type: String, default: null },

    // variants: { "v-abc": { name, price, pool_id, duration } }
    variants: { type: mongoose.Schema.Types.Mixed, default: {} },

    // stock_pools: { "pool_a": ["cred1", "cred2"] }
    stock_pools: { type: mongoose.Schema.Types.Mixed, default: {} },

    // pool_rules: { "pool_a": "rules text" }
    pool_rules: { type: mongoose.Schema.Types.Mixed, default: {} },

    // infinite_pools: { "pool_a": true }
    infinite_pools: { type: mongoose.Schema.Types.Mixed, default: {} },

    // preorder_pools: { "pool_a": true }
    preorder_pools: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── WEBSITE-ONLY FIELDS (bot completely ignores these) ────────
    website_meta: {
      images: { type: [String], default: [] },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      badge: { type: String, default: '' }, // e.g. "Best Seller", "New"
      is_featured: { type: Boolean, default: false },
      is_published: { type: Boolean, default: false }, // Draft state by default
      compare_price: { type: Number, default: null }, // Old price for UI strikethrough
      // Per-variant overrides
      variants: { type: mongoose.Schema.Types.Mixed, default: {} },
      // Structure: { "v-abc": { rules, description, delivery_time, delivery_method } }
    },
  },
  {
    strict: false, // Allow any extra bot fields without schema errors
    _id: false,    // We manage _id ourselves (string IDs)
    collection: 'products',  // Must match bot's collection name
  }
);

// ── HELPER: Compute stock count for a pool ────────────────────────────────────
ProductSchema.methods.getStockCount = function (pool_id) {
  const pool = (this.stock_pools || {})[pool_id] || [];
  if ((this.infinite_pools || {})[pool_id]) return Infinity;
  return pool.length;
};

// ── HELPER: Get effective rules for a variant ────────────────────────────────
ProductSchema.methods.getVariantRules = function (vid) {
  const pool_id = (this.variants || {})[vid]?.pool_id;
  // Priority: variant website_meta rules → pool_rules → global rules
  return (
    this.website_meta?.variants?.[vid]?.rules ||
    (pool_id ? (this.pool_rules || {})[pool_id] : '') ||
    this.rules ||
    ''
  );
};

// ── HELPER: Get effective delivery method for a variant ──────────────────────
ProductSchema.methods.getVariantDeliveryMethod = function (vid) {
  return (
    this.website_meta?.variants?.[vid]?.delivery_method ||
    this.delivery_process ||
    'auto'
  );
};

// ── HELPER: Get effective delivery time for a variant ────────────────────────
ProductSchema.methods.getVariantDeliveryTime = function (vid) {
  return (
    this.website_meta?.variants?.[vid]?.delivery_time ||
    this.delivery_time ||
    'Instant'
  );
};

// ── HELPER: Get website display title ────────────────────────────────────────
ProductSchema.methods.getDisplayTitle = function () {
  return this.website_meta?.title || this.name;
};

// ── HELPER: Get website display description ──────────────────────────────────
ProductSchema.methods.getDisplayDescription = function () {
  return this.website_meta?.description || this.description || '';
};

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export default Product;
