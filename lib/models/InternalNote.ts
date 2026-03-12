import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// InternalNote Model
// Admin-only notes on complaints — not visible to citizens.
// Supports both manual notes and system-generated notes (assignments, escalations).
// ---------------------------------------------------------------------------

export interface IInternalNote extends Document {
  complaintId: mongoose.Types.ObjectId; // Complaint._id
  authorId: mongoose.Types.ObjectId | null; // User._id (null for system)
  authorEmail: string; // denormalized
  authorName: string; // denormalized
  content: string;
  type: 'manual' | 'system'; // manual = admin wrote it, system = auto-generated
  createdAt: Date;
  updatedAt: Date;
}

const InternalNoteSchema = new Schema<IInternalNote>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['manual', 'system'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for listing notes per complaint, newest first
InternalNoteSchema.index({ complaintId: 1, createdAt: -1 });

const InternalNote: Model<IInternalNote> =
  mongoose.models.InternalNote || mongoose.model<IInternalNote>('InternalNote', InternalNoteSchema);

export default InternalNote;
