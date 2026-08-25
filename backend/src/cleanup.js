import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readLocalDb, writeLocalDb, query } from './config/db.js';
import { connectMongoDB } from './config/mongodb.js';
import Sale from './models/sale.model.js';
import Product from './models/product.model.js';

dotenv.config();

export async function resetAllOrdersAndUsersExceptAdmin() {
  console.log('--- FULL RESET OF ALL ORDERS, DEPOSITS & NON-ADMIN USERS ---');
  await connectMongoDB();

  const db = readLocalDb();

  // 1. Filter Users: Keep ONLY admins
  const admins = (db.users || []).filter(u => u.role === 'admin' || u.email?.toLowerCase() === 'quantumxd11@gmail.com');
  const removedUsersCount = (db.users || []).length - admins.length;
  console.log(`Keeping ${admins.length} Admin User(s):`, admins.map(a => `${a.name} (${a.email})`));
  console.log(`Removing ${removedUsersCount} Non-Admin User(s).`);
  
  db.users = admins;

  // 2. Clear ALL Orders & Order Items
  const orderCount = (db.orders || []).length;
  db.orders = [];
  db.order_items = [];
  console.log(`Cleared ${orderCount} total orders and all order items.`);

  // 3. Clear ALL Deposits
  const depositCount = (db.deposits || []).length;
  db.deposits = [];
  console.log(`Cleared ${depositCount} total deposits.`);

  // 4. Save Local SQL Database
  writeLocalDb(db);
  console.log('✅ Local SQL database reset complete.');

  // 5. Clear MongoDB Website Sales
  const salesResult = await Sale.deleteMany({});
  console.log(`✅ MongoDB Website Sales: Cleared ${salesResult.deletedCount} sale records.`);

  // 6. Remove test products if any
  const prodResult = await Product.deleteMany({
    $or: [
      { _id: 'p-devtest-item' },
      { slug: 'dev-test-item' },
      { slug: 'test-product-dev' },
      { slug: /test/i },
      { name: /test product|dev only/i },
      { category: 'testing' }
    ]
  });
  console.log(`✅ Cleaned test products from catalog: ${prodResult.deletedCount} removed.`);

  // 7. Force touch bot last modified so Telegram Bot flushes its cache immediately
  const { touchBotLastModified } = await import('./services/botdb.service.js');
  await touchBotLastModified();

  console.log('--- FULL RESET FINISHED SUCCESSFULLY ---');
}

if (process.argv[1]?.endsWith('cleanup.js')) {
  resetAllOrdersAndUsersExceptAdmin().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Reset error:', err);
    process.exit(1);
  });
}
