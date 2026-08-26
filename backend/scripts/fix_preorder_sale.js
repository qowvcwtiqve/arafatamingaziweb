import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const Sale = (await import('../src/models/sale.model.js')).default;
  const { query, readLocalDb, writeLocalDb } = await import('../src/config/db.js');

  // Fix QXD-514021 in MongoDB Sale
  const sale = await Sale.findOneAndUpdate(
    { sale_id: 'QXD-514021' },
    {
      $set: {
        status: 'Pre-Order',
        credentials: '',
        delivery_method: 'preorder',
        pool_id: 'pool_test_preorder'
      }
    },
    { new: true }
  );
  console.log('Fixed Sale in Mongo:', sale ? sale.status : 'not found');

  // Fix in PostgreSQL / local_db.json
  await query(
    "UPDATE orders SET payment_status='paid', order_status='Pre-Order', delivered_items='', sale_id='QXD-514021' WHERE id='QXD-514021' OR order_number='QXD-514021'"
  );

  const db = readLocalDb();
  const o = (db.orders || []).find(x => x.id === 'QXD-514021' || x.order_number === 'QXD-514021');
  if (o) {
    o.order_status = 'Pre-Order';
    o.delivered_items = '';
    writeLocalDb(db);
    console.log('Fixed local_db order QXD-514021');
  }

  await mongoose.disconnect();
}

fix().catch(console.error);
