import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const ProductSchema = new mongoose.Schema(
  {
    _id: String,
    name: String,
    description: String,
    rules: String,
    delivery_process: String,
    delivery_time: String,
    is_active: Boolean,
    category_id: String,
    variants: mongoose.Schema.Types.Mixed,
    stock_pools: mongoose.Schema.Types.Mixed,
    pool_rules: mongoose.Schema.Types.Mixed,
    infinite_pools: mongoose.Schema.Types.Mixed,
    preorder_pools: mongoose.Schema.Types.Mixed,
    website_meta: mongoose.Schema.Types.Mixed,
  },
  { strict: false, _id: false, collection: 'products' }
);

const Product = mongoose.model('Product', ProductSchema);

const testProducts = [
  // 1. PRE-ORDER TEST PRODUCT
  {
    _id: 'p-test-preorder',
    name: '[TEST] GTA VI Ultimate Edition (Pre-Order)',
    description: '🎮 Test Product for Pre-Order flow.\n• Queue reservation & automatic receipt\n• Release dispatch queue test\n• Price: ₹1 (Test pricing)',
    rules: 'Pre-Order Flow Test: No instant stock is popped. Order is saved as PRE-ORDER in queue. Admin fulfills upon release date.',
    delivery_process: 'manual',
    delivery_time: 'On Release / Stock',
    is_active: true,
    category_id: 'c-gaming',
    variants: {
      'v-preorder-1': {
        name: 'Pre-Order Edition',
        price: 1,
        pool_id: 'pool_preorder_test',
        duration: 0,
      }
    },
    stock_pools: {
      'pool_preorder_test': []
    },
    pool_rules: {
      'pool_preorder_test': 'Pre-order test rules: Order is preserved for release dispatch.'
    },
    infinite_pools: {},
    preorder_pools: {
      'pool_preorder_test': true
    },
    website_meta: {
      title: '[TEST] GTA VI Ultimate Edition (Pre-Order)',
      description: 'Test Product for Pre-Order flow. Test placing order and reviewing queue dispatch.',
      badge: 'Pre-Order',
      is_featured: true,
      is_published: true,
      compare_price: 2999,
      images: [],
      variants: {
        'v-preorder-1': {
          rules: 'Pre-Order Flow Test: No instant stock is popped. Order is saved as PRE-ORDER in queue.',
          description: 'Pre-Order test variant',
          delivery_time: 'On Stock / Release',
          delivery_method: 'preorder'
        }
      }
    }
  },

  // 2. INSTANT AUTO ORDER TEST PRODUCT (Infinite Pool)
  {
    _id: 'p-test-instant-auto',
    name: '[TEST] Spotify Premium 1-Month (Instant Auto)',
    description: '⚡ Test Product for Automated Instant Delivery.\n• Automatic credentials delivered in 5 seconds\n• Instant view on receipt & dashboard\n• Price: ₹1 (Test pricing)',
    rules: 'Instant Auto Delivery Test: Credential lines are automatically delivered to your screen and order history instantly upon purchase.',
    delivery_process: 'auto',
    delivery_time: 'Instant (10-30s)',
    is_active: true,
    category_id: 'c-subscriptions',
    variants: {
      'v-instant-1': {
        name: '1-Month Auto',
        price: 1,
        pool_id: 'pool_instant_test',
        duration: 30,
      }
    },
    stock_pools: {
      'pool_instant_test': [
        'spotify_test_user@qxd.io:TestPassword#2026',
        'spotify_test_user2@qxd.io:TestPassword#2026'
      ]
    },
    pool_rules: {
      'pool_instant_test': 'Instant pool credential delivered immediately.'
    },
    infinite_pools: {
      'pool_instant_test': true
    },
    preorder_pools: {},
    website_meta: {
      title: '[TEST] Spotify Premium 1-Month (Instant Auto)',
      description: 'Test Product for Automated Instant Delivery. Tests instant credential dispatch on order completion.',
      badge: 'Instant ⚡',
      is_featured: true,
      is_published: true,
      compare_price: 199,
      images: [],
      variants: {
        'v-instant-1': {
          rules: 'Instant delivery test rules.',
          description: 'Instant auto delivery variant',
          delivery_time: 'Instant (10-30s)',
          delivery_method: 'auto'
        }
      }
    }
  },

  // 3. MANUAL ORDER TEST PRODUCT (Admin Processing)
  {
    _id: 'p-test-manual-order',
    name: '[TEST] Discord Nitro 1-Year (Manual Activation)',
    description: '🛠️ Test Product for Manual Order Fulfillment flow.\n• Admin processes credentials or gift links manually\n• Status shows Processing / Pending\n• Price: ₹1 (Test pricing)',
    rules: 'Manual Order Test: Order is created in PENDING status for admin manual delivery. Provide your account email or Discord handle in notes.',
    delivery_process: 'manual',
    delivery_time: '15 - 30 Minutes',
    is_active: true,
    category_id: 'c-subscriptions',
    variants: {
      'v-manual-1': {
        name: '1-Year Manual Upgrade',
        price: 1,
        pool_id: 'pool_manual_test',
        duration: 365,
      }
    },
    stock_pools: {
      'pool_manual_test': []
    },
    pool_rules: {
      'pool_manual_test': 'Manual activation required by admin.'
    },
    infinite_pools: {},
    preorder_pools: {},
    website_meta: {
      title: '[TEST] Discord Nitro 1-Year (Manual Activation)',
      description: 'Test Product for Manual Order Fulfillment flow. Tests admin manual fulfillment workflow.',
      badge: 'Manual Dispatch',
      is_featured: true,
      is_published: true,
      compare_price: 999,
      images: [],
      variants: {
        'v-manual-1': {
          rules: 'Manual Order Test: Order is created in PENDING status for admin manual delivery.',
          description: 'Manual activation test variant',
          delivery_time: '15 - 30 Minutes',
          delivery_method: 'manual'
        }
      }
    }
  },

  // 4. NORMAL LIMITED STOCK ITEM (5 Serial Keys)
  {
    _id: 'p-test-limited-stock',
    name: '[TEST] Steam $10 Gift Card (5 Keys Stock)',
    description: '🔑 Test Product for Real Stock Stack.\n• Exactly 5 real serial keys loaded\n• Pops 1 serial key per order and decreases stock\n• Price: ₹1 (Test pricing)',
    rules: 'Limited Stock Test: Has 5 serial keys in stock. Exactly 1 serial key pops from pool and decreases remaining stock count on every order.',
    delivery_process: 'auto',
    delivery_time: 'Instant',
    is_active: true,
    category_id: 'c-giftcards',
    variants: {
      'v-limited-1': {
        name: '1x $10 Global Key',
        price: 1,
        pool_id: 'pool_steam_test',
        duration: 0,
      }
    },
    stock_pools: {
      'pool_steam_test': [
        'STEAM-TEST-KEY-AAAA-1111-2222',
        'STEAM-TEST-KEY-BBBB-3333-4444',
        'STEAM-TEST-KEY-CCCC-5555-6666',
        'STEAM-TEST-KEY-DDDD-7777-8888',
        'STEAM-TEST-KEY-EEEE-9999-0000'
      ]
    },
    pool_rules: {
      'pool_steam_test': '1x Serial Key popped per purchase.'
    },
    infinite_pools: {},
    preorder_pools: {},
    website_meta: {
      title: '[TEST] Steam $10 Gift Card (5 Keys Stock)',
      description: 'Test Product for Real Stock Stack. Tests stock decrement and unique serial key distribution.',
      badge: '5 in Stock',
      is_featured: true,
      is_published: true,
      compare_price: 850,
      images: [],
      variants: {
        'v-limited-1': {
          rules: 'Limited Stock Test: Has 5 serial keys in stock.',
          description: 'Limited stock single serial key variant',
          delivery_time: 'Instant',
          delivery_method: 'auto'
        }
      }
    }
  }
];

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas');

  for (const item of testProducts) {
    const updated = await Product.findByIdAndUpdate(item._id, item, { upsert: true, new: true });
    console.log(`Upserted test product: ${updated.name} (ID: ${item._id})`);
  }

  console.log('All 4 test products seeded successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
