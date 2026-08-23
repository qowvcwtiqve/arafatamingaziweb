import { Router } from 'express';
import Product from '../models/product.model.js';
import Category from '../models/category.model.js';

const router = Router();

// Keep track of connected SSE clients
const clients = new Set();

/**
 * Broadcast an event to all connected browsers
 */
export const broadcastEvent = (eventType, data = {}) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
};

import { syncAndFulfillPreordersFromBotStock } from '../services/orders.service.js';

/**
 * Setup MongoDB Change Stream & Fallback Poller to detect any bot changes in real-time
 */
let lastProductHash = '';
let changeStreamActive = false;

export const initRealtimeWatcher = () => {
  try {
    const changeStream = Product.watch([], { fullDocument: 'updateLookup' });
    changeStream.on('change', async (change) => {
      broadcastEvent('bot_product_changed', {
        operationType: change.operationType,
        productId: change.documentKey?._id,
        timestamp: Date.now(),
      });

      // If stock was updated (e.g. from Telegram Bot), fulfill pending website pre-orders immediately
      if (change.operationType === 'update' || change.operationType === 'insert') {
        await syncAndFulfillPreordersFromBotStock();
      }
    });
    changeStream.on('error', (err) => {
      console.log('Change stream fallback enabled:', err.message);
      changeStreamActive = false;
    });
    changeStreamActive = true;
    console.log('⚡ [Realtime] MongoDB ChangeStream active');
  } catch (err) {
    console.log('⚡ [Realtime] Using high-speed delta watcher fallback');
  }

  // Delta polling fallback every 4 seconds to guarantee sync & pre-order fulfillment on all connection modes
  setInterval(async () => {
    try {
      // 1. Check & fulfill pending preorders if bot added stock
      await syncAndFulfillPreordersFromBotStock();

      // 2. Detect product changes for frontend SSE
      const prods = await Product.find({}, { _id: 1, is_active: 1, variants: 1, stock_pools: 1, infinite_pools: 1, updatedAt: 1 }).lean();
      const currentHash = prods.map(p => `${p._id}:${p.is_active}:${Object.keys(p.variants || {}).length}:${Object.values(p.stock_pools || {}).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)}`).join('|');
      
      if (lastProductHash && currentHash !== lastProductHash) {
        broadcastEvent('bot_product_changed', {
          type: 'delta_sync',
          timestamp: Date.now(),
        });
      }
      lastProductHash = currentHash;
    } catch {
      // ignore
    }
  }, 4000);
};

// GET /api/realtime/stream — Server-Sent Events endpoint for instant live sync
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

  clients.add(res);

  // Heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

// GET /api/realtime/check — Lightweight polling endpoint for client revalidation
router.get('/check', async (req, res) => {
  try {
    const count = await Product.countDocuments({});
    res.json({ count, hash: lastProductHash, time: Date.now() });
  } catch {
    res.json({ count: 0, time: Date.now() });
  }
});

export default router;
