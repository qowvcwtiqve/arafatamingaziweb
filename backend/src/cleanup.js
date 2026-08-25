import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readLocalDb, writeLocalDb, query } from './config/db.js';
import { connectMongoDB } from './config/mongodb.js';
import Sale from './models/sale.model.js';
import Product from './models/product.model.js';

dotenv.config();

export async function cleanupTestData() {
  console.log('--- STARTING CLEANUP OF TEST ORDERS & USERS ---');
  await connectMongoDB();

  const db = readLocalDb();

  // 1. Inspect existing users
  const keepEmails = ['quantumxd11@gmail.com', 'ashiqulthander@gmail.com', 'admin@quantumxd.store'];
  const testUsersFilter = (u) => {
    const isKeep = keepEmails.includes(u.email?.toLowerCase()) || u.role === 'admin';
    const isTest = u.email?.includes('test') || u.email?.includes('demo') || u.email?.includes('audit') || u.name?.toLowerCase().includes('test') || u.name?.toLowerCase().includes('demo');
    return isTest && !isKeep;
  };

  const usersToDelete = (db.users || []).filter(testUsersFilter);
  const userIdsToDelete = usersToDelete.map(u => u.id);
  console.log(`Found ${usersToDelete.length} test users to delete:`, usersToDelete.map(u => `${u.name} (${u.email})`));

  db.users = (db.users || []).filter(u => !userIdsToDelete.includes(u.id));

  // 2. Inspect existing orders
  const testOrderFilter = (o) => {
    const isTest = o.id?.startsWith('AUDIT_') || o.id?.startsWith('TEST_') || o.order_number?.startsWith('QXDTEST') || o.order_number?.startsWith('QXDAUDIT') || o.buyer_email?.includes('test') || o.buyer_email?.includes('audit') || o.buyer_email?.includes('demo') || userIdsToDelete.includes(o.buyer_id);
    return isTest;
  };

  const ordersToDelete = (db.orders || []).filter(testOrderFilter);
  const orderIdsToDelete = ordersToDelete.map(o => o.id);
  console.log(`Found ${ordersToDelete.length} test orders to delete:`, orderIdsToDelete);

  db.orders = (db.orders || []).filter(o => !orderIdsToDelete.includes(o.id));
  db.order_items = (db.order_items || []).filter(item => !orderIdsToDelete.includes(item.order_id));

  // 3. Inspect existing deposits
  const testDepositFilter = (d) => {
    return d.user_email?.includes('test') || d.user_email?.includes('demo') || d.user_email?.includes('audit') || userIdsToDelete.includes(d.user_id);
  };
  const depositsToDelete = (db.deposits || []).filter(testDepositFilter);
  console.log(`Found ${depositsToDelete.length} test deposits to delete`);
  db.deposits = (db.deposits || []).filter(d => !testDepositFilter(d));

  // Save cleaned local DB
  writeLocalDb(db);
  console.log('✅ Local SQL DB cleaned successfully.');

  // 4. Clean MongoDB sales and test product
  const deletedSales = await Sale.deleteMany({
    $or: [
      { sale_id: { $regex: /AUDIT|TEST/i } },
      { user_email: { $regex: /test|audit|demo/i } },
      { user_id: { $in: userIdsToDelete } }
    ]
  });
  console.log(`✅ MongoDB Website Sales: Deleted ${deletedSales.deletedCount} test sale records.`);

  // Clean test product
  const deletedProd = await Product.deleteOne({
    $or: [
      { _id: 'p-devtest-item' },
      { slug: 'dev-test-item' },
      { slug: 'test-product-dev' }
    ]
  });
  console.log(`✅ MongoDB Test Product cleaned: ${deletedProd.deletedCount} removed.`);

  console.log('--- CLEANUP COMPLETED ---');
}

if (process.argv[1]?.endsWith('cleanup.js')) {
  cleanupTestData().then(() => {
    console.log('Finished.');
    process.exit(0);
  }).catch(err => {
    console.error('Cleanup error:', err);
    process.exit(1);
  });
}
