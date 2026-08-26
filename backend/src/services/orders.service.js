import mongoose from 'mongoose';
import Sale from '../models/sale.model.js';
import Product from '../models/product.model.js';
import { query } from '../config/db.js';

/**
 * Auto-fulfill pending website Pre-Orders from newly added stock.
 * Works exactly like the bot: stock_items are distributed FIFO to pending
 * Pre-Order website_sales. Returns any remaining (unfulfilled) stock items.
 *
 * @param {string} productId - MongoDB product _id
 * @param {string} poolId    - Pool ID that received stock
 * @param {string[]} stockItems - Newly added stock items (credentials)
 * @returns {string[]} - Remaining items that were NOT used for pre-orders
 */
export const fulfillWebsitePreorders = async (productId, poolId, stockItems) => {
  if (!stockItems || stockItems.length === 0) return [];

  // Find pending Pre-Order website sales for this product or pool, FIFO (oldest first)
  const pendingOrders = await Sale.find({
    $and: [
      {
        $or: [
          { product_id: productId },
          { product_id: String(productId) },
          { pool_id: poolId },
        ]
      },
      {
        status: { $regex: /^pre[- ]?order$/i }
      }
    ]
  }).sort({ purchase_ts: 1 }).lean(); // ASC = oldest first (FIFO)

  if (!pendingOrders.length) return stockItems; // No pre-orders, return all stock to pool

  const remainingStock = [...stockItems];
  const now = Math.floor(Date.now() / 1000);
  let fulfilledCount = 0;

  for (const order of pendingOrders) {
    if (remainingStock.length === 0) break; // No more stock to give

    const credential = remainingStock.shift(); // Take first item (FIFO)

    // Mark as Delivered with the credential
    await Sale.findOneAndUpdate(
      { sale_id: order.sale_id },
      {
        $set: {
          status: 'Delivered',
          credentials: credential,
          last_edited_at: now,
          admin_notes: `Auto-delivered from pre-order queue upon stock arrival.`,
        }
      }
    );

    // Also update SQL orders table
    await query(
      "UPDATE orders SET payment_status='paid', order_status='Delivered', delivered_items=$1, updated_at=NOW() WHERE id=$2 OR order_number=$2 OR sale_id=$2",
      [credential, order.sale_id]
    ).catch(() => {});

    fulfilledCount++;
    console.log(`[Pre-Order] Auto-fulfilled ${order.sale_id} → credential: ${credential.substring(0, 30)}...`);
  }

  if (fulfilledCount > 0) {
    console.log(`[Pre-Order] Auto-fulfilled ${fulfilledCount} website pre-orders for product ${productId}, pool ${poolId}. Remaining pool stock: ${remainingStock.length}`);
  }

  return remainingStock; // Return unfulfilled stock → goes to pool
};

/**
 * Background checker: Checks if any pending Pre-Orders on the website
 * can be fulfilled from current stock in MongoDB (e.g. if stock was added directly from the Bot or Admin).
 */
export const syncAndFulfillPreordersFromBotStock = async () => {
  try {
    const pendingPreorders = await Sale.find({ status: { $regex: /^pre[- ]?order$/i } })
      .sort({ purchase_ts: 1 })
      .lean();

    if (!pendingPreorders.length) return;

    for (const order of pendingPreorders) {
      const prod = await Product.findById(order.product_id);
      if (!prod) continue;

      // STRICT: Must match the order's specific pool_id ONLY. Never steal from other pools!
      const targetPoolId = order.pool_id;
      const pools = prod.stock_pools || {};

      if (targetPoolId && Array.isArray(pools[targetPoolId]) && pools[targetPoolId].length > 0) {
        const credential = pools[targetPoolId][0];
        const remainingPoolStock = pools[targetPoolId].slice(1);
        const now = Math.floor(Date.now() / 1000);

        // 1. Update Sale to Delivered
        await Sale.findOneAndUpdate(
          { sale_id: order.sale_id },
          {
            $set: {
              status: 'Delivered',
              credentials: credential,
              last_edited_at: now,
              admin_notes: `Auto-delivered from pre-order stock pool (${targetPoolId}).`,
            }
          }
        );

        // 2. Update SQL orders table and local_db.json
        await query(
          "UPDATE orders SET payment_status='paid', order_status='Delivered', delivered_items=$1, updated_at=NOW() WHERE id=$2 OR order_number=$2 OR sale_id=$2",
          [credential, order.sale_id]
        ).catch(() => {});

        // 3. Remove consumed credential from MongoDB Product pool
        await Product.findByIdAndUpdate(order.product_id, {
          $set: { [`stock_pools.${targetPoolId}`]: remainingPoolStock }
        });

        console.log(`[BotSync Pre-Order] Auto-fulfilled order ${order.sale_id} from Stock Pool (${targetPoolId}). Remaining pool stock: ${remainingPoolStock.length}`);
      }
    }
  } catch (err) {
    console.error('Error in syncAndFulfillPreordersFromBotStock:', err.message);
  }
};

