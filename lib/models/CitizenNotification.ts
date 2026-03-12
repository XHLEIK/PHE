import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Citizen Notification Model
// In-app notifications for citizen users (status changes, SLA updates, etc.)
// ---------------------------------------------------------------------------

export type CitizenNotificationType =
  | 'status_change'
  | 'department_assigned'
  | 'priority_change'
  | 'sla_warning'
  | 'sla_breach'
  | 'comment_added'
  | 'resolved'
  | 'system';

export interface ICitizenNotification extends Document {
  citizenId: mongoose.Types.ObjectId; // Citizen._id
  citizenEmail: string; // denormalized for quick lookups
  type: CitizenNotificationType;
  title: string;
  message: string;
  relatedComplaintId: string | null; // Complaint._id
  relatedComplaintTrackingId: string | null; // Human-readable GRV-* ID
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CitizenNotificationSchema = new Schema<ICitizenNotification>(
  {
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'Citizen',
      required: true,
      index: true,
    },
    citizenEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'status_change',
        'department_assigned',
        'priority_change',
        'sla_warning',
        'sla_breach',
        'comment_added',
        'resolved',
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

// Compound index for common query: unread notifications for a citizen, newest first
CitizenNotificationSchema.index({ citizenId: 1, isRead: 1, createdAt: -1 });

// TTL index: auto-delete notifications older than 90 days
CitizenNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const CitizenNotification: Model<ICitizenNotification> =
  mongoose.models.CitizenNotification ||
  mongoose.model<ICitizenNotification>('CitizenNotification', CitizenNotificationSchema);

export default CitizenNotification;
