import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplaint extends Document {
  complaintId: string; // Human-readable ID e.g. "GRV-20260228-0001"
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'triage' | 'in_progress' | 'resolved' | 'closed';
  location: string;
  department: string;
  assignedTo: string | null; // admin email
  submitterName: string | null;
  submitterContact: string | null;
  attachments: IAttachmentMeta[];
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
      enum: ['pending', 'triage', 'in_progress', 'resolved', 'closed'],
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
    submitterContact: {
      type: String,
      trim: true,
      default: null,
    },
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
