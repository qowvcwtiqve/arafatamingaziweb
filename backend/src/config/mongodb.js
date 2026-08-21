/**
 * MongoDB Atlas Connection
 * Connects to the same MongoDB Atlas instance used by the Telegram bot.
 * The bot owns: products, categories, sales (system.sales), users collections.
 * The website READS bot's collections and WRITES to website_meta field only.
 */

import mongoose from 'mongoose';
import Product from '../models/product.model.js';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb://arafatamingazi_db_user:201fPycnoVv25zGp@ac-4w8rop5-shard-00-00.wliqzg8.mongodb.net:27017,ac-4w8rop5-shard-00-01.wliqzg8.mongodb.net:27017,ac-4w8rop5-shard-00-02.wliqzg8.mongodb.net:27017/telegram_store_bot?ssl=true&replicaSet=atlas-18szxw-shard-0&authSource=admin&retryWrites=true&w=majority';

let isConnected = false;

export const connectMongoDB = async () => {
  if (isConnected) return;

  try {
    console.log('⏳ [MongoDB] Connecting to Atlas...');
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    isConnected = true;
    console.log('✅ [MongoDB] Connected to Atlas (bot database — read mode)');

    // Auto-seed images for products that don't have them
    const products = await Product.find({
      $or: [
        { 'website_meta.images': { $exists: false } },
        { 'website_meta.images': { $size: 0 } },
        { 'website_meta.images': null }
      ]
    });
    for (const p of products) {
      const name = p.name || 'product';
      
      let price = 500;
      if (p.variants) {
        const firstVariantKey = Object.keys(p.variants)[0];
        if (firstVariantKey && p.variants[firstVariantKey]) {
          price = p.variants[firstVariantKey].price || 500;
        }
      }
      
      await Product.findByIdAndUpdate(p._id, {
        $set: {
          'website_meta.images': ['https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'],
          'website_meta.title': name,
          'website_meta.is_published': true, // Auto-publish for demo purposes based on user request
          'website_meta.compare_price': Math.round(price * 1.5)
        }
      });
      console.log(`Seeded image and meta for: ${name}`);
    }
  } catch (err) {
    console.error('❌ [MongoDB] Connection failed:', err.message);
    // Don't crash server — fall back gracefully
  }
};

export const getMongoClient = () => mongoose.connection.getClient();

export default mongoose;
