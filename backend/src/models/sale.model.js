/**
 * Sale Schema — for website orders only.
 * Stored in MongoDB 'website_sales' collection (separate from bot's system.sales).
 * Bot does NOT read or write this collection.
 *
 * Bot's orders are in: db_mongo.system { _id: 'sales', data: [...] }
 * Website's orders are in: website_sales collection
 */

import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema(
  {
    // ── Order Identity ──────────────────────────────────────────────
    sale_id: { type: String, required: true, unique: true, index: true },
    source: { type: String, default: 'website' }, // always 'website'

    // ── Product Info (snapshot at time of purchase) ─────────────────
    product_id: { type: String, required: true },
    variant_id: { type: String, required: true },
    pool_id: { type: String, required: true },
    product_name: { type: String, required: true },
    variant_name: { type: String, required: true },

    // ── Pricing ─────────────────────────────────────────────────────
    price: { type: Number, required: true },           // final price paid
    original_price: { type: Number, required: true },  // before discounts
    coupon_code: { type: String, default: null },
    coupon_discount: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },

    // ── Customer (website user) ──────────────────────────────────────
    user_id: { type: String, required: true, index: true }, // website user id
    user_email: { type: String, default: '' },
    user_name: { type: String, default: '' },

    // ── Delivery ────────────────────────────────────────────────────
    credentials: { type: String, default: '' },  // delivered stock item
    status: {
      type: String,
      enum: ['Pending', 'Delivered', 'Pre-Order', 'Canceled', 'Refunded', 'On Hold'],
      default: 'Pending',
      index: true,
    },
    delivery_method: { type: String, default: 'auto' },  // "auto" | "manual"

    // ── Timestamps ──────────────────────────────────────────────────
    purchase_ts: { type: Number, default: () => Date.now() / 1000 },
    end_ts: { type: Number, default: null },  // subscription expiry
    last_edited_at: { type: Number, default: null },

    // ── Admin ───────────────────────────────────────────────────────
    admin_notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'website_sales', // separate from bot's system.sales
  }
);

const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
export default Sale;
