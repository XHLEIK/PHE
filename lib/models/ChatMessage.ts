import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  complaintId: string;       // Human-readable GRV-XXXXXXXX-XXXX
  senderType: 'user' | 'ai';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    complaintId: {
      type: String,
      required: true,
      index: true,
    },
    senderType: {
      type: String,
      enum: ['user', 'ai'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient chat retrieval per complaint
ChatMessageSchema.index({ complaintId: 1, createdAt: 1 });

if (mongoose.models.ChatMessage) {
  mongoose.deleteModel('ChatMessage');
}
const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
