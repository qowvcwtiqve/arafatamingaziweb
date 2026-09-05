import asyncHandler from 'express-async-handler';
import axios from 'axios';
import WhatsappContact from '../models/WhatsappContact.js';
import WhatsappMessage from '../models/WhatsappMessage.js';

// @desc    Verify Meta Webhook
// @route   GET /api/whatsapp/webhook
// @access  Public
export const verifyWebhook = asyncHandler(async (req, res) => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

// @desc    Receive Message from Meta Webhook
// @route   POST /api/whatsapp/webhook
// @access  Public
export const receiveMessage = asyncHandler(async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from; 
      const msgBody = messageObj.text?.body || ''; 
      const messageId = messageObj.id;
      const contactName = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'Unknown';

      console.log(`Received message from ${from}: ${msgBody}`);

      try {
        // 1. Update or Create Contact
        const contact = await WhatsappContact.findOneAndUpdate(
          { phoneNumber: from },
          { 
            name: contactName,
            lastMessageAt: new Date()
          },
          { upsert: true, new: true }
        );

        // 2. Save Message
        const newMessage = await WhatsappMessage.create({
          messageId: messageId,
          phoneNumber: from,
          direction: 'incoming',
          type: messageObj.type || 'text',
          text: msgBody,
          status: 'received'
        });

        // 3. TODO: Emit to frontend via Socket.io for realtime update

      } catch (error) {
        console.error('Error saving WhatsApp message to DB:', error);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// @desc    Send WhatsApp Message from CRM
// @route   POST /api/whatsapp/send
// @access  Private/Admin
export const sendMessage = asyncHandler(async (req, res) => {
  const { to, message } = req.body;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const token = process.env.META_ACCESS_TOKEN;

  if (!to || !message) {
    res.status(400);
    throw new Error('Please provide recipient number and message');
  }

  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message },
      },
    });

    const messageId = response.data.messages[0].id;

    // Save outgoing message to DB
    await WhatsappMessage.create({
      messageId: messageId,
      phoneNumber: to,
      direction: 'outgoing',
      type: 'text',
      text: message,
      status: 'sent'
    });

    // Update lastMessageAt for contact
    await WhatsappContact.findOneAndUpdate(
      { phoneNumber: to },
      { lastMessageAt: new Date() },
      { upsert: true }
    );

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
    res.status(500);
    throw new Error('Failed to send WhatsApp message');
  }
});

// @desc    Get WhatsApp Contacts
// @route   GET /api/whatsapp/contacts
// @access  Private/Admin
export const getContacts = asyncHandler(async (req, res) => {
  const contacts = await WhatsappContact.find().sort({ lastMessageAt: -1 });
  res.status(200).json(contacts);
});

// @desc    Get Messages for a Contact
// @route   GET /api/whatsapp/messages/:phoneNumber
// @access  Private/Admin
export const getMessages = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.params;
  const messages = await WhatsappMessage.find({ phoneNumber }).sort({ createdAt: 1 });
  
  // Mark messages as read
  await WhatsappMessage.updateMany(
    { phoneNumber, direction: 'incoming', isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json(messages);
});
