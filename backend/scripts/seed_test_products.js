import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Product from '../src/models/product.model.js';

const singleAllInOneProduct = {
  _id: 'p-test-all-in-one',
  name: '[TEST] All-in-One Order Tester (4 Variants)',
  description: '🧪 All-in-One Testing Product with 4 Delivery Variants:\n• Variant 1: 🚀 Pre-Order (Queue reservation)\n• Variant 2: ⚡ Instant Auto Delivery (Instant credentials)\n• Variant 3: 🛠️ Manual Activation (Admin fulfillment)\n• Variant 4: 🔑 Limited Real Stock (5 serial keys stack)\n\nPrice is ₹1 for each variant for convenient testing.',
  rules: 'Select your desired test variant from the configurator below to test that specific delivery flow.',
  delivery_process: 'auto',
  delivery_time: 'Instant',
  is_active: true,
  category_id: 'c-subscriptions',
  variants: {
    'v-preorder': {
      name: '🚀 Pre-Order (Queue)',
      price: 1,
      pool_id: 'pool_test_preorder',
      duration: 0,
    },
    'v-instant': {
      name: '⚡ Instant Auto Delivery',
      price: 1,
      pool_id: 'pool_test_instant',
      duration: 30,
    },
    'v-manual': {
      name: '🛠️ Manual Activation (Admin)',
      price: 1,
      pool_id: 'pool_test_manual',
      duration: 0,
    },
    'v-limited': {
      name: '🔑 Limited Stock Stack (5 Keys)',
      price: 1,
      pool_id: 'pool_test_limited',
      duration: 0,
    }
  },
  stock_pools: {
    'pool_test_preorder': [],
    'pool_test_instant': [
      'spotify_instant_test@qxd.io:TestPassword#2026',
      'spotify_instant_test2@qxd.io:TestPassword#2026'
    ],
    'pool_test_manual': [],
    'pool_test_limited': [
      'KEY-STACK-AAAA-1111-2222',
      'KEY-STACK-BBBB-3333-4444',
      'KEY-STACK-CCCC-5555-6666',
      'KEY-STACK-DDDD-7777-8888',
      'KEY-STACK-EEEE-9999-0000'
    ]
  },
  pool_rules: {
    'pool_test_preorder': 'Pre-Order Variant: Queue position is reserved. Dispatched on release.',
    'pool_test_instant': 'Instant Variant: Credentials delivered automatically upon purchase.',
    'pool_test_manual': 'Manual Variant: Order goes into processing state for admin manual activation.',
    'pool_test_limited': 'Limited Stack Variant: 1 key is popped and stock decreases by 1.'
  },
  infinite_pools: {
    'pool_test_instant': true
  },
  preorder_pools: {
    'pool_test_preorder': true
  },
  website_meta: {
    title: '[TEST] All-in-One Order Tester (4 Variants)',
    description: 'All-in-One Testing Product with 4 Delivery Variants: Pre-Order, Instant Auto, Manual Activation, and Limited Stock Stack.',
    badge: 'Tester Hub ⚡',
    is_featured: true,
    is_published: true,
    compare_price: 499,
    images: [],
    variants: {
      'v-preorder': {
        rules: 'Pre-Order Variant: Queue position is reserved. Dispatched on release.',
        description: 'Tests pre-order queue and status handling.',
        delivery_time: 'On Release / Stock',
        delivery_method: 'preorder',
        compare_price: 499
      },
      'v-instant': {
        rules: 'Instant Variant: Credentials delivered automatically upon purchase.',
        description: 'Tests automated instant credential delivery on screen.',
        delivery_time: 'Instant (10-30s)',
        delivery_method: 'auto',
        compare_price: 199
      },
      'v-manual': {
        rules: 'Manual Variant: Order goes into processing state for admin manual activation.',
        description: 'Tests admin manual fulfillment workflow.',
        delivery_time: '15 - 30 Minutes',
        delivery_method: 'manual',
        compare_price: 299
      },
      'v-limited': {
        rules: 'Limited Stack Variant: 1 key is popped and stock decreases by 1.',
        description: 'Tests real finite stock decrement and unique serial key distribution.',
        delivery_time: 'Instant',
        delivery_method: 'auto',
        compare_price: 850
      }
    }
  }
};

async function seed() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas');

  // Delete previous separate 4 test products
  await Product.deleteMany({
    _id: {
      $in: [
        'p-test-preorder',
        'p-test-instant-auto',
        'p-test-manual-order',
        'p-test-limited-stock'
      ]
    }
  });
  console.log('Cleaned up separate test products.');

  // Insert the 1 all-in-one product
  const updated = await Product.findByIdAndUpdate(
    singleAllInOneProduct._id,
    singleAllInOneProduct,
    { upsert: true, new: true }
  );
  console.log(`Upserted All-in-One test product: ${updated.name} (ID: ${singleAllInOneProduct._id})`);

  console.log('Single All-in-One test product seeded successfully with 4 variants!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
