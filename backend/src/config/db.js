import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DB_PATH = path.join(__dirname, '../../data/local_db.json');

// Ensure data folder exists
const dataDir = path.dirname(LOCAL_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial Seed Data
const DEFAULT_ADMIN_HASH = bcrypt.hashSync('admin123', 10);

const INITIAL_SEED = {
  users: [
    {
      id: 'usr-admin-001',
      name: 'Arafat Admin',
      email: 'arafatamingazi@gmail.com',
      password_hash: bcrypt.hashSync('Arafat@1213', 10),
      role: 'admin',
      balance: 10000.0,
      currency: 'INR',
      all_time_topup: 10000.0,
      is_verified: true,
      is_frozen: false,
      telegram_username: '@arafatamingazi',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-admin-002',
      name: 'QuantumXD Admin',
      email: 'admin@quantumxd.store',
      password_hash: DEFAULT_ADMIN_HASH,
      role: 'admin',
      balance: 5000.0,
      currency: 'INR',
      all_time_topup: 5000.0,
      is_verified: true,
      is_frozen: false,
      telegram_username: '@quantumxd_admin',
      created_at: new Date().toISOString(),
    },
    {
      id: 'usr-demo-002',
      name: 'Demo Buyer',
      email: 'demo@quantumxd.store',
      password_hash: bcrypt.hashSync('demo123', 10),
      role: 'buyer',
      balance: 1500.0,
      currency: 'INR',
      all_time_topup: 1500.0,
      is_verified: true,
      is_frozen: false,
      telegram_username: '@demobuyer',
      created_at: new Date().toISOString(),
    },
  ],
  products: [],
  product_variants: [],
  orders: [],
  order_items: [],
  deposits: [],
  coupons: [
    {
      id: 'coup-001',
      code: 'WELCOME20',
      discount_type: 'percent',
      discount_value: 20,
      min_order_amount: 0,
      max_uses: 500,
      used_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],
  reviews: [],
  processed_payment_ids: [],
  exchange_rate_cache: [{ from_currency: 'USD', to_currency: 'INR', rate: 84.5, fetched_at: new Date().toISOString() }],
};

// Initialize Local DB if missing
if (!fs.existsSync(LOCAL_DB_PATH)) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(INITIAL_SEED, null, 2), 'utf-8');
}

export function readLocalDb() {
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_SEED;
  }
}

export function writeLocalDb(data) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local DB:', err);
  }
}

// Check if external Postgres is configured and valid
const isPlaceholderDb = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('YOUR_PROJECT');

let pgPool = null;
if (!isPlaceholderDb) {
  try {
    const { Pool } = pg;
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 2000,
    });
    pgPool.on('error', (err) => {
      console.warn('Postgres connection issue, using local DB fallback');
    });
  } catch {
    pgPool = null;
  }
}