const normalizeStatusKey = (st) => {
  const s = String(st || '').toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'delivered' || s === 'paid') return 'delivered';
  if (s === 'preorder') return 'preorder';
  if (s === 'pending' || s === 'processing' || s === 'underreview' || s === 'hold') return 'pending';
  if (s === 'refunded') return 'refunded';
  if (s === 'canceled' || s === 'cancelled' || s === 'failed') return 'canceled';
  return s;
};

/**
 * Fetch all Website orders from MongoDB (website_sales) + Postgres (orders)
 */
export const getWebsiteOrders = async () => {
  let webSales = [];
  try {
    webSales = await Sale.find({}).sort({ purchase_ts: -1 }).lean();
  } catch (err) {
    console.error('Error fetching website sales:', err.message);
  }

  // Fetch users map for robust customer name enrichment
  const userMapById = {};
  const userMapByEmail = {};
  try {
    const { rows: allUsers } = await query('SELECT id, name, email, telegram_username FROM users');
    (allUsers || []).forEach((u) => {
      if (u.id) userMapById[u.id] = u;
      if (u.email) userMapByEmail[String(u.email).toLowerCase()] = u;
    });
  } catch (err) {
    console.error('Error fetching users map:', err.message);
  }

  // Also fetch any postgres orders
  let pgOrders = [];
  try {
    const { rows } = await query(`
      SELECT o.*, u.name AS buyer_name, u.email AS buyer_email
      FROM orders o LEFT JOIN users u ON u.id=o.buyer_id
      ORDER BY o.created_at DESC LIMIT 200
    `);
    pgOrders = rows || [];
  } catch {
    // Postgres optional
  }

  const websiteOrders = [];
  const seenIds = new Set();

  // 1. Process Website Mongo Sales (website_sales collection)
  for (const s of webSales) {
    if (seenIds.has(s.sale_id)) continue;
    seenIds.add(s.sale_id);

    const matchedUser = userMapById[s.user_id] || userMapByEmail[String(s.user_email || '').toLowerCase()];
    const resolvedName = (s.user_name && s.user_name !== 'Customer' && s.user_name !== 'Website Customer' && s.user_name !== 'Unknown')
      ? s.user_name
      : (matchedUser?.name || matchedUser?.telegram_username || (s.user_email ? s.user_email.split('@')[0] : 'Customer'));
    const resolvedEmail = s.user_email || matchedUser?.email || '';

    websiteOrders.push({
      id: s.sale_id,
      order_number: s.sale_id,
      source: 'website',
      user_id: s.user_id,
      username: resolvedName,
      user_email: resolvedEmail,
      product_id: s.product_id,
      product_name: s.product_name,
      variant_name: s.variant_name || '',
      pool_id: s.pool_id || 'default',
      price: parseFloat(s.price || 0),
      total_amount: parseFloat(s.price || 0) * (s.quantity || 1),
      quantity: s.quantity || 1,
      status: s.status || 'Delivered',
      credentials: s.credentials || '',
      purchase_ts: s.purchase_ts ? s.purchase_ts * 1000 : Date.now(),
      created_at: s.purchase_ts ? new Date(s.purchase_ts * 1000).toISOString() : new Date().toISOString(),
      end_ts: s.end_ts ? s.end_ts * 1000 : null,
      delivery_method: s.delivery_method || 'auto',
      admin_notes: s.admin_notes || '',
    });
  }

  // 2. Process Postgres Orders
  for (const o of pgOrders) {
    const sid = o.order_number || o.id;
    if (seenIds.has(sid)) continue;
    seenIds.add(sid);

    const matchedUser = userMapById[o.buyer_id] || userMapByEmail[String(o.buyer_email || '').toLowerCase()];
    const resolvedName = o.buyer_name || matchedUser?.name || matchedUser?.telegram_username || (o.buyer_email ? o.buyer_email.split('@')[0] : 'Buyer');
    const resolvedEmail = o.buyer_email || matchedUser?.email || '';
    const orderStatus = o.order_status || (o.payment_status === 'paid' ? 'Delivered' : (o.payment_status === 'pending' || o.payment_status === 'under_review' ? 'Pending' : 'Canceled'));

    websiteOrders.push({
      id: o.id,
      order_number: o.order_number || o.id,
      source: 'website',
      user_id: o.buyer_id,
      username: resolvedName,
      user_email: resolvedEmail,
      product_id: o.product_id || '',
      product_name: o.title || 'Website Order',
      variant_name: o.variant_name || '',
      pool_id: 'default',
      price: parseFloat(o.total_amount || 0),
      total_amount: parseFloat(o.total_amount || 0),
      quantity: 1,
      status: orderStatus,
      credentials: o.credentials || o.delivered_items || '',
      purchase_ts: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
      created_at: o.created_at || new Date().toISOString(),
      end_ts: null,
      delivery_method: o.payment_method || 'upi',
      admin_notes: o.admin_notes || '',
    });
  }

  // Sort recent first
  websiteOrders.sort((a, b) => b.purchase_ts - a.purchase_ts);
  return websiteOrders;
};

