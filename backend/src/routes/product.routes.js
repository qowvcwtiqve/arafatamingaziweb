import { Router } from 'express';
import { getProducts, getProduct, getCategories, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { protect, requireAdmin, requireSeller, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:slug', optionalAuth, getProduct);
router.post('/', protect, requireSeller, createProduct);
router.put('/:id', protect, requireSeller, updateProduct);
router.delete('/:id', protect, requireSeller, deleteProduct);
export default router;
