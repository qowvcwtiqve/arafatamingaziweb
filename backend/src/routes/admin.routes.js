import { Router } from 'express';
import { query } from '../config/db.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';
import Sale from '../models/sale.model.js';
import {
  getActiveProducts,
  getAllCategories,
  updateWebsiteMeta,
  updateVariantMeta,
  updateCategoryMeta,
  getProductById,
  createWebsiteProduct,
  deleteWebsiteProduct
} from '../services/botdb.service.js';
import Product from '../models/product.model.js';
import Category from '../models/category.model.js';


const router = Router();

// All admin routes require auth + admin role
router.use(protect, requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [orders, users, products, revenue] = await Promise.all([
      query("SELECT COUNT(*) FROM orders WHERE payment_status='paid'"),
      query('SELECT COUNT(*) FROM users'),
      query("SELECT COUNT(*) FROM products WHERE status='active'"),
      query("SELECT COALESCE(SUM(total_amount),0) AS total FROM orders WHERE payment_status='paid'"),
    ]);
    res.json({
      paid_orders: parseInt(orders.rows[0]?.count ?? 12),
      total_users: parseInt(users.rows[0]?.count ?? 2),
      active_products: parseInt(products.rows[0]?.count ?? 6),
      total_revenue: parseFloat(revenue.rows[0]?.total ?? 14500),
    });
  } catch (err) { next(err); }
});

// GET /api/admin/orders
router.get('/orders', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const cond = status ? `WHERE o.payment_status='${status}'` : '';
    const { rows } = await query(`
      SELECT o.*, u.name AS buyer_name, u.email AS buyer_email
      FROM orders o LEFT JOIN users u ON u.id=o.buyer_id
      ${cond} ORDER BY o.created_at DESC LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);
    res.json({ orders: rows });
  } catch (err) { next(err); }
});

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await query(
      'SELECT id,name,email,role,balance,currency,is_frozen,created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), offset]
    );
    res.json({ users: rows });
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/freeze
router.put('/users/:id/freeze', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot freeze your own admin account.' });
    }
    const { rows } = await query(
      'UPDATE users SET is_frozen=NOT is_frozen, updated_at=NOW() WHERE id=$1 RETURNING id,name,is_frozen',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/admin/users/:id/balance
router.put('/users/:id/balance', async (req, res, next) => {
  try {
    const { action, amount } = req.body; // action: 'add' | 'deduct' | 'reset'
    let sql;
    if (action === 'add') sql = 'UPDATE users SET balance=balance+$1, updated_at=NOW() WHERE id=$2 RETURNING balance';
    else if (action === 'deduct') sql = 'UPDATE users SET balance=GREATEST(0,balance-$1), updated_at=NOW() WHERE id=$2 RETURNING balance';
    else sql = 'UPDATE users SET balance=0, updated_at=NOW() WHERE id=$2 RETURNING balance';
    const { rows } = await query(sql, action === 'reset' ? [null, req.params.id] : [parseFloat(amount), req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/admin/products
router.get('/products', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM products ORDER BY created_at DESC LIMIT 100');
    res.json({ products: rows });
  } catch (err) { next(err); }
});

// POST /api/admin/products
router.post('/products', async (req, res, next) => {
  try {
    const {
      title, slug, description, short_desc, price, sale_price,
      category, tags, thumbnail_url, file_url, file_size, file_type,
      demo_url, version, stock_type, is_infinite_stock, infinite_stock_item,
      stock_keys // for variants
    } = req.body;

    const seller_id = req.user.id;

    // 1. Insert Product
    const { rows: prodRows } = await query(`
      INSERT INTO products (
        seller_id, title, slug, description, short_desc, price, sale_price,
        category, tags, thumbnail_url, file_url, file_size, file_type,
        demo_url, version, stock_type, is_infinite_stock, infinite_stock_item
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *
    `, [
      seller_id, title, slug, description, short_desc, price, sale_price,
      category, tags, thumbnail_url, file_url, file_size, file_type,
      demo_url, version, stock_type, is_infinite_stock, infinite_stock_item
    ]);

    const newProduct = prodRows[0];

    // 2. If it's a keys-based product, add a default variant to hold the keys
    if (stock_type === 'keys' && stock_keys) {
      await query(`
        INSERT INTO product_variants (
          product_id, name, price, stock_keys, is_infinite_stock, infinite_stock_item
        ) VALUES ($1,$2,$3,$4,$5,$6)
      `, [
        newProduct.id, 'Standard License', price, stock_keys, false, null
      ]);
    }

    res.status(201).json({ product: newProduct });
  } catch (err) { next(err); }
});

// GET /api/admin/products/:id
router.get('/products/:id', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    
    // Also fetch variants to populate keys
    const variants = await query('SELECT * FROM product_variants WHERE product_id=$1', [req.params.id]);
    res.json({ product: rows[0], variants: variants.rows });
  } catch (err) { next(err); }
});

// PUT /api/admin/products/:id/feature
router.put('/products/:id/feature', async (req, res, next) => {
  try {
    const { rows } = await query('UPDATE products SET is_featured=NOT is_featured WHERE id=$1 RETURNING id,is_featured', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/admin/deposits
router.get('/deposits', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT d.*, u.name AS user_name, u.email AS user_email
      FROM deposits d LEFT JOIN users u ON u.id=d.user_id
      ORDER BY d.created_at DESC LIMIT 100
    `);
    res.json({ deposits: rows });
  } catch (err) { next(err); }
});

