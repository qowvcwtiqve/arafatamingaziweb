import { Router } from 'express';
import { verifyWebhook, receiveMessage, sendMessage, getContacts, getMessages } from '../controllers/whatsapp.controller.js';
import { protect, requireAdmin as admin } from '../middleware/auth.middleware.js';

const router = Router();

// Meta Webhook Verification
router.get('/webhook', verifyWebhook);

// Meta Webhook - Receive Messages
router.post('/webhook', receiveMessage);

// Admin API - Send Message from CRM
router.post('/send', protect, admin, sendMessage);

// Admin API - Get Contacts & Messages
router.get('/contacts', protect, admin, getContacts);
router.get('/messages/:phoneNumber', protect, admin, getMessages);

export default router;
