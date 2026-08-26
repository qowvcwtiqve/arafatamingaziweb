import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

async function cleanSpecificOrders() {
  console.log('Cleaning local_db.json...');
  if (fs.existsSync(LOCAL_DB_PATH)) {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    const db = JSON.parse(raw);
    const beforeCount = (db.orders || []).length;
    db.orders = (db.orders || []).filter(o => 
      !['QXD-635049', 'QXD-492987'].includes(o.id) &&
      !['QXD-635049', 'QXD-492987'].includes(o.order_number)
    );
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
    console.log(`local_db.json cleaned: ${beforeCount} -> ${db.orders.length} orders.`);
  }

  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    const Sale = (await import('../src/models/sale.model.js')).default;
    const res = await Sale.deleteMany({
      sale_id: { $in: ['QXD-635049', 'QXD-492987'] }
    });
    console.log(`MongoDB sales deleted: ${res.deletedCount}`);
    await mongoose.disconnect();
  }

  console.log('Cleanup finished.');
}

cleanSpecificOrders().catch(console.error);
