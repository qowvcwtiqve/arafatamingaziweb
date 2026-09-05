import asyncHandler from 'express-async-handler';
import axios from 'axios';
import WhatsappContact from '../models/WhatsappContact.js';
import WhatsappMessage from '../models/WhatsappMessage.js';

export const verifyWebhook = asyncHandler(async (req, res) => {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Bad Request');
  }
});

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

      try {
        
        const contact = await WhatsappContact.findOneAndUpdate(
          { phoneNumber: from },
          { 
            name: contactName,
            lastMessageAt: new Date()
          },
          { upsert: true, new: true }
        );

        const newMessage = await WhatsappMessage.create({
          messageId: messageId,
          phoneNumber: from,
          direction: 'incoming',
          type: messageObj.type || 'text',
          text: msgBody,
          status: 'received'
        });

      } catch (error) {
        console.error('Error saving WhatsApp message to DB:', error);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

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
      url: `https:
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

    await WhatsappMessage.create({
      messageId: messageId,
      phoneNumber: to,
      direction: 'outgoing',
      type: 'text',
      text: message,
      status: 'sent'
    });

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

export const getContacts = asyncHandler(async (req, res) => {
  const contacts = await WhatsappContact.find().sort({ lastMessageAt: -1 });
  res.status(200).json(contacts);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.params;
  const messages = await WhatsappMessage.find({ phoneNumber }).sort({ createdAt: 1 });

  await WhatsappMessage.updateMany(
    { phoneNumber, direction: 'incoming', isRead: false },
    { $set: { isRead: true } }
  );

  res.status(200).json(messages);
});
