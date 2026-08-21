/**
 * Product Routes — backed by MongoDB Atlas (bot's database)
 * GET /api/products          — list active products
 * GET /api/products/categories — list categories
 * GET /api/products/:id      — single product detail
 */

import { Router } from 'express';
import { protect, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import {
  getActiveProducts,
  getProductById,
  getAllCategories,
  updateWebsiteMeta,
  updateVariantMeta,
} from '../services/botdb.service.js';

const router = Router();

// ── GET /api/products ───────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 24, category, search, sort = 'priority' } = req.query;
    const result = await getActiveProducts({ categoryId: category, search, sort, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/categories ────────────────────────────────────────────
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/products/:id ────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:id/website-meta (admin only) ──────────────────────────
// Updates website_meta: title, description, images, badge, is_featured
router.put('/:id/website-meta', protect, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'images', 'badge', 'is_featured'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    await updateWebsiteMeta(req.params.id, update);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/products/:id/variants/:vid/meta (admin only) ────────────────────
// Updates variant-level: rules, description, delivery_time, delivery_method
router.put('/:id/variants/:vid/meta', protect, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['rules', 'description', 'delivery_time', 'delivery_method'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    await updateVariantMeta(req.params.id, req.params.vid, update);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
