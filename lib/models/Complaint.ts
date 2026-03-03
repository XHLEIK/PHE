import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplaint extends Document {
  complaintId: string; // Human-readable ID e.g. "GRV-20260228-0001"
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'triage' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  location: string;
  department: string;
  assignedTo: string | null; // admin email
  // Submitter contact info (always stored, masked in API responses)
  submitterName: string | null;
  submitterPhone: string | null;
  submitterEmail: string | null;
  // Geographic coordinates from browser geolocation
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
  // Legacy fields kept for backward compatibility
  aiAnalyzed: boolean;
  aiAnalysisResult: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachmentMeta {
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string; // key in object storage
  uploadedAt: Date;
}

const AttachmentMetaSchema = new Schema<IAttachmentMeta>(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
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

const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);

export default Complaint;
