-- ================================================
-- QUANTUMXD STORE — POSTGRESQL SCHEMA
-- Run this in Supabase SQL editor or any PostgreSQL
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer', -- 'buyer', 'seller', 'admin'
  avatar_url TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  all_time_topup DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  telegram_user_id VARCHAR(50),
  telegram_username VARCHAR(100),
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- PRODUCTS
-- ================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(250) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  description TEXT,
  short_desc VARCHAR(600),
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  preview_images TEXT[] DEFAULT '{}',
  file_url TEXT,         -- Internal URL; never exposed directly
  file_public_id TEXT,   -- Cloudinary public ID for management
  file_size VARCHAR(50),
  file_type VARCHAR(50), -- 'zip', 'pdf', 'mp4', etc.
  demo_url TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  downloads_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_count INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'draft','pending','active','rejected'
  is_featured BOOLEAN NOT NULL DEFAULT false,
  stock_type VARCHAR(20) NOT NULL DEFAULT 'file', -- 'file', 'keys', 'infinite_key'
  stock_keys TEXT[] DEFAULT '{}',  -- for license key products
  is_infinite_stock BOOLEAN NOT NULL DEFAULT false,
  infinite_stock_item TEXT,        -- single item delivered every time (infinite)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- PRODUCT VARIANTS (e.g. 1 Month / 3 Month plans)
-- ================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock_keys TEXT[] DEFAULT '{}',
  is_infinite_stock BOOLEAN NOT NULL DEFAULT false,
  infinite_stock_item TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- ORDERS
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  buyer_email VARCHAR(150),
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  coupon_code VARCHAR(50),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(30),  -- 'upi', 'nowpayments', 'binance'
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending','paid','failed','refunded','expired'
  gateway_payment_id TEXT,     -- pay_xxx for Razorpay, payment_id for NowPayments, txid for Binance
  gateway_order_id TEXT,
  invoice_url TEXT,            -- NowPayments invoice URL
  unique_amount DECIMAL(10,2), -- UPI: the exact fingerprinted amount user must pay
  base_amount DECIMAL(10,2),   -- UPI: original amount before fee/paisa trick
  timeout_at TIMESTAMP,        -- when this pending payment expires
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- ORDER ITEMS
-- ================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_title VARCHAR(250) NOT NULL,
  variant_name VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  delivered_content TEXT,      -- the actual key/content delivered
  download_token VARCHAR(100) UNIQUE,
  download_token_expires TIMESTAMP,
  download_count INT NOT NULL DEFAULT 0,
  max_downloads INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- DEPOSITS (Payment history)
-- ================================================
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  gateway VARCHAR(30) NOT NULL, -- 'upi', 'nowpayments', 'binance'
  transaction_id TEXT,
  gateway_ref TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- REVIEWS
-- ================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(200),
  body TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- COUPONS
-- ================================================
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'percent', -- 'percent', 'fixed'
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INT DEFAULT 100,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- WISHLIST
-- ================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ================================================
-- CHAT MESSAGES
-- ================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user', 'admin'
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- PROCESSED PAYMENT IDS (anti double-spend)
-- ================================================
CREATE TABLE IF NOT EXISTS processed_payment_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT UNIQUE NOT NULL,
  gateway VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ================================================
-- EXCHANGE RATE CACHE
-- ================================================
CREATE TABLE IF NOT EXISTS exchange_rate_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  rate DECIMAL(20,6) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_unique_amount ON orders(unique_amount, payment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_token ON order_items(download_token);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);

-- ================================================
-- DEFAULT ADMIN USER (change password after setup!)
-- ================================================
-- Password: admin123 (bcrypt hash below)
INSERT INTO users (name, email, password_hash, role, is_verified)
VALUES (
  'Admin',
  'admin@quantumxd.store',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;
