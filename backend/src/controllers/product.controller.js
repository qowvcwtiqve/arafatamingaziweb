import slugify from 'slugify';
import { query } from '../config/db.js';

// GET /api/products — list with filters
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 12,
      category, search, sort = 'newest',
      featured, min_price, max_price,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["p.status = 'active'"];
    const params = [];

    if (category) { params.push(category); conditions.push(`p.category = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(p.title ILIKE $${params.length} OR p.short_desc ILIKE $${params.length})`); }
    if (featured === 'true') conditions.push('p.is_featured = true');
    if (min_price) { params.push(parseFloat(min_price)); conditions.push(`p.price >= $${params.length}`); }
    if (max_price) { params.push(parseFloat(max_price)); conditions.push(`p.price <= $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortMap = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      popular: 'p.downloads_count DESC',
      rating: 'p.rating_avg DESC',
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    params.push(parseInt(limit), offset);
    const dataQuery = `
      SELECT p.id, p.title, p.slug, p.price, p.sale_price, p.category,
             p.thumbnail_url, p.tags, p.rating_avg, p.rating_count,
             p.downloads_count, p.is_featured, p.short_desc, p.created_at,
             u.name AS seller_name
      FROM products p
      LEFT JOIN users u ON u.id = p.seller_id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countQuery = `SELECT COUNT(*) FROM products p ${where}`;
    const countParams = params.slice(0, -2);

    const [data, countResult] = await Promise.all([
      query(dataQuery, params),
      query(countQuery, countParams),
    ]);

    res.json({
      products: data.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
    });
  } catch (err) { next(err); }
};

// GET /api/products/:slug
export const getProduct = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT p.*, u.name AS seller_name, u.avatar_url AS seller_avatar
      FROM products p
      LEFT JOIN users u ON u.id = p.seller_id
      WHERE p.slug = $1 AND p.status = 'active'
    `, [req.params.slug]);

    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });

    // Get variants
    const variants = await query('SELECT * FROM product_variants WHERE product_id=$1 ORDER BY display_order', [rows[0].id]);

    // Get reviews (latest 10)
    const reviews = await query(`
      SELECT r.*, u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
      FROM reviews r JOIN users u ON u.id = r.buyer_id
      WHERE r.product_id=$1 AND r.is_approved=true
      ORDER BY r.created_at DESC LIMIT 10
    `, [rows[0].id]);

    // Increment view count
    await query('UPDATE products SET views_count = views_count + 1 WHERE id=$1', [rows[0].id]);

    res.json({ product: rows[0], variants: variants.rows, reviews: reviews.rows });
  } catch (err) { next(err); }
};

// GET /api/products/categories
export const getCategories = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT category, COUNT(*) as count
      FROM products WHERE status='active' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `);
    res.json({ categories: rows });
  } catch (err) { next(err); }
};

// POST /api/products — admin/seller create
export const createProduct = async (req, res, next) => {
  try {
    const {
      title, description, short_desc, price, sale_price,
      category, tags, thumbnail_url, file_url, file_size,
      file_type, demo_url, version, stock_type,
      is_infinite_stock, infinite_stock_item,
    } = req.body;

    if (!title || !price) return res.status(400).json({ error: 'Title and price required' });

    let slug = slugify(title, { lower: true, strict: true });
    // Ensure unique slug
    const existing = await query('SELECT id FROM products WHERE slug=$1', [slug]);
    if (existing.rows[0]) slug = `${slug}-${Date.now()}`;

    const { rows } = await query(`
      INSERT INTO products (seller_id, title, slug, description, short_desc, price, sale_price,
        category, tags, thumbnail_url, file_url, file_size, file_type, demo_url, version,
        stock_type, is_infinite_stock, infinite_stock_item)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *
    `, [
      req.user.id, title, slug, description, short_desc, price, sale_price || null,
      category, tags || [], thumbnail_url, file_url, file_size, file_type,
      demo_url, version || '1.0', stock_type || 'file',
      is_infinite_stock || false, infinite_stock_item || null,
    ]);

    res.status(201).json({ product: rows[0] });
  } catch (err) { next(err); }
};

// PUT /api/products/:id — update
export const updateProduct = async (req, res, next) => {
  try {
    const fields = ['title','description','short_desc','price','sale_price','category','tags',
      'thumbnail_url','file_url','demo_url','version','status','is_featured','stock_type',
      'is_infinite_stock','infinite_stock_item'];

    const updates = [];
    const values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        values.push(req.body[f]);
        updates.push(`${f}=$${values.length}`);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id, req.user.id);
    const ownerClause = req.user.role === 'admin' ? '' : `AND seller_id=$${values.length}`;

    const { rows } = await query(
      `UPDATE products SET ${updates.join(',')}, updated_at=NOW() WHERE id=$${values.length - 1} ${ownerClause} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json({ product: rows[0] });
  } catch (err) { next(err); }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const ownerClause = req.user.role === 'admin' ? 'WHERE id=$1' : 'WHERE id=$1 AND seller_id=$2';
    const params = req.user.role === 'admin' ? [req.params.id] : [req.params.id, req.user.id];
    const { rowCount } = await query(`DELETE FROM products ${ownerClause}`, params);
    if (!rowCount) return res.status(404).json({ error: 'Product not found or unauthorized' });
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};
