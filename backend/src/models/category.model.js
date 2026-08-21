/**
 * Category Schema — mirrors bot's MongoDB categories collection.
 * Bot stores: { name, priority }
 * Website adds: website_meta { image, description }
 */

import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    priority: { type: Number, default: 999999 },
    website_meta: {
      image: { type: String, default: '' },
      description: { type: String, default: '' },
      icon: { type: String, default: '' },   // emoji or icon name
    },
  },
  {
    strict: false,
    _id: false,
    collection: 'categories',
  }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export default Category;
