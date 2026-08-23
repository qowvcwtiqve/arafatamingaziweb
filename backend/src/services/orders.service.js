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

  // Find pending Pre-Order website sales for this product+pool, FIFO (oldest first)
  const pendingOrders = await Sale.find({
    product_id: productId,
    pool_id: poolId,
    status: 'Pre-Order',
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
          admin_notes: `Auto-delivered from pre-order queue. Stock added by admin.`,
        }
      }
    );

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
 * can be fulfilled from current stock in MongoDB (e.g. if stock was added directly from the Bot).
 */
export const syncAndFulfillPreordersFromBotStock = async () => {
  try {
    const pendingPreorders = await Sale.find({ status: 'Pre-Order' })
      .sort({ purchase_ts: 1 })
      .lean();

    if (!pendingPreorders.length) return;

    for (const order of pendingPreorders) {
      const prod = await Product.findById(order.product_id);
      if (!prod) continue;

      const poolStock = (prod.stock_pools || {})[order.pool_id] || [];
      if (Array.isArray(poolStock) && poolStock.length > 0) {
        // Take first available credential
        const credential = poolStock[0];
        const remainingPoolStock = poolStock.slice(1);
        const now = Math.floor(Date.now() / 1000);

        // 1. Update Sale to Delivered
        await Sale.findOneAndUpdate(
          { sale_id: order.sale_id },
          {
            $set: {
              status: 'Delivered',
              credentials: credential,
              last_edited_at: now,
              admin_notes: `Auto-delivered from bot stock pool.`,
            }
          }
        );

        // 2. Remove consumed credential from MongoDB Product pool
        await Product.findByIdAndUpdate(order.product_id, {
          $set: { [`stock_pools.${order.pool_id}`]: remainingPoolStock }
        });

        console.log(`[BotSync Pre-Order] Auto-fulfilled order ${order.sale_id} from Bot Stock Pool (${order.pool_id}). Remaining pool stock: ${remainingPoolStock.length}`);
      }
    }
  } catch (err) {
    console.error('Error in syncAndFulfillPreordersFromBotStock:', err.message);
  }
};




/**
 * Fetch all Website orders from MongoDB (website_sales) + Postgres (orders)
 * Bot sales remain strictly on the bot.
 */
export const getWebsiteOrders = async () => {
  let webSales = [];
  try {
    webSales = await Sale.find({}).sort({ purchase_ts: -1 }).lean();
  } catch (err) {
    console.error('Error fetching website sales:', err.message);
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
    websiteOrders.push({
      id: s.sale_id,
      order_number: s.sale_id,
      source: 'website',
      user_id: s.user_id,
      username: s.user_name || 'Website Customer',
      user_email: s.user_email || '',
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
    websiteOrders.push({
      id: o.id,
      order_number: o.order_number || o.id,
      source: 'website',
      user_id: o.buyer_id,
      username: o.buyer_name || 'Website Buyer',
      user_email: o.buyer_email || '',
      product_id: o.product_id || '',
      product_name: o.title || 'Website Order',
      variant_name: o.variant_name || '',
      pool_id: 'default',
      price: parseFloat(o.total_amount || 0),
      total_amount: parseFloat(o.total_amount || 0),
      quantity: 1,
      status: o.payment_status === 'paid' ? 'Delivered' : (o.payment_status === 'pending' ? 'Pending' : 'Canceled'),
      credentials: o.credentials || '',
      purchase_ts: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
      created_at: o.created_at || new Date().toISOString(),
      end_ts: null,
      delivery_method: o.payment_method || 'upi',
      admin_notes: '',
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
    delivered: all.filter(o => o.status === 'Delivered').length,
    pending: all.filter(o => o.status === 'Pending').length,
    preorder: all.filter(o => o.status === 'Pre-Order').length,
    refunded: all.filter(o => o.status === 'Refunded').length,
    canceled: all.filter(o => o.status === 'Canceled').length,
    total_revenue: all
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + o.total_amount, 0),
  };

  let filtered = all;

  // Filter by Status Tab
  if (status !== 'all') {
    filtered = filtered.filter(o => o.status.toLowerCase() === status.toLowerCase());
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
  // 1. Try updating in website_sales
  try {
    const updateObj = { status: newStatus, last_edited_at: Date.now() / 1000 };
    if (credentials !== null) updateObj.credentials = credentials;
    if (adminNotes !== null) updateObj.admin_notes = adminNotes;
    const res = await Sale.findOneAndUpdate({ sale_id: orderId }, { $set: updateObj }, { new: true });
    if (res) return { success: true, source: 'website' };
  } catch (err) {
    console.error('Error updating website sale status:', err.message);
  }

  // 2. Try updating in Postgres orders
  try {
    const pgStatus = newStatus === 'Delivered' ? 'paid' : (newStatus === 'Pending' ? 'pending' : 'failed');
    await query('UPDATE orders SET payment_status=$1, updated_at=NOW() WHERE id=$2 OR order_number=$3', [pgStatus, orderId, orderId]);
    return { success: true, source: 'postgres' };
  } catch {
    // ignore
  }

  return { success: true };
};