/**
 * Filter, search, and paginate website orders
 */
export const getFilteredOrders = async ({
  status = 'all',
  search = '',
  page = 1,
  limit = 25,
}) => {
  const all = await getWebsiteOrders();

  // Live status counts strictly for website orders
  const stats = {
    total: all.length,
    delivered: all.filter(o => normalizeStatusKey(o.status) === 'delivered').length,
    pending: all.filter(o => normalizeStatusKey(o.status) === 'pending').length,
    preorder: all.filter(o => normalizeStatusKey(o.status) === 'preorder').length,
    refunded: all.filter(o => normalizeStatusKey(o.status) === 'refunded').length,
    canceled: all.filter(o => normalizeStatusKey(o.status) === 'canceled').length,
    total_revenue: all
      .filter(o => normalizeStatusKey(o.status) === 'delivered')
      .reduce((sum, o) => sum + o.total_amount, 0),
  };

  let filtered = all;

  // Filter by Status Tab
  if (status && status !== 'all') {
    const targetKey = normalizeStatusKey(status);
    filtered = filtered.filter(o => normalizeStatusKey(o.status) === targetKey);
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(o =>
      (o.order_number || '').toLowerCase().includes(q) ||
      (o.username || '').toLowerCase().includes(q) ||
      (o.user_email || '').toLowerCase().includes(q) ||
      (o.product_name || '').toLowerCase().includes(q) ||
      (o.variant_name || '').toLowerCase().includes(q) ||
      (o.credentials || '').toLowerCase().includes(q) ||
      (String(o.user_id) || '').toLowerCase().includes(q)
    );
  }

  const totalFiltered = filtered.length;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 25;
  const totalPages = Math.ceil(totalFiltered / limitNum) || 1;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(startIndex, startIndex + limitNum);

  return {
    orders: paginated,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total_count: totalFiltered,
      total_pages: totalPages,
    },
    stats,
  };
};

/**
 * Update website order status or credentials
 */
export const updateOrderStatus = async (orderId, newStatus, credentials = null, adminNotes = null) => {
  const cleanId = String(orderId || '').trim();
  const idRegex = new RegExp(`^${cleanId}$`, 'i');
  let updatedSale = null;

  // 1. Try updating in website_sales (MongoDB)
  try {
    const updateObj = {
      status: newStatus,
      last_edited_at: Math.floor(Date.now() / 1000)
    };
    if (credentials !== null && credentials !== undefined) {
      updateObj.credentials = credentials;
    }
    if (adminNotes !== null && adminNotes !== undefined) {
      updateObj.admin_notes = adminNotes;
    }

    const orConditions = [
      { sale_id: idRegex },
      { sale_id: cleanId }
    ];
    if (mongoose.Types.ObjectId.isValid(cleanId) && cleanId.length === 24) {
      orConditions.push({ _id: cleanId });
    }

    updatedSale = await Sale.findOneAndUpdate(
      { $or: orConditions },
      { $set: updateObj },
      { new: true }
    );
  } catch (err) {
    console.error('Error updating website sale status:', err.message);
  }

  // 2. Always sync with Postgres orders table
  try {
    const pgPaymentStatus = newStatus === 'Delivered' ? 'paid' : (newStatus === 'Pending' || newStatus === 'Pre-Order' ? 'paid' : 'failed');
    await query(
      `UPDATE orders 
       SET order_status=$1, 
           payment_status=$2, 
           delivered_items=COALESCE($3, delivered_items), 
           admin_notes=COALESCE($4, admin_notes), 
           updated_at=NOW() 
       WHERE id=$5 OR order_number=$5 OR sale_id=$5`,
      [newStatus, pgPaymentStatus, credentials, adminNotes, cleanId]
    );
  } catch (err) {
    console.error('Error syncing Postgres order status:', err.message);
  }

  return {
    success: true,
    sale: updatedSale,
    status: newStatus
  };
};
