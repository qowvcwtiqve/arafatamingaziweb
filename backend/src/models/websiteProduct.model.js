import mongoose from 'mongoose';

const WebsiteProductSchema = new mongoose.Schema(
  {
    // These products are managed entirely on the website, so they have a standard MongoDB ObjectId
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category_id: { type: String, default: null }, // Maps to bot's category ID
    
    // Simple flat pricing for website-only products since they don't have bot variants
    price: { type: Number, required: true },
    compare_price: { type: Number, default: null },
    
    images: { type: [String], default: [] },
    badge: { type: String, default: '' },
    is_featured: { type: Boolean, default: false },
    is_published: { type: Boolean, default: true },
    
    delivery_time: { type: String, default: 'Instant' },
    rules: { type: String, default: '' },
    
    // Website specific tag to identify it on the frontend
    is_website_only: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    collection: 'website_products',
  }
);

const WebsiteProduct = mongoose.models.WebsiteProduct || mongoose.model('WebsiteProduct', WebsiteProductSchema);
export default WebsiteProduct;