// Unified Query Function with smart SQL parser for Local DB fallback
export async function query(sql, params = []) {
  if (pgPool) {
    try {
      return await pgPool.query(sql, params);
    } catch (err) {
      // Fallback to local DB handler below
    }
  }

  // === LOCAL DB EMULATOR ===
  const db = readLocalDb();
  const lowerSql = sql.trim().toLowerCase();

  // 1. SELECT products
  if (lowerSql.startsWith('select p.id, p.title') || lowerSql.startsWith('select p.*') || (lowerSql.includes('from products') && lowerSql.startsWith('select'))) {
    let prods = [...(db.products || [])];
    
    // Single product by slug
    if (lowerSql.includes('where p.slug = $1') || lowerSql.includes('where slug = $1') || lowerSql.includes('p.slug = $1')) {
      const slug = params[0];
      const match = prods.find(p => p.slug === slug && p.status === 'active');
      return { rows: match ? [match] : [] };
    }

    // Single product by id
    if (lowerSql.includes('where p.id = $1') || lowerSql.includes('where id = $1') || lowerSql.includes('p.id = $1')) {
      const id = params[0];
      const match = prods.find(p => p.id === id);
      return { rows: match ? [match] : [] };
    }

    // Category filter
    const catParam = params.find(p => typeof p === 'string' && ['software', 'tools', 'accounts', 'templates', 'scripts', 'other'].includes(p.toLowerCase()));
    if (catParam) {
      prods = prods.filter(p => p.category?.toLowerCase() === catParam.toLowerCase());
    }

    // Featured filter
    if (lowerSql.includes('is_featured = true') || lowerSql.includes('p.is_featured = true')) {
      prods = prods.filter(p => p.is_featured);
    }

    // Search filter
    const searchParam = params.find(p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'));
    if (searchParam) {
      const q = searchParam.replace(/%/g, '').toLowerCase();
      prods = prods.filter(p => p.title.toLowerCase().includes(q) || (p.short_desc || '').toLowerCase().includes(q));
    }

    // Sort
    if (lowerSql.includes('downloads_count desc')) {
      prods.sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0));
    } else if (lowerSql.includes('price asc')) {
      prods.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
    } else if (lowerSql.includes('price desc')) {
      prods.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
    } else {
      prods.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return { rows: prods };
  }

  // 2. COUNT products
  if (lowerSql.includes('select count(*)') && lowerSql.includes('from products')) {
    const count = (db.products || []).filter(p => p.status === 'active').length;
    return { rows: [{ count }] };
  }

  // 3. Categories count
  if (lowerSql.includes('from products') && lowerSql.includes('group by category')) {
    const counts = {};
    (db.products || []).forEach(p => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const rows = Object.entries(counts).map(([category, count]) => ({ category, count }));
    return { rows };
  }

  // 4. Product Variants
  if (lowerSql.includes('from product_variants')) {
    if (lowerSql.includes('pv.id=$1') || lowerSql.includes('pv.id = $1') || lowerSql.includes('where id=$1')) {
      const varId = params[0];
      const variant = (db.product_variants || []).find(v => v.id === varId);
      if (variant) {
        const prod = (db.products || []).find(p => p.id === variant.product_id) || {};
        return {
          rows: [{
            ...variant,
            title: prod.title || variant.name,
            p_infinite: prod.is_infinite_stock || false,
            p_item: prod.infinite_stock_item || null,
          }]
        };
      }
      return { rows: [] };
    }

    if (lowerSql.includes('where product_id=$1') || lowerSql.includes('where product_id = $1')) {
      const prodId = params[0];
      const variants = (db.product_variants || []).filter(v => v.product_id === prodId);
      return { rows: variants };
    }
    return { rows: db.product_variants || [] };
  }

  // 5. Reviews
  if (lowerSql.includes('from reviews') && lowerSql.includes('product_id=$1')) {
    const prodId = params[0];
    const revs = (db.reviews || []).filter(r => r.product_id === prodId);
    return { rows: revs };
  }

  // 6. Users (Auth)
  if (lowerSql.includes('from users') && (lowerSql.includes('where email=$1') || lowerSql.includes('where email = $1'))) {
    const email = params[0]?.toLowerCase();
    const user = (db.users || []).find(u => u.email.toLowerCase() === email);
    return { rows: user ? [user] : [] };
  }

  if (lowerSql.includes('from users') && (lowerSql.includes('where id=$1') || lowerSql.includes('where id = $1'))) {
    const id = params[0];
    const user = (db.users || []).find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }

  // Get all users
  if (lowerSql.includes('select ') && lowerSql.includes('from users') && !lowerSql.includes('where ') && !lowerSql.includes('count(')) {
    return { rows: db.users || [] };
  }

  // Update user freeze
  if (lowerSql.startsWith('update users') && lowerSql.includes('is_frozen=not is_frozen')) {
    const id = params[0];
    const user = (db.users || []).find(u => u.id === id);
    if (user) {
      user.is_frozen = !user.is_frozen;
      writeLocalDb(db);
      return { rows: [user] };
    }
    return { rows: [] };
  }

  // Update user balance
  if (lowerSql.startsWith('update users') && lowerSql.includes('balance=')) {
    const id = params[params.length - 1];
    const user = (db.users || []).find(u => u.id === id);
    if (user) {
      if (lowerSql.includes('balance=0')) {
        user.balance = 0;
      } else if (lowerSql.includes('balance=balance+$1')) {
        user.balance += parseFloat(params[0]);
      } else if (lowerSql.includes('balance-$1')) {
        user.balance = Math.max(0, user.balance - parseFloat(params[0]));
      }
      writeLocalDb(db);
      return { rows: [user] };
    }
    return { rows: [] };
  }

  // Insert user
  if (lowerSql.startsWith('insert into users')) {
    const [name, email, password_hash] = params;
    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password_hash,
      role: 'buyer',
      balance: 0.0,
      currency: 'INR',
      all_time_topup: 0.0,
      is_verified: true,
      is_frozen: false,
      created_at: new Date().toISOString(),
    };
    db.users = db.users || [];
    db.users.push(newUser);
    writeLocalDb(db);
    return { rows: [newUser] };
  }

  // 7. Orders
  if (lowerSql.startsWith('insert into orders')) {
    const [order_number, buyer_id, buyer_email, total_amount, discount_amount, coupon_code, payment_method, payment_status, base_amount, timeout_at] = params;
    const newOrder = {
      id: `ord-${Date.now()}`,
      order_number,
      buyer_id,
      buyer_email,
      total_amount,
      discount_amount: discount_amount || 0,
      coupon_code,
      payment_method,
      payment_status: payment_status || 'pending',
      base_amount,
      timeout_at,
      created_at: new Date().toISOString(),
    };
    if (payment_status === 'paid') newOrder.paid_at = new Date().toISOString();
    db.orders = db.orders || [];
    db.orders.push(newOrder);
    writeLocalDb(db);
    return { rows: [newOrder] };
  }

  if (lowerSql.includes('from orders') && lowerSql.includes('where o.id=$1')) {
    const id = params[0];
    const order = (db.orders || []).find(o => o.id === id);
    return { rows: order ? [order] : [] };
  }

  if (lowerSql.includes('from orders') && lowerSql.includes('left join users')) {
    const limit = params[0] || 20;
    const offset = params[1] || 0;
    const statusMatch = lowerSql.match(/payment_status='([^']+)'/);
    let allOrders = [...(db.orders || [])];
    if (statusMatch && statusMatch[1]) {
      allOrders = allOrders.filter(o => o.payment_status === statusMatch[1]);
    }
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const paginated = allOrders.slice(offset, offset + limit).map(o => {
      const u = (db.users || []).find(usr => usr.id === o.buyer_id) || {};
      return { ...o, buyer_name: u.name || 'Unknown', buyer_email: u.email || o.buyer_email };
    });
    return { rows: paginated };
  }

  if (lowerSql.includes('from orders') && lowerSql.includes('where o.buyer_id=$1')) {
    const buyerId = params[0];
    const userOrders = JSON.parse(JSON.stringify((db.orders || []).filter(o => o.buyer_id === buyerId)));
    userOrders.forEach(o => {
      o.items = (db.order_items || []).filter(oi => oi.order_id === o.id);
    });
    return { rows: userOrders };
  }

  if (lowerSql.includes('from orders') && lowerSql.includes('where id=$1')) {
    const id = params[0];
    const order = (db.orders || []).find(o => o.id === id);
    return { rows: order ? [order] : [] };
  }

  if (lowerSql.startsWith('update orders')) {
    const id = params[params.length - 1];
    const order = (db.orders || []).find(o => o.id === id);
    if (order) {
      if (lowerSql.includes('payment_status=')) {
        if (lowerSql.includes("'paid'")) {
          order.payment_status = 'paid';
          order.paid_at = new Date().toISOString();
        }
      }
      if (lowerSql.includes('gateway_payment_id=$1')) {
        order.gateway_payment_id = params[0];
        order.invoice_url = params[1];
      }
      writeLocalDb(db);
    }
    return { rows: [], rowCount: order ? 1 : 0 };
  }

  // 8. Order items
  if (lowerSql.startsWith('insert into order_items')) {
    const [order_id, product_id, variant_id, product_title, variant_name, price, delivered_content] = params;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_id,
      product_id,
      variant_id,
      product_title,
      variant_name,
      price,
      delivered_content,
      download_token: `tok_${Math.random().toString(36).slice(2, 14)}`,
      download_count: 0,
      max_downloads: 5,
      created_at: new Date().toISOString(),
    };
    db.order_items = db.order_items || [];
    db.order_items.push(newItem);
    writeLocalDb(db);
    return { rows: [newItem] };
  }

  // Download token lookup
  if (lowerSql.includes('from order_items') && lowerSql.includes('download_token=$1')) {
    const token = params[0];
    const item = (db.order_items || []).find(oi => oi.download_token === token);
    return { rows: item ? [item] : [] };
  }

  // 9. Coupons
  if (lowerSql.startsWith('insert into coupons')) {
    const [code, discount_type, discount_value, min_order_amount, max_uses, expires_at] = params;
    const newCoupon = {
      id: `coup-${Date.now()}`,
      code: code.toUpperCase(),
      discount_type,
      discount_value: parseFloat(discount_value),
      min_order_amount: parseFloat(min_order_amount || 0),
      max_uses: parseInt(max_uses || 100),
      used_count: 0,
      expires_at: expires_at || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    db.coupons = db.coupons || [];
    db.coupons.unshift(newCoupon);
    writeLocalDb(db);
    return { rows: [newCoupon] };
  }

  if (lowerSql.startsWith('delete from coupons')) {
    const coupId = params[0];
    db.coupons = (db.coupons || []).filter(c => c.id !== coupId && c.code !== coupId);
    writeLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (lowerSql.startsWith('update coupons')) {
    if (lowerSql.includes('used_count=used_count+1')) {
      const coupId = params[0];
      const coupon = (db.coupons || []).find(c => c.id === coupId || c.code === coupId);
      if (coupon) {
        coupon.used_count = (coupon.used_count || 0) + 1;
        writeLocalDb(db);
        return { rows: [coupon] };
      }
    }
    return { rows: [] };
  }

  if (lowerSql.includes('from coupons') && lowerSql.includes('where code=$1')) {
    const code = params[0]?.toUpperCase();
    const coupon = (db.coupons || []).find(c => c.code === code && (c.is_active !== false));
    return { rows: coupon ? [coupon] : [] };
  }

  if (lowerSql.includes('from coupons')) {
    return { rows: db.coupons || [] };
  }

  // Delete product & variants
  if (lowerSql.startsWith('delete from products')) {
    const prodId = params[0];
    db.products = (db.products || []).filter(p => p.id !== prodId);
    writeLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (lowerSql.startsWith('delete from product_variants')) {
    const prodId = params[0];
    db.product_variants = (db.product_variants || []).filter(v => v.product_id !== prodId && v.id !== prodId);
    writeLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  // 10. Admin stats
  if (lowerSql.includes('count(*)') && lowerSql.includes('from users')) {
    return { rows: [{ count: (db.users || []).length }] };
  }

  if (lowerSql.includes('count(*)') && lowerSql.includes('from orders')) {
    const count = (db.orders || []).filter(o => o.payment_status === 'paid').length;
    return { rows: [{ count }] };
  }

  if (lowerSql.includes('sum(total_amount)')) {
    const total = (db.orders || []).filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    return { rows: [{ total: total || 0 }] };
  }

  // 11. Deposits
  if (lowerSql.includes('from deposits')) {
    return { rows: db.deposits || [] };
  }

  // 12. Exchange rate cache
  if (lowerSql.includes('from exchange_rate_cache')) {
    return { rows: [{ rate: 84.5, fetched_at: new Date().toISOString() }] };
  }

  // 13. Categories
  if (lowerSql.startsWith('insert into categories')) {
    const [name, slug, description] = params;
    const newCategory = {
      id: `cat-${Date.now()}`,
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: description || '',
      created_at: new Date().toISOString(),
    };
    db.categories = db.categories || [];
    db.categories.push(newCategory);
    writeLocalDb(db);
    return { rows: [newCategory] };
  }

  if (lowerSql.startsWith('update categories')) {
    const id = params[params.length - 1];
    const cat = (db.categories || []).find(c => c.id === id);
    if (cat) {
      if (lowerSql.includes('name=$1')) {
        cat.name = params[0];
        cat.slug = params[1];
        cat.description = params[2];
      }
      writeLocalDb(db);
      return { rows: [cat] };
    }
    return { rows: [] };
  }

  if (lowerSql.startsWith('delete from categories')) {
    const id = params[0];
    db.categories = (db.categories || []).filter(c => c.id !== id);
    writeLocalDb(db);
    return { rows: [], rowCount: 1 };
  }

  if (lowerSql.startsWith('select * from categories') || lowerSql.includes('from categories')) {
    return { rows: db.categories || [] };
  }

  // 14. Create Product
  if (lowerSql.startsWith('insert into products')) {
    const [seller_id, title, slug, description, short_desc, price, sale_price, category, tags, thumbnail_url, file_url, file_size, file_type, demo_url, version, stock_type, is_infinite_stock, infinite_stock_item] = params;
    const newProduct = {
      id: `prod-${Date.now()}`,
      seller_id,
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description,
      short_desc,
      price: parseFloat(price),
      sale_price: sale_price ? parseFloat(sale_price) : null,
      category,
      tags: tags || [],
      thumbnail_url: thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      file_url,
      file_size,
      file_type,
      demo_url,
      version: version || '1.0',
      downloads_count: 0,
      views_count: 0,
      rating_avg: 5.0,
      rating_count: 0,
      status: 'active',
      is_featured: false,
      stock_type,
      is_infinite_stock,
      infinite_stock_item,
      created_at: new Date().toISOString(),
    };
    db.products = db.products || [];
    db.products.unshift(newProduct);
    writeLocalDb(db);
    return { rows: [newProduct] };
  }

  // Update Product Feature
  if (lowerSql.startsWith('update products') && lowerSql.includes('is_featured=not is_featured')) {
    const id = params[0];
    const product = (db.products || []).find(p => p.id === id);
    if (product) {
      product.is_featured = !product.is_featured;
      writeLocalDb(db);
      return { rows: [product] };
    }
    return { rows: [] };
  }

  // Update Product (General Edit)
  if (lowerSql.startsWith('update products') && lowerSql.includes('updated_at=now()')) {
    const id = params[params.length - 2];
    const product = (db.products || []).find(p => p.id === id);
    if (product) {
      const setMatches = lowerSql.match(/set (.*?)(?:, updated_at=now\(\))? where/);
      if (setMatches && setMatches[1]) {
        const assignments = setMatches[1].split(',');
        assignments.forEach(assignment => {
          const parts = assignment.split('=');
          if (parts.length === 2) {
            const field = parts[0].trim();
            const valIndex = parseInt(parts[1].trim().replace('$', '')) - 1;
            if (valIndex >= 0 && valIndex < params.length) {
              product[field] = params[valIndex];
            }
          }
        });
      }
      writeLocalDb(db);
      return { rows: [product] };
    }
    return { rows: [] };
  }

  // 14. Create Variant
  if (lowerSql.startsWith('insert into product_variants')) {
    const [product_id, name, price, stock_keys, is_infinite_stock, infinite_stock_item] = params;
    const newVar = {
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_id,
      name,
      price: parseFloat(price),
      stock_keys: Array.isArray(stock_keys) ? stock_keys : (stock_keys ? stock_keys.split('\n').filter(Boolean) : []),
      is_infinite_stock: !!is_infinite_stock,
      infinite_stock_item: infinite_stock_item || null,
      created_at: new Date().toISOString(),
    };
    db.product_variants = db.product_variants || [];
    db.product_variants.push(newVar);
    writeLocalDb(db);
    return { rows: [newVar] };
  }

  // Generic fallback
  return { rows: [], rowCount: 0 };
}

export const getClient = () => {
  if (pgPool) return pgPool.connect();
  return {
    query: (text, params) => query(text, params),
    release: () => {},
  };
};

export default { query, getClient };
