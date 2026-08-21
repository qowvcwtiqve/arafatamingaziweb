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
  products: [
    {
      id: 'prod-001',
      seller_id: 'usr-admin-001',
      title: 'Canva Pro Lifetime License (Personal Mail)',
      slug: 'canva-pro-lifetime-license',
      short_desc: 'Upgrade your personal email to Canva Pro with 100M+ premium photos, templates, magic resize & brand kits.',
      description: 'Get Canva Pro activated on your own personal email with lifetime validity.\n\nFeatures Included:\n- Unlimited Brand Kits\n- 100M+ Premium Stock Photos, Videos, and Audio\n- Background Remover & Magic Eraser\n- Magic Resize to any format\n- 1TB Cloud Storage\n- Instant automated delivery upon payment.',
      price: 999.0,
      sale_price: 299.0,
      category: 'software',
      tags: ['canva', 'design', 'pro', 'lifetime'],
      thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      preview_images: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80',
      ],
      demo_url: 'https://canva.com',
      version: '2026.1',
      downloads_count: 3420,
      views_count: 12500,
      rating_avg: 4.9,
      rating_count: 284,
      status: 'active',
      is_featured: true,
      stock_type: 'infinite_key',
      is_infinite_stock: true,
      infinite_stock_item: 'https://canva.com/brand/join?invite=QUANTUMXD_PRO_INVITE_TOKEN_LIFETIME',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    {
      id: 'prod-002',
      seller_id: 'usr-admin-001',
      title: 'Windows 11 Pro Original Retail Key (Global)',
      slug: 'windows-11-pro-retail-key',
      short_desc: '100% Genuine Retail Digital License Key for Windows 11 Pro (32/64 bit). Lifetime activation for 1 PC.',
      description: 'Official Microsoft Windows 11 Pro Retail License Key.\n\n- Permanent Lifetime Activation\n- Online One-Click Activation\n- Supports all languages & global regions\n- Upgrade from Home to Pro supported\n- Instant Key delivery upon payment.',
      price: 2499.0,
      sale_price: 499.0,
      category: 'software',
      tags: ['windows', 'microsoft', 'key', 'retail'],
      thumbnail_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80',
      preview_images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&auto=format&fit=crop&q=80'],
      version: '23H2',
      downloads_count: 5120,
      views_count: 18900,
      rating_avg: 4.8,
      rating_count: 412,
      status: 'active',
      is_featured: true,
      stock_type: 'keys',
      stock_keys: [
        'W11PRO-QX99-8877-ABCD-EF01',
        'W11PRO-QX99-8877-ABCD-EF02',
        'W11PRO-QX99-8877-ABCD-EF03',
        'W11PRO-QX99-8877-ABCD-EF04',
        'W11PRO-QX99-8877-ABCD-EF05',
      ],
      is_infinite_stock: false,
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      id: 'prod-003',
      seller_id: 'usr-admin-001',
      title: 'ChatGPT Plus Shared Account (GPT-4o & Canvas)',
      slug: 'chatgpt-plus-shared-account',
      short_desc: 'Access GPT-4o, DALL-E 3 image generator, Advanced Voice Mode, and Custom GPTs with 1 Month validity.',
      description: 'Get immediate access to OpenAI ChatGPT Plus with GPT-4o, browsing, plugins, and image generator.\n\n- 1 Month uninterrupted warranty\n- Access to GPT-4o & Sora features\n- Fast response time and zero queue\n- Login credentials delivered instantly after checkout.',
      price: 1999.0,
      sale_price: 399.0,
      category: 'accounts',
      tags: ['ai', 'chatgpt', 'openai', 'gpt4'],
      thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
      preview_images: ['https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80'],
      version: 'GPT-4o',
      downloads_count: 1850,
      views_count: 9400,
      rating_avg: 4.9,
      rating_count: 156,
      status: 'active',
      is_featured: true,
      stock_type: 'keys',
      stock_keys: [
        'chatgpt_vip_user1@quantumxd.store:QuantumPass@2026',
        'chatgpt_vip_user2@quantumxd.store:QuantumPass@2026',
        'chatgpt_vip_user3@quantumxd.store:QuantumPass@2026',
      ],
      is_infinite_stock: false,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'prod-004',
      seller_id: 'usr-admin-001',
      title: 'Ultimate Full-Stack E-Commerce Next.js 14 Template',
      slug: 'ultimate-full-stack-ecommerce-template',
      short_desc: 'Production-ready digital marketplace source code with payment gateways (UPI, Crypto, Stripe) and Admin Dashboard.',
      description: 'Complete source code of a modern digital goods marketplace.\n\nTech Stack:\n- Next.js 14 App Router\n- Express / Node.js Backend API\n- PostgreSQL Schema & Prisma\n- Multi-Gateway Payment System (UPI, NowPayments, Binance)\n- Full responsive dark mode UI\n- Instant ZIP file download.',
      price: 4999.0,
      sale_price: 999.0,
      category: 'templates',
      tags: ['nextjs', 'react', 'ecommerce', 'source-code'],
      thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
      preview_images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'],
      version: 'v3.3.0',
      downloads_count: 980,
      views_count: 4600,
      rating_avg: 5.0,
      rating_count: 88,
      status: 'active',
      is_featured: true,
      stock_type: 'infinite_key',
      is_infinite_stock: true,
      infinite_stock_item: 'https://github.com/qowvcwtiqve/arafatamingaziweb/archive/refs/heads/main.zip',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'prod-005',
      seller_id: 'usr-admin-001',
      title: 'ExpressVPN / NordVPN 1-Year Ultra Fast Key',
      slug: 'expressvpn-nordvpn-1-year-key',
      short_desc: '1 Year Premium VPN Activation Key. 3000+ servers across 90+ countries with unlimited bandwidth.',
      description: 'Ultra high-speed premium VPN activation code.\n\n- Works on Windows, Mac, Android, iOS\n- Military-grade 256-bit AES encryption\n- Zero logs policy\n- 1 Year full replacement warranty.',
      price: 2999.0,
      sale_price: 699.0,
      category: 'tools',
      tags: ['vpn', 'privacy', 'security', 'proxy'],
      thumbnail_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      preview_images: ['https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80'],
      version: '2026',
      downloads_count: 1420,
      views_count: 6700,
      rating_avg: 4.7,
      rating_count: 112,
      status: 'active',
      is_featured: false,
      stock_type: 'keys',
      stock_keys: [
        'VPN-KEY-2026-QX88-9901',
        'VPN-KEY-2026-QX88-9902',
        'VPN-KEY-2026-QX88-9903',
      ],
      is_infinite_stock: false,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'prod-006',
      seller_id: 'usr-admin-001',
      title: 'Adobe Creative Cloud All Apps 1-Year Subscription',
      slug: 'adobe-creative-cloud-all-apps',
      short_desc: 'Photoshop, Illustrator, Premiere Pro, After Effects + 20 apps with 100GB Adobe Cloud storage.',
      description: 'Official Adobe Creative Cloud redemption for your own personal Adobe ID.\n\nIncludes:\n- Photoshop 2026\n- Illustrator 2026\n- Premiere Pro & After Effects\n- Generative AI Credits\n- 100GB Adobe Cloud Storage\n- Activated directly on your Adobe account.',
      price: 12999.0,
      sale_price: 1999.0,
      category: 'software',
      tags: ['adobe', 'photoshop', 'illustrator', 'creative-cloud'],
      thumbnail_url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80',
      preview_images: ['https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80'],
      version: '2026 CC',
      downloads_count: 2150,
      views_count: 11200,
      rating_avg: 4.9,
      rating_count: 194,
      status: 'active',
      is_featured: true,
      stock_type: 'infinite_key',
      is_infinite_stock: true,
      infinite_stock_item: 'https://redeem.adobe.com/?token=QUANTUMXD_ADOBE_CC_REDEEM_LINK',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ],
  product_variants: [
    { id: 'var-001-1', product_id: 'prod-001', name: '1 Year Plan', price: 199.0, display_order: 1 },
    { id: 'var-001-2', product_id: 'prod-001', name: 'Lifetime VIP Plan', price: 299.0, display_order: 2 },
    { id: 'var-003-1', product_id: 'prod-003', name: '1 Month Access', price: 399.0, display_order: 1 },
    { id: 'var-003-2', product_id: 'prod-003', name: '3 Months VIP Access', price: 999.0, display_order: 2 },
  ],
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
      used_count: 14,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: 'coup-002',
      code: 'QUANTUM100',
      discount_type: 'fixed',
      discount_value: 100,
      min_order_amount: 500,
      max_uses: 200,
      used_count: 8,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ],
  reviews: [
    {
      id: 'rev-001',
      product_id: 'prod-001',
      buyer_id: 'usr-demo-002',
      rating: 5,
      title: 'Instant activation! Absolutely amazing',
      body: 'Paid via UPI, got the invitation link immediately. My personal Canva account is now Pro. Highly recommended!',
      reviewer_name: 'Rahul Sharma',
      is_approved: true,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'rev-002',
      product_id: 'prod-002',
      buyer_id: 'usr-demo-002',
      rating: 5,
      title: 'Genuine retail key, worked on first try',
      body: 'Upgraded Windows 11 Home to Pro in 2 minutes without re-installing. Key was delivered instantly on the screen.',
      reviewer_name: 'Amit Patel',
      is_approved: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
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

  if (lowerSql.includes('from coupons') && lowerSql.includes('where code=$1')) {
    const code = params[0]?.toUpperCase();
    const coupon = (db.coupons || []).find(c => c.code === code && c.is_active);
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
