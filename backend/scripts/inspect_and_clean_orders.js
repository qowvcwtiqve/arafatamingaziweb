import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Sale = (await import('../src/models/sale.model.js')).default;
  const { query } = await import('../src/config/db.js');

  console.log('--- Inspecting orders ---');
  const targetIds = ['QXD-635049', 'QXD-492987', '635049', '492987'];

  // Check in MongoDB
  const mongoSales = await Sale.find({
    $or: [
      { sale_id: { $in: targetIds } },
      { sale_id: { $regex: /635049|492987/i } }
    ]
  }).lean();
  console.log('MongoDB matches:', mongoSales);

  // Check in Postgres
  let pgOrders = [];
  try {
    const { rows } = await query('SELECT * FROM orders WHERE id LIKE \'%635049%\' OR id LIKE \'%492987%\' OR order_number LIKE \'%635049%\' OR order_number LIKE \'%492987%\'');
    pgOrders = rows || [];
  } catch (err) {
    console.error('PG query error:', err.message);
  }
  console.log('Postgres matches:', pgOrders);

  // Also check all Postgres orders
  const { rows: allPg } = await query('SELECT id, order_number, buyer_id, buyer_email, payment_status, order_status, total_amount FROM orders LIMIT 20');
  console.log('All PG orders count:', allPg.length, allPg);

  // Also check all Mongo sales
  const allSales = await Sale.find({}).lean();
  console.log('All Mongo sales count:', allSales.length, allSales.map(s => ({ id: s.sale_id, user: s.user_email, name: s.user_name, status: s.status })));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
