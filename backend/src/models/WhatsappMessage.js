import mongoose from 'mongoose';

const whatsappMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      unique: true,
      sparse: true, // Sparse because outgoing messages might not have Meta ID initially
    },
    phoneNumber: {
      type: String,
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'document', 'audio', 'template', 'unsupported'],
      default: 'text',
    },
    text: {
      type: String,
    },
    mediaUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed', 'received'],
      default: 'received',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const WhatsappMessage = mongoose.model('WhatsappMessage', whatsappMessageSchema);

export default WhatsappMessage;
