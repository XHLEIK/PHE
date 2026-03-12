import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Notification Model
// In-app notifications for admin users.
// Supports: assignment, escalation, SLA breach, status change, system alerts.
// ---------------------------------------------------------------------------

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId; // User._id
  recipientEmail: string; // denormalized for quick lookups
  type:
    | 'assignment'
    | 'escalation'
    | 'sla_warning'
    | 'sla_breach'
    | 'status_change'
    | 'new_complaint'
    | 'note_added'
    | 'system';
  title: string;
  message: string;
  relatedComplaintId: string | null; // Complaint._id (string for flexibility)
  relatedComplaintTrackingId: string | null; // Human-readable GRV-* ID
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'assignment',
        'escalation',
        'sla_warning',
        'sla_breach',
        'status_change',
        'new_complaint',
        'note_added',
        'system',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedComplaintId: {
      type: String,
      default: null,
      index: true,
    },
    relatedComplaintTrackingId: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common query: unread notifications for a user, newest first
NotificationSchema.index({ recipientEmail: 1, isRead: 1, createdAt: -1 });

// TTL index: auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
