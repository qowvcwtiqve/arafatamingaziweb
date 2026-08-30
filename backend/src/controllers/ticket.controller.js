import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { query, readLocalDb, writeLocalDb, updateUserBalance } from '../config/db.js';

// Storage setup for ticket attachments
const uploadDir = path.join(process.cwd(), 'uploads', 'tickets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const filename = `ticket_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, filename);
  }
});

export const ticketUploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, WEBP, GIF) are allowed.'));
    }
  }
}).single('file');

export async function uploadTicketAttachment(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }
    const fileUrl = `/uploads/tickets/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.originalname
    });
  } catch (err) {
    console.error('Error uploading ticket image:', err);
    return res.status(500).json({ error: 'Failed to upload ticket image.' });
  }
}

// Helper to generate clean readable ticket number
function generateTicketNumber() {
  return `TK-${Math.floor(100000 + Math.random() * 900000)}`;
}

// 1. Create Ticket (Registered Buyer Only)
export async function createTicket(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Please create an account or sign in to submit a support ticket.' });
    }

    const { category, priority, order_id, deposit_id, subject, message, image_url } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const userName = req.user.name || 'Customer';
    const userEmail = req.user.email || '';
    const userId = req.user.id;
    const userTelegram = req.user.telegram_username || '';

    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const ticketId = `tkt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const ticketNumber = generateTicketNumber();
    const guestAccessToken = crypto.randomBytes(16).toString('hex');
    const ticketCategory = category || 'general';
    const ticketPriority = priority || 'medium';
    const ticketSubject = subject || `${ticketCategory.replace('_', ' ').toUpperCase()} Support Request`;

    // 1. Insert Ticket
    await query(
      `INSERT INTO tickets (
        id, ticket_number, user_id, user_name, user_email, user_telegram,
        order_id, deposit_id, category, priority, status, subject,
        guest_access_token, unread_user_count, unread_admin_count, last_reply_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        ticketId,
        ticketNumber,
        userId,
        userName,
        userEmail,
        userTelegram,
        order_id || null,
        deposit_id || null,
        ticketCategory,
        ticketPriority,
        'open',
        ticketSubject,
        guestAccessToken,
        0, // unread_user_count
        1, // unread_admin_count
        'user'
      ]
    );

    // 2. Insert Initial Message
    const msgId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, is_internal_note, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        msgId,
        ticketId,
        'user',
        userId,
        userName,
        message.trim(),
        false,
        image_url || null
      ]
    );

    return res.status(201).json({
      success: true,
      ticket: {
        id: ticketId,
        ticket_number: ticketNumber,
        guest_access_token: guestAccessToken,
        subject: ticketSubject,
        category: ticketCategory,
        status: 'open',
        priority: ticketPriority,
        created_at: new Date().toISOString()
      },
      message: 'Support ticket submitted successfully. Our team will assist you shortly.'
    });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    return res.status(500).json({ error: 'Failed to create support ticket. Please try again.' });
  }
}

// 2. Get My Tickets (Logged in Buyer)
export async function getMyTickets(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email?.toLowerCase();

    const { rows } = await query(
      `SELECT * FROM tickets WHERE user_id=$1 OR LOWER(user_email)=$2 ORDER BY updated_at DESC, created_at DESC`,
      [userId, userEmail]
    );

    return res.json({
      success: true,
      tickets: rows || []
    });
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}

// 3. Get Single Ticket Details & Conversation (Buyer, Guest, or Admin)
export async function getTicketById(req, res) {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers['x-guest-token'];
    const isAdmin = req.user?.role === 'admin';

    const { rows: tktRows } = await query(
      `SELECT * FROM tickets WHERE id=$1 OR ticket_number=$1`,
      [id]
    );

    const ticket = tktRows?.[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    // Security Authorization Check
    if (!isAdmin) {
      const isOwnerUser = req.user && (ticket.user_id === req.user.id || ticket.user_email?.toLowerCase() === req.user.email?.toLowerCase());
      const isOwnerGuest = token && ticket.guest_access_token === token;

      if (!isOwnerUser && !isOwnerGuest) {
        return res.status(403).json({ error: 'Unauthorized to view this ticket.' });
      }
    }

    // Reset unread counters
    if (isAdmin && ticket.unread_admin_count > 0) {
      ticket.unread_admin_count = 0;
      await query(`UPDATE tickets SET unread_admin_count=0 WHERE id=$1`, [ticket.id]);
    } else if (!isAdmin && ticket.unread_user_count > 0) {
      ticket.unread_user_count = 0;
      await query(`UPDATE tickets SET unread_user_count=0 WHERE id=$1`, [ticket.id]);
    }

    // Fetch Messages
    const { rows: msgRows } = await query(
      `SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC`,
      [ticket.id]
    );

    const messages = (msgRows || []).filter(m => isAdmin || !m.is_internal_note);

    // Fetch linked Order receipt details if order_id exists
    let order_details = null;
    if (ticket.order_id) {
      const db = readLocalDb();
      const order = (db.orders || []).find(o => o.id === ticket.order_id || o.order_number === ticket.order_id || o.sale_id === ticket.order_id);
      if (order) {
        order_details = {
          id: order.id,
          order_number: order.order_number || order.sale_id || order.id,
          total_amount: order.total_amount || order.price,
          currency: order.currency || 'INR',
          payment_status: order.payment_status || order.status,
          order_status: order.order_status || order.status,
          payment_method: order.payment_method || 'Online',
          delivered_items: order.delivered_items || order.delivered_content || order.credentials || '',
          product_name: order.product_name || (order.items && order.items[0]?.title) || 'Digital Asset',
          created_at: order.created_at || (order.purchase_ts ? new Date(order.purchase_ts * 1000).toISOString() : null)
        };
      }
    }

    // Fetch linked Deposit receipt details if deposit_id exists
    let deposit_details = null;
    if (ticket.deposit_id) {
      const db = readLocalDb();
      const dep = (db.deposits || []).find(d => d.id === ticket.deposit_id || d.utr === ticket.deposit_id || d.tx_id === ticket.deposit_id);
      if (dep) {
        deposit_details = {
          id: dep.id,
          amount: dep.amount,
          currency: dep.currency || 'INR',
          status: dep.status,
          gateway: dep.gateway || dep.payment_method || 'UPI Auto QR',
          utr: dep.utr || dep.tx_id || dep.transaction_hash || '',
          created_at: dep.created_at
        };
      }
    }

    return res.json({
      success: true,
      ticket,
      messages,
      order_details,
      deposit_details
    });
  } catch (err) {
    console.error('Error fetching ticket details:', err);
    return res.status(500).json({ error: 'Failed to load ticket.' });
  }
}

// 4. Reply to Ticket (Buyer, Guest, or Admin)
export async function replyTicket(req, res) {
  try {
    const { id } = req.params;
    const { message, is_internal_note, new_status, image_url } = req.body;
    const token = req.query.token || req.headers['x-guest-token'];
    const isAdmin = req.user?.role === 'admin';

    if ((!message || !message.trim()) && !image_url) {
      return res.status(400).json({ error: 'Message or image attachment cannot be empty.' });
    }

    const { rows: tktRows } = await query(
      `SELECT * FROM tickets WHERE id=$1 OR ticket_number=$1`,
      [id]
    );
    const ticket = tktRows?.[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Auth check
    let senderName = 'Support Agent';
    let senderType = 'admin';
    let senderId = req.user?.id || 'admin';

    if (!isAdmin) {
      const isOwnerUser = req.user && (ticket.user_id === req.user.id || ticket.user_email?.toLowerCase() === req.user.email?.toLowerCase());
      const isOwnerGuest = token && ticket.guest_access_token === token;

      if (!isOwnerUser && !isOwnerGuest) {
        return res.status(403).json({ error: 'Unauthorized to reply to this ticket.' });
      }

      senderName = ticket.user_name || 'Customer';
      senderType = 'user';
      senderId = req.user?.id || null;
    } else {
      senderName = req.user?.name || 'QuantumXD Support';
    }

    const msgId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const newMsg = {
      id: msgId,
      ticket_id: ticket.id,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message: (message || '').trim(),
      is_internal_note: isAdmin ? !!is_internal_note : false,
      image_url: image_url || null,
      created_at: new Date().toISOString()
    };

    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, is_internal_note, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [newMsg.id, newMsg.ticket_id, newMsg.sender_type, newMsg.sender_id, newMsg.sender_name, newMsg.message, newMsg.is_internal_note, newMsg.image_url]
    );

    // Update Ticket State
    if (!isAdmin) {
      await query(
        `UPDATE tickets SET last_reply_by='user', status='open', unread_admin_count=unread_admin_count+1 WHERE id=$1`,
        [ticket.id]
      );
    } else {
      const statusToSet = new_status || (ticket.status === 'open' ? 'in_progress' : ticket.status);
      await query(
        `UPDATE tickets SET last_reply_by='admin', status=$1, unread_user_count=unread_user_count+1 WHERE id=$2`,
        [statusToSet, ticket.id]
      );
    }

    return res.json({
      success: true,
      message: newMsg
    });
  } catch (err) {
    console.error('Error replying to ticket:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
}

// 5. Close Ticket (Buyer or Admin)
export async function closeTicket(req, res) {
  try {
    const { id } = req.params;
    const token = req.query.token || req.headers['x-guest-token'];
    const isAdmin = req.user?.role === 'admin';

    const { rows: tktRows } = await query(
      `SELECT * FROM tickets WHERE id=$1 OR ticket_number=$1`,
      [id]
    );
    const ticket = tktRows?.[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    if (!isAdmin) {
      const isOwnerUser = req.user && (ticket.user_id === req.user.id || ticket.user_email?.toLowerCase() === req.user.email?.toLowerCase());
      const isOwnerGuest = token && ticket.guest_access_token === token;
      if (!isOwnerUser && !isOwnerGuest) {
        return res.status(403).json({ error: 'Unauthorized.' });
      }
    }

    await query(`UPDATE tickets SET status='closed' WHERE id=$1`, [ticket.id]);

    // Add system notification message
    const msgId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, is_internal_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [msgId, ticket.id, 'system', null, 'System Notification', `Ticket marked as Closed by ${isAdmin ? 'Admin' : 'Customer'}.`, false]
    );

    return res.json({ success: true, message: 'Ticket has been closed.' });
  } catch (err) {
    console.error('Error closing ticket:', err);
    return res.status(500).json({ error: 'Failed to close ticket.' });
  }
}

// =================================================================
// ADMIN CONTROLLERS
// =================================================================

// 6. Admin Get All Tickets with Filters & Search
export async function adminGetTickets(req, res) {
  try {
    const { status, category, priority, search } = req.query;
    const { rows: allTickets } = await query(`SELECT * FROM tickets ORDER BY updated_at DESC`);

    let filtered = allTickets || [];

    if (status && status !== 'all') {
      filtered = filtered.filter(t => t.status === status);
    }
    if (category && category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }
    if (priority && priority !== 'all') {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter(t =>
        t.ticket_number?.toLowerCase().includes(s) ||
        t.user_email?.toLowerCase().includes(s) ||
        t.user_name?.toLowerCase().includes(s) ||
        t.subject?.toLowerCase().includes(s) ||
        t.order_id?.toLowerCase().includes(s) ||
        t.deposit_id?.toLowerCase().includes(s)
      );
    }

    // Compute live stats
    const stats = {
      total: allTickets.length,
      open: allTickets.filter(t => t.status === 'open').length,
      inProgress: allTickets.filter(t => t.status === 'in_progress').length,
      resolved: allTickets.filter(t => t.status === 'resolved').length,
      closed: allTickets.filter(t => t.status === 'closed').length,
      pendingAdminReply: allTickets.filter(t => t.unread_admin_count > 0).length,
      paymentIssues: allTickets.filter(t => t.category === 'payment_issue' || t.category === 'deposit_query').length,
    };

    return res.json({
      success: true,
      tickets: filtered,
      stats
    });
  } catch (err) {
    console.error('Error in adminGetTickets:', err);
    return res.status(500).json({ error: 'Failed to fetch admin tickets.' });
  }
}

// 7. Admin Update Ticket Status
export async function adminUpdateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await query(`UPDATE tickets SET status=$1 WHERE id=$2`, [status, id]);

    // System log
    const msgId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, is_internal_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [msgId, id, 'system', null, 'System Notification', `Ticket status updated to "${status.replace('_', ' ').toUpperCase()}".`, false]
    );

    return res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    console.error('Error in adminUpdateStatus:', err);
    return res.status(500).json({ error: 'Failed to update status.' });
  }
}

// 8. Admin Update Priority
export async function adminUpdatePriority(req, res) {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority.' });
    }

    await query(`UPDATE tickets SET priority=$1 WHERE id=$2`, [priority, id]);
    return res.json({ success: true, message: `Priority set to ${priority}.` });
  } catch (err) {
    console.error('Error in adminUpdatePriority:', err);
    return res.status(500).json({ error: 'Failed to update priority.' });
  }
}

// 9. Admin Save Internal Notes
export async function adminSaveNotes(req, res) {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    await query(`UPDATE tickets SET admin_notes=$1 WHERE id=$2`, [admin_notes || '', id]);
    return res.json({ success: true, message: 'Internal notes saved.' });
  } catch (err) {
    console.error('Error in adminSaveNotes:', err);
    return res.status(500).json({ error: 'Failed to save admin notes.' });
  }
}

// 10. Admin Delete Ticket
export async function adminDeleteTicket(req, res) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM tickets WHERE id=$1`, [id]);
    return res.json({ success: true, message: 'Ticket deleted.' });
  } catch (err) {
    console.error('Error in adminDeleteTicket:', err);
    return res.status(500).json({ error: 'Failed to delete ticket.' });
  }
}

