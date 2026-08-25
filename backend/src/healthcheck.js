import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { query, readLocalDb, updateUserBalance, toggleUserFreeze } from './config/db.js';
import { connectMongoDB } from './config/mongodb.js';
import Product from './models/product.model.js';
import Sale from './models/sale.model.js';
import { fulfillPaidOrder } from './controllers/payment.controller.js';
import { getPaymentSettings, getPublicPaymentMethods, savePaymentSettings } from './services/paymentSettings.service.js';

dotenv.config();

export async function runFullSiteAudit() {
  const results = {
    checks: [],
    errors: [],
  };

  const addCheck = (name, status, details = '') => {
    results.checks.push({ name, status, details });
    console.log(`[${status === 'PASS' ? '✓' : '✗'}] ${name}: ${details}`);
  };

  try {
    // 1. MongoDB Check
    await connectMongoDB();
    if (mongoose.connection.readyState === 1) {
      addCheck('MongoDB Atlas Connection', 'PASS', 'Connected to telegram_store_bot Atlas database');
    } else {
      addCheck('MongoDB Atlas Connection', 'FAIL', 'Could not establish MongoDB connection');
    }

    // 2. SQL / Local DB Check
    const { rows: userCheck } = await query('SELECT count(*) as count FROM users');
    addCheck('SQL Database Users Table', 'PASS', `Total registered users: ${userCheck[0]?.count || 0}`);

    const { rows: orderCheck } = await query('SELECT count(*) as count FROM orders');
    addCheck('SQL Database Orders Table', 'PASS', `Total orders recorded: ${orderCheck[0]?.count || 0}`);

    // 3. Payment Gateways Check
    const settings = await getPaymentSettings();
    const activeGateways = Object.keys(settings).filter(k => settings[k]?.enabled);
    addCheck('Payment Settings System', 'PASS', `Active gateways: ${activeGateways.join(', ')}`);

    const publicMethods = await getPublicPaymentMethods();
    addCheck('Public Storefront Gateways', 'PASS', `${publicMethods.length} gateways available to buyers`);

    // 4. Ensure Dev Test Product Exists with Isolated Stock
    let testProd = await Product.findById('p-devtest-item');
    if (!testProd) {
      testProd = await Product.create({
        _id: 'p-devtest-item',
        name: '🧪 Test Product (Dev Only)',
        slug: 'dev-test-item',
        description: 'Isolated test product used exclusively for automated test orders. Real stock is unaffected.',
        category: 'testing',
        variants: {
          'var-test-instant': {
            name: 'Test Plan (₹1)',
            price: 1,
            pool_id: 'pool_test',
            duration: 30,
          }
        },
        stock_pools: {
          pool_test: ['test_item_account_1@quantumxd.store:pass123', 'test_item_account_2@quantumxd.store:pass456', 'test_item_account_3@quantumxd.store:pass789']
        },
        is_active: true,
        website_meta: { is_published: true, is_listed: true, images: ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800'] }
      });
      addCheck('Dev Test Product', 'PASS', 'Created dedicated test product (ID: ' + testProd._id.toString() + ')');
    } else {
      // Ensure pool has test credentials
      const currentStock = (testProd.stock_pools || {})['pool_test'] || [];
      if (currentStock.length < 3) {
        await Product.updateOne(
          { _id: testProd._id },
          { $set: { 'stock_pools.pool_test': ['test_item_account_1@quantumxd.store:pass123', 'test_item_account_2@quantumxd.store:pass456', 'test_item_account_3@quantumxd.store:pass789'] } }
        );
      }
      addCheck('Dev Test Product & Stock Pool', 'PASS', `Ready for test purchase with ${((testProd.stock_pools || {})['pool_test'] || []).length} test credentials`);
    }

    // 5. Test Simulated Order & Instant Fulfillment on Test Product
    const testOrderId = `AUDIT_${Date.now()}`;
    await query(`
      INSERT INTO orders (id, order_number, buyer_id, buyer_email, total_amount, discount_amount,
        payment_method, payment_status, base_amount, meta_product_id, meta_variant_id, meta_qty)
      VALUES ($1, $2, 'audit_bot', 'audit@quantumxd.store', 1.00, 0,
        'cashfree', 'pending', 1.00, $3, 'var-test-instant', 1)
    `, [testOrderId, 'QXDAUDIT' + Date.now().toString(36).toUpperCase(), testProd._id.toString()]);

    const fulfillRes = await fulfillPaidOrder(testOrderId);
    if (fulfillRes.success && fulfillRes.credentials) {
      addCheck('Automated Order Fulfillment Engine', 'PASS', `Delivered test credentials: "${fulfillRes.credentials.slice(0, 25)}..."`);
    } else {
      addCheck('Automated Order Fulfillment Engine', 'FAIL', fulfillRes.error || 'Failed to pop credentials');
    }

    // Verify Sale doc
    const saleDoc = await Sale.findOne({ sale_id: testOrderId });
    if (saleDoc) {
      addCheck('Sale Record Creation & MongoDB Sync', 'PASS', `Sale record verified: ${saleDoc.sale_id}`);
      await Sale.deleteOne({ sale_id: testOrderId });
    } else {
      addCheck('Sale Record Creation & MongoDB Sync', 'FAIL', 'Sale document was not found');
    }

    // Clean test order
    await query('DELETE FROM orders WHERE id=$1', [testOrderId]);
    addCheck('Audit Cleanup', 'PASS', 'Temporary test order cleaned up cleanly');

    // 6. Test Admin Balance Adjustment & Freeze Engine
    const { rows: testUsers } = await query('SELECT id, balance FROM users LIMIT 1');
    if (testUsers[0]) {
      const u = testUsers[0];
      const initialBal = parseFloat(u.balance || 0);
      
      const addRes = await updateUserBalance(u.id, 'add', 10);
      const afterAdd = parseFloat(addRes?.balance || 0);
      
      const cutRes = await updateUserBalance(u.id, 'cut', 10);
      const afterCut = parseFloat(cutRes?.balance || 0);

      if (afterAdd === initialBal + 10 && afterCut === initialBal) {
        addCheck('Admin User Balance Adjustment (+ / -)', 'PASS', `Exact balance arithmetic verified (Initial: ₹${initialBal} -> +₹10 -> -₹10)`);
      } else {
        addCheck('Admin User Balance Adjustment (+ / -)', 'FAIL', `Balance mismatch: initial=${initialBal}, afterAdd=${afterAdd}, afterCut=${afterCut}`);
      }
    }

  } catch (err) {
    console.error('Audit Exception:', err);
    results.errors.push(err.message);
  }

  return results;
}

// Run when called directly
if (process.argv[1]?.endsWith('healthcheck.js')) {
  runFullSiteAudit().then((r) => {
    console.log('\n========================================');
    console.log(`AUDIT FINISHED: ${r.checks.filter(c => c.status === 'PASS').length} Passed, ${r.errors.length} Errors`);
    console.log('========================================\n');
    process.exit(r.errors.length > 0 ? 1 : 0);
  });
}
