import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  const Sale = (await import('../src/models/sale.model.js')).default;
  const { query } = await import('../src/config/db.js');

  const { rows: users } = await query('SELECT id, name, email FROM users');
  const userMap = {};
  users.forEach(u => {
    if (u.id) userMap[u.id] = u.name;
    if (u.email) userMap[String(u.email).toLowerCase()] = u.name;
  });

  const sales = await Sale.find({}).lean();
  let updatedCount = 0;
  for (const s of sales) {
    const realName = userMap[s.user_id] || userMap[String(s.user_email || '').toLowerCase()];
    if (realName) {
      await Sale.updateOne({ _id: s._id }, { $set: { user_name: realName } });
      console.log(`Updated sale ${s.sale_id} (${s.user_email}) -> user_name: ${realName}`);
      updatedCount++;
    }
  }

  console.log(`Backfill finished. Updated ${updatedCount} sales.`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error(err);
  process.exit(1);
});
