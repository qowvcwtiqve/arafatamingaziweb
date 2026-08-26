import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const Sale = (await import('../src/models/sale.model.js')).default;
  const Product = (await import('../src/models/product.model.js')).default;
  const { getWebsiteOrders } = await import('../src/services/orders.service.js');
  const { query, readLocalDb } = await import('../src/config/db.js');

  console.log('=== TEST PRODUCT IN MONGODB ===');
  const prod = await Product.findById('p-test-all-in-one').lean();
  if (prod) {
    console.log('Product Found:', prod.name, 'is_active:', prod.is_active);
    console.log('Variants:', Object.keys(prod.variants || {}));
    console.log('Preorder Pools:', prod.preorder_pools);
  } else {
    console.log('Product p-test-all-in-one NOT FOUND in MongoDB!');
  }

  console.log('\n=== LATEST ORDERS RETURNED BY getWebsiteOrders() ===');
  const orders = await getWebsiteOrders();
  console.log('Total orders:', orders.length);
  orders.forEach((o, i) => {
    console.log(`[${i+1}] ID: #${o.order_number || o.id} | Status: "${o.status}" | Variant: "${o.variant_name}" | User: ${o.username} (${o.user_email}) | Prod: ${o.product_name}`);
  });

  console.log('\n=== MONGODB SALES ===');
  const mongoSales = await Sale.find({}).sort({ purchase_ts: -1 }).limit(10).lean();
  console.log('Mongo Sales count:', mongoSales.length);
  mongoSales.forEach(s => {
    console.log('Sale:', s.sale_id, 'Status:', s.status, 'Variant:', s.variant_name, 'Prod ID:', s.product_id, 'Pool:', s.pool_id);
  });

  console.log('\n=== LOCAL DB ORDERS ===');
  const db = readLocalDb();
  console.log('local_db.json orders:', db.orders);

  await mongoose.disconnect();
}

check().catch(console.error);
