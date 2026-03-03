import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatSession extends Document {
  complaintId: string;       // Human-readable GRV-XXXXXXXX-XXXX
  email: string;             // Submitter email — used to link all chats for a user
  title: string;             // Complaint title (for sidebar display)
  accessToken: string;       // Random token for secure access (no login required)
  isDeleted: boolean;        // Soft delete for user
  createdAt: Date;
  updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    accessToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching all sessions for an email
ChatSessionSchema.index({ email: 1, isDeleted: 1, createdAt: -1 });

if (mongoose.models.ChatSession) {
  mongoose.deleteModel('ChatSession');
}
const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);

export default ChatSession;