// POST /api/admin/coupons
router.post('/coupons', async (req, res, next) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = req.body;
    const { rows } = await query(`
      INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, expires_at)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [code.toUpperCase(), discount_type, discount_value, min_order_amount || 0, max_uses || 100, expires_at || null]);
    res.status(201).json({ coupon: rows[0] });
  } catch (err) { next(err); }
});

router.get('/coupons', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: rows });
  } catch (err) { next(err); }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM product_variants WHERE product_id=$1', [req.params.id]);
    await query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM coupons WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (err) { next(err); }
});

// POST /api/admin/categories
router.post('/categories', async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug || '', description || '']
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', async (req, res, next) => {
  try {
    const { name, slug, description } = req.body;
    const { rows } = await query(
      'UPDATE categories SET name=$1, slug=$2, description=$3 WHERE id=$4 RETURNING *',
      [name, slug, description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
});

// ════════════════════════════════════════════════════════════════════════════
// BOT PRODUCTS & WEBSITE PRODUCTS
// ════════════════════════════════════════════════════════════════════════════

router.post('/website-products', async (req, res, next) => {
  try {
    const { name, description, rules, price, category_id, images, compare_price, badge, delivery_time, is_featured, is_published } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });
    const p = await createWebsiteProduct({
      name,
      description,
      rules: rules || '',
      price: parseFloat(price),
      compare_price: compare_price ? parseFloat(compare_price) : null,
      category_id,
      images: images || [],
      badge: badge || '',
      delivery_time: delivery_time || 'Instant',
      is_featured: !!is_featured,
      is_published: !!is_published,
    });
    res.json({ product: p });
  } catch (err) { next(err); }
});

// DELETE /api/admin/website-products/:id — Delete a website-only product
router.delete('/website-products/:id', async (req, res, next) => {
  try {
    await deleteWebsiteProduct(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { next(err); }
});

// GET /api/admin/bot/products — list all products (bot + website)
router.get('/bot/products', async (req, res, next) => {
  try {
    // Using our unified function to get both bot and website products
    // Pass isAdmin=true to get drafted/inactive products too
    const result = await getActiveProducts({ limit: 1000, isAdmin: true, sort: 'name_asc' });
    
    // getActiveProducts already formats everything nicely.
    // However, the admin dashboard expects `website_meta` object format.
    // Let's re-map it back for the dashboard.
    const mapped = result.products.map(p => ({
      id: p.id,
      name: p.name,
      category_id: p.category_id,
      description: p.description,
      is_active: true,
      variants: p.variants || [],
      pools: {},
      is_website_only: p.is_website_only,
      website_meta: {
        title: p.title,
        description: p.description,
        images: p.images,
        badge: p.badge,
        is_featured: p.is_featured,
        is_published: p.is_published,
        compare_price: p.compare_price,
      }
    }));
    
    res.json({ products: mapped });
  } catch (err) { next(err); }
});
// GET /api/admin/bot/products/:id — single product detail with full stock count
router.get('/bot/products/:id', async (req, res, next) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (err) { next(err); }
});

// PUT /api/admin/bot/products/:id/website-meta — update product website_meta
router.put('/bot/products/:id/website-meta', async (req, res, next) => {
  try {
    const allowed = ['title', 'description', 'images', 'badge', 'is_featured', 'is_published', 'compare_price'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    await updateWebsiteMeta(req.params.id, update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /api/admin/bot/products/:id/variants/:vid/meta — update variant website_meta
// Supports: rules, description, delivery_time, delivery_method
router.put('/bot/products/:id/variants/:vid/meta', async (req, res, next) => {
  try {
    const allowed = ['rules', 'description', 'delivery_time', 'delivery_method'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    await updateVariantMeta(req.params.id, req.params.vid, update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /api/admin/bot/categories/:id/meta — update category website_meta
router.put('/bot/categories/:id/meta', async (req, res, next) => {
  try {
    const allowed = ['image', 'description', 'icon'];
    const update = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Nothing to update' });
    await updateCategoryMeta(req.params.id, update);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/admin/bot/categories — all categories with website_meta
router.get('/bot/categories', async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ categories });
  } catch (err) { next(err); }
});

// ════════════════════════════════════════════════════════════════════════════
// WEBSITE ORDERS (website_sales MongoDB collection)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/website-orders — list website orders
router.get('/website-orders', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, user_id, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (user_id) filter.user_id = user_id;
    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: 'i' } },
        { sale_id: { $regex: search, $options: 'i' } },
        { user_name: { $regex: search, $options: 'i' } },
        { user_email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      Sale.find(filter).sort({ purchase_ts: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Sale.countDocuments(filter),
    ]);

    res.json({
      orders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) { next(err); }
});

// GET /api/admin/website-orders/:saleId — single order detail
router.get('/website-orders/:saleId', async (req, res, next) => {
  try {
    const order = await Sale.findOne({ sale_id: req.params.saleId }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) { next(err); }
});

// PUT /api/admin/website-orders/:saleId/status — update order status
router.put('/website-orders/:saleId/status', async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const validStatuses = ['Pending', 'Delivered', 'Pre-Order', 'Canceled', 'Refunded', 'On Hold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const update = { status };
    if (admin_notes !== undefined) update.admin_notes = admin_notes;

    const order = await Sale.findOneAndUpdate(
      { sale_id: req.params.saleId },
      { $set: update },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
});

// PUT /api/admin/website-orders/:saleId/credentials — replace credentials
router.put('/website-orders/:saleId/credentials', async (req, res, next) => {
  try {
    const { credentials } = req.body;
    if (!credentials) return res.status(400).json({ error: 'credentials is required' });
    const now = Math.floor(Date.now() / 1000);
    const order = await Sale.findOneAndUpdate(
      { sale_id: req.params.saleId },
      { $set: { credentials, last_edited_at: now, status: 'Delivered' } },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) { next(err); }
});

// DELETE /api/admin/website-orders/:saleId — delete order
router.delete('/website-orders/:saleId', async (req, res, next) => {
  try {
    const result = await Sale.deleteOne({ sale_id: req.params.saleId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ════════════════════════════════════════════════════════════════════════════
// WEBSITE ORDER STATS
// ════════════════════════════════════════════════════════════════════════════

// GET /api/admin/website-stats — combined stats
router.get('/website-stats', async (req, res, next) => {
  try {
    const [totalOrders, delivered, pending, revenue, activeProducts, categories] = await Promise.all([
      Sale.countDocuments(),
      Sale.countDocuments({ status: 'Delivered' }),
      Sale.countDocuments({ status: 'Pending' }),
      Sale.aggregate([{ $group: { _id: null, total: { $sum: '$price' } } }]),
      Product.countDocuments({ is_active: true }),
      Category.countDocuments(),
    ]);

    // Also get website user count from local db
    let totalUsers = 0;
    try {
      const { rows } = await query('SELECT COUNT(*) FROM users');
      totalUsers = parseInt(rows[0]?.count || 0);
    } catch (_) {}

    res.json({
      total_orders: totalOrders,
      delivered_orders: delivered,
      pending_orders: pending,
      total_revenue: revenue[0]?.total || 0,
      active_products: activeProducts,
      total_categories: categories,
      total_users: totalUsers,
    });
  } catch (err) { next(err); }
});

export default router;

