import mongoose from 'mongoose';

const whatsappContactSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: 'Unknown',
    },
    profilePic: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    tags: [String],
    notes: String,
  },
  {
    timestamps: true,
  }
);

const WhatsappContact = mongoose.model('WhatsappContact', whatsappContactSchema);

export default WhatsappContact;
