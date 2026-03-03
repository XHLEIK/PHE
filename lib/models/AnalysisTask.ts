import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Analysis task — enqueued when a complaint is created.
 * A background worker (future) will pick these up for AI classification.
 * For now this is a placeholder/queue entry to support the architecture.
 */
export interface IAnalysisTask extends Document {
  complaintId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  attempts: number;
  lastAttemptAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisTaskSchema = new Schema<IAnalysisTask>(
  {
    complaintId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    result: {
      type: Schema.Types.Mixed,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const AnalysisTask: Model<IAnalysisTask> =
  mongoose.models.AnalysisTask ||
  mongoose.model<IAnalysisTask>('AnalysisTask', AnalysisTaskSchema);

export default AnalysisTask;
