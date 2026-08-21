import { Router } from 'express';
import { query } from '../config/db.js';
import path from 'path';
import { createReadStream } from 'fs';

const router = Router();

// GET /api/download/:token
router.get('/:token', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT oi.*, p.file_url, p.title AS product_title, p.file_type
      FROM order_items oi
      LEFT JOIN products p ON p.id=oi.product_id
      WHERE oi.download_token=$1
    `, [req.params.token]);

    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'Invalid or expired download link' });
    if (item.download_token_expires && new Date(item.download_token_expires) < new Date()) {
      return res.status(410).json({ error: 'Download link has expired' });
    }
    if (item.download_count >= item.max_downloads) {
      return res.status(429).json({ error: `Download limit reached (max ${item.max_downloads})` });
    }

    // Increment download count
    await query('UPDATE order_items SET download_count=download_count+1 WHERE id=$1', [item.id]);
    await query('UPDATE products SET downloads_count=downloads_count+1 WHERE id=$1', [item.product_id]);

    // If product has a file URL, redirect to it (Cloudinary signed URL)
    if (item.file_url) {
      return res.redirect(item.file_url);
    }

    // If it was a key/content delivery, show the content
    if (item.delivered_content) {
      return res.json({ content: item.delivered_content, product: item.product_title });
    }

    res.status(404).json({ error: 'No downloadable content found' });
  } catch (err) { next(err); }
});

export default router;
