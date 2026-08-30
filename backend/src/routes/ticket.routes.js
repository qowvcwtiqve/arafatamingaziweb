import express from 'express';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  replyTicket,
  closeTicket,
  uploadTicketAttachment,
  ticketUploadMiddleware,
  adminGetTickets,
  adminUpdateStatus,
  adminUpdatePriority,
  adminSaveNotes,
  adminDeleteTicket,
  adminApproveDepositFromTicket,
} from '../controllers/ticket.controller.js';
import { protect, requireAdmin, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// Public & Buyer Routes
// ==========================================

// Upload ticket screenshot / image attachment (Logged In)
router.post('/upload', protect, ticketUploadMiddleware, uploadTicketAttachment);

// Create a new support ticket (Logged in Buyer)
router.post('/', protect, createTicket);

// Get my tickets (Logged in Buyer)
router.get('/my-tickets', protect, getMyTickets);

// Get single ticket details & conversation (Buyer or Admin)
router.get('/:id', protect, getTicketById);

// Reply to a ticket (Buyer or Admin)
router.post('/:id/reply', protect, replyTicket);

// Close ticket
router.patch('/:id/close', protect, closeTicket);

// ==========================================
// Admin Management Routes
// ==========================================
export const adminTicketRouter = express.Router();

// All admin routes require admin authentication
adminTicketRouter.use(protect, requireAdmin);

adminTicketRouter.get('/', adminGetTickets);
adminTicketRouter.get('/:id', getTicketById);
adminTicketRouter.post('/:id/reply', replyTicket);
adminTicketRouter.patch('/:id/status', adminUpdateStatus);
adminTicketRouter.patch('/:id/priority', adminUpdatePriority);
adminTicketRouter.patch('/:id/notes', adminSaveNotes);
adminTicketRouter.delete('/:id', adminDeleteTicket);
adminTicketRouter.post('/:id/approve-deposit', adminApproveDepositFromTicket);

export default router;
