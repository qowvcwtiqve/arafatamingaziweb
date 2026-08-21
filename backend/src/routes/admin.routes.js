import { Router } from 'express';
import { query } from '../config/db.js';
import { protect, requireAdmin } from '../middleware/auth.middleware.js';

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

export default router;