// 11. Admin 1-Click Approve Linked Deposit from Ticket
export async function adminApproveDepositFromTicket(req, res) {
  try {
    const { id } = req.params;
    const { rows: tktRows } = await query(`SELECT * FROM tickets WHERE id=$1`, [id]);
    const ticket = tktRows?.[0];
    if (!ticket || !ticket.deposit_id) {
      return res.status(400).json({ error: 'No linked deposit found on this ticket.' });
    }

    const db = readLocalDb();
    const deposit = (db.deposits || []).find(d => d.id === ticket.deposit_id);
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit record not found.' });
    }

    if (deposit.status === 'completed') {
      return res.status(400).json({ error: 'Deposit is already marked as completed.' });
    }

    deposit.status = 'completed';
    deposit.updated_at = new Date().toISOString();
    writeLocalDb(db);

    // Credit User Balance
    if (deposit.user_id) {
      await updateUserBalance(deposit.user_id, 'add', deposit.amount);
    }

    // Add System Message inside Ticket
    const msgId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, sender_id, sender_name, message, is_internal_note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        msgId,
        ticket.id,
        'system',
        null,
        'Payment Verified',
        `✅ Deposit of ₹${deposit.amount} has been verified & credited to the user wallet balance by Admin.`,
        false
      ]
    );

    await query(`UPDATE tickets SET status='resolved' WHERE id=$1`, [ticket.id]);

    return res.json({
      success: true,
      message: `Deposit of ₹${deposit.amount} approved and credited successfully.`
    });
  } catch (err) {
    console.error('Error approving deposit from ticket:', err);
    return res.status(500).json({ error: 'Failed to approve deposit.' });
  }
}
