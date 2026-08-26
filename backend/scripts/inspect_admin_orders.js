import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const { getWebsiteOrders } = await import('../src/services/orders.service.js');
  const Sale = (await import('../src/models/sale.model.js')).default;
  const { query } = await import('../src/config/db.js');

  console.log('=== All Orders returned by getWebsiteOrders() ===');
  const orders = await getWebsiteOrders();
  console.log('Count:', orders.length);
  orders.forEach((o, i) => {
    console.log(`[${i+1}] ID: ${o.id} | Ref: #${o.order_number} | Source: ${o.source} | Status: ${o.status} | User: ${o.username} (${o.user_email}) | Prod: ${o.product_name}`);
  });

  console.log('\n=== Raw website_sales in MongoDB ===');
  const mongoSales = await Sale.find({}).lean();
  console.log('Mongo Sales Count:', mongoSales.length);
  mongoSales.forEach(s => console.log('Mongo Sale:', s._id, s.sale_id, s.status, s.user_email));

  console.log('\n=== Raw orders in PostgreSQL ===');
  const { rows: pgOrders } = await query('SELECT * FROM orders');
  console.log('Postgres Orders Count:', pgOrders.length);
  pgOrders.forEach(o => console.log('PG Order:', o.id, o.order_number, o.payment_status, o.order_status, o.buyer_email));

  await mongoose.disconnect();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
