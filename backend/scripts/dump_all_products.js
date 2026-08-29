import { connectMongoDB } from '../src/config/mongodb.js';
import Product from '../src/models/product.model.js';
import WebsiteProduct from '../src/models/websiteProduct.model.js';
import Category from '../src/models/category.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function dump() {
  try {
    await connectMongoDB();

    // 1. Fetch categories
    const categories = await Category.find({}).lean();
    const catMap = {};
    categories.forEach(c => {
      catMap[c._id] = c.name;
    });

    // 2. Fetch Bot Products
    const botProducts = await Product.find({}).lean();
    
    // 3. Fetch Website Products
    const webProducts = await WebsiteProduct.find({}).lean();

    console.log(`Fetched: ${botProducts.length} Bot Products, ${webProducts.length} Website Products`);

    const all = [];

    // Format Bot Products
    botProducts.forEach(p => {
      const meta = p.website_meta || {};
      const isActive = p.is_active !== false;
      const isPublished = meta.is_published !== false;
      
      let variantsList = [];
      let minPrice = 0;
      let maxPrice = 0;

      if (p.variants) {
        if (Array.isArray(p.variants)) {
          variantsList = p.variants;
        } else if (typeof p.variants === 'object') {
          variantsList = Object.entries(p.variants).map(([k, v]) => ({
            id: k,
            name: v.name || k,
            price: v.price || 0,
            stock: v.stock !== undefined ? v.stock : (v.is_infinite ? 'Infinite' : 'N/A'),
            delivery_method: v.delivery_method || v.pool_id || 'Instant'
          }));
        }
      }

      if (variantsList.length > 0) {
        const prices = variantsList.map(v => v.price || 0);
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }

      all.push({
        id: p._id,
        name: meta.title || p.name || 'Untitled Product',
        type: 'Telegram Bot Product',
        category: catMap[p.category_id] || p.category_id || 'General',
        is_active: isActive,
        is_published: isPublished,
        status: (isActive && isPublished) ? 'ACTIVE (Live on Website)' : (!isActive ? 'INACTIVE (Bot Disabled)' : 'UNPUBLISHED (Hidden from Website)'),
        min_price: minPrice,
        max_price: maxPrice,
        delivery_process: p.delivery_process || 'Instant',
        delivery_time: meta.delivery_time || 'Instant',
        variants: variantsList,
        slug: p.slug || p._id
      });
    });

    // Format Website Products
    webProducts.forEach(p => {
      const isActive = p.is_active !== false;
      const isPublished = p.is_published !== false;
      
      all.push({
        id: p._id.toString(),
        name: p.name || 'Untitled Product',
        type: 'Website Only Product',
        category: catMap[p.category_id] || p.category_id || 'General',
        is_active: isActive,
        is_published: isPublished,
        status: (isActive && isPublished) ? 'ACTIVE (Live on Website)' : 'INACTIVE / DRAFT',
        min_price: p.price || 0,
        max_price: p.price || 0,
        delivery_process: p.delivery_process || 'Manual',
        delivery_time: p.delivery_time || 'Instant',
        variants: [{ name: 'Standard Plan', price: p.price || 0, stock: 'Available' }],
        slug: p.slug || p._id.toString()
      });
    });

    // Sort by name
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    let content = '========================================================================================\n';
    content += '                           QUANTUMXD STORE — COMPLETE PRODUCTS LIST                    \n';
    content += '                          (All Active, Inactive, Bot & Web Products)                   \n';
    content += `                                 Total Products: ${all.length}                          \n`;
    content += `                               Generated: ${new Date().toLocaleString()}                \n`;
    content += '========================================================================================\n\n';

    let activeCount = 0;
    let inactiveCount = 0;

    all.forEach((p, idx) => {
      if (p.is_active && p.is_published) activeCount++; else inactiveCount++;

      content += `----------------------------------------------------------------------------------------\n`;
      content += `[#${idx + 1}] ${p.name}\n`;
      content += `----------------------------------------------------------------------------------------\n`;
      content += `  • Product ID     : ${p.id}\n`;
      content += `  • Source / Type  : ${p.type}\n`;
      content += `  • Status         : [ ${p.status} ]\n`;
      content += `  • Category       : ${p.category}\n`;
      content += `  • Price Range    : ₹${p.min_price} - ₹${p.max_price}\n`;
      content += `  • Delivery Time  : ${p.delivery_time}\n`;
      content += `  • URL Link       : https://quantumxd.store/products/${p.slug}\n`;
      content += `  • Total Plans    : ${p.variants.length}\n`;
      if (p.variants.length > 0) {
        content += `  • Plans / Variants:\n`;
        p.variants.forEach(v => {
          content += `      - ${v.name}: ₹${v.price} (Stock: ${v.stock ?? 'N/A'})\n`;
        });
      }
      content += `\n`;
    });

    content += `========================================================================================\n`;
    content += `SUMMARY STATISTICS:\n`;
    content += `  • Total Products in Database : ${all.length}\n`;
    content += `  • Active & Live Products     : ${activeCount}\n`;
    content += `  • Inactive / Hidden Products : ${inactiveCount}\n`;
    content += `========================================================================================\n`;

    const outPath = path.join(__dirname, '../../ALL_PRODUCTS_LIST.txt');
    fs.writeFileSync(outPath, content, 'utf8');
    console.log('✅ Successfully generated ALL_PRODUCTS_LIST.txt with', all.length, 'products at:', outPath);

    process.exit(0);
  } catch (err) {
    console.error('Error generating product dump:', err);
    process.exit(1);
  }
}

dump();
