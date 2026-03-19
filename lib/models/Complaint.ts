import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEscalationEntry {
  fromDepartment: string;
  toDepartment: string;
  reason: string;
  escalatedBy: string; // admin email
  escalatedAt: Date;
}

export interface IComplaint extends Document {
  complaintId: string; // Tracking ID e.g. "AP-PHE-2026-000001"
  legacyIds: string[]; // Previous tracking IDs preserved for traceability
  citizenId: mongoose.Types.ObjectId | null; // Linked citizen account (null for anonymous)
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'triage' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  location: string;
  department: string;
  assignedTo: string | null; // admin email
  assignedToName: string | null; // denormalized admin display name
  // SLA tracking
  slaDeadline: Date | null;
  slaBreached: boolean;
  // Escalation history
  escalationHistory: IEscalationEntry[];
  // Internal notes count (denormalized)
  internalNoteCount: number;
  // Submitter contact info (always stored, masked in API responses)
  submitterName: string | null;
  submitterPhone: string | null;
  submitterEmail: string | null;
  // Geographic data
  state: string;
  district: string;
  coordinates: { lat: number; lng: number } | null;
  // AI analysis pipeline fields
  analysisStatus: 'queued' | 'processing' | 'completed' | 'deferred';
  aiCategory: string | null;
  aiPriority: string | null;
  aiSummary: string | null;
  aiConfidence: number | null;
  modelVersion: string | null;
  promptHash: string | null;
  analyzedAt: Date | null;
  analysisAttempts: number;
  lastAnalysisError: string | null;
  lastAnalysisAt: Date | null;
  // Attachments — backend-ready, not exposed in API until storage configured
  attachments: IAttachmentMeta[];
  // AI Calling fields (denormalized from CallLog for quick filtering)
  callStatus: 'not_called' | 'scheduled' | 'in_progress' | 'completed' | 'failed';
  callAttempts: number;
  lastCallAt: Date | null;
  callScheduledAt: Date | null;
  callConsent: boolean;
  // Legacy fields kept for backward compatibility
  aiAnalyzed: boolean;
  aiAnalysisResult: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachmentMeta {
  fileName: string;
  fileType: string; // 'image' | 'video'
  fileSize: number;
  storageKey: string; // Cloudinary publicId
  url: string; // Cloudinary optimized delivery URL
  thumbnailUrl: string; // Cloudinary thumbnail / video poster
  streamingUrl: string; // Optimized video URL (empty for images)
  posterUrl: string; // Full-size video poster frame (empty for images)
  uploadedAt: Date;
}

const AttachmentMetaSchema = new Schema<IAttachmentMeta>(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    streamingUrl: { type: String, default: '' },
    posterUrl: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ComplaintSchema = new Schema<IComplaint>(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'Citizen',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated'],
      default: 'pending',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: 'Unassigned',
    },
    assignedTo: {
      type: String,
      default: null,
    },
    assignedToName: {
      type: String,
      trim: true,
      default: null,
    },
    // SLA tracking
    slaDeadline: {
      type: Date,
      default: null,
      index: true,
    },
    slaBreached: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Escalation history
    escalationHistory: {
      type: [
        new Schema(
          {
            fromDepartment: { type: String, required: true },
            toDepartment: { type: String, required: true },
            reason: { type: String, required: true, maxlength: 500 },
            escalatedBy: { type: String, required: true },
            escalatedAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // Internal notes count (denormalized for list views)
    internalNoteCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    submitterName: {
      type: String,
      trim: true,
      default: null,
    },
    submitterPhone: {
      type: String,
      trim: true,
      default: null,
    },
    submitterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    district: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    coordinates: {
      type: new Schema({ lat: Number, lng: Number }, { _id: false }),
      default: null,
    },
    // AI analysis pipeline
    analysisStatus: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'deferred'],
      default: 'queued',
      index: true,
    },
    aiCategory: { type: String, trim: true, default: null },
    aiPriority: { type: String, trim: true, default: null },
    aiSummary: { type: String, trim: true, maxlength: 1000, default: null },
    aiConfidence: { type: Number, min: 0, max: 1, default: null },
    modelVersion: { type: String, trim: true, default: null },
    promptHash: { type: String, trim: true, default: null },
    analyzedAt: { type: Date, default: null },
    analysisAttempts: { type: Number, default: 0, min: 0 },
    lastAnalysisError: { type: String, trim: true, default: null },
    lastAnalysisAt: { type: Date, default: null },
    attachments: {
      type: [AttachmentMetaSchema],
      default: [],
    },
    // AI Calling fields
    callStatus: {
      type: String,
      enum: ['not_called', 'scheduled', 'in_progress', 'completed', 'failed'],
      default: 'not_called',
      index: true,
    },
    callAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCallAt: {
      type: Date,
      default: null,
    },
    callScheduledAt: {
      type: Date,
      default: null,
    },
    callConsent: {
      type: Boolean,
      default: false,
    },
    // Legacy tracking IDs (preserved during migration)
    legacyIds: {
      type: [String],
      default: [],
    },
    // Legacy fields
    aiAnalyzed: {
      type: Boolean,
      default: false,
    },
    aiAnalysisResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search on title and description
ComplaintSchema.index({ title: 'text', description: 'text' });
// SLA: overdue complaints query
ComplaintSchema.index({ slaBreached: 1, slaDeadline: 1, status: 1 });
// Assignment queries
ComplaintSchema.index({ assignedTo: 1, status: 1 });
// Department + status for filtered listing
ComplaintSchema.index({ department: 1, status: 1, createdAt: -1 });
// Citizen dashboard: complaints by citizenId
ComplaintSchema.index({ citizenId: 1, createdAt: -1 });
// Citizen dashboard: complaints by submitter email (for pre-registration complaints)
ComplaintSchema.index({ submitterEmail: 1, createdAt: -1 });
// Priority + status for admin dashboard
ComplaintSchema.index({ priority: 1, status: 1 });
// PHE: compound index for department-scoped tracking ID lookups
ComplaintSchema.index({ department: 1, complaintId: 1 }, { unique: true });
// Legacy ID lookup for backward compatibility
ComplaintSchema.index({ legacyIds: 1 }, { sparse: true });

const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);

export default Complaint;
