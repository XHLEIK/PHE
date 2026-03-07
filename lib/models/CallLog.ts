import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// CallLog — Tracks every AI/human call attempt per complaint
// ---------------------------------------------------------------------------

export type CallStatus = 'scheduled' | 'ringing' | 'active' | 'completed' | 'failed' | 'no_answer';
export type CallOutcome =
  | 'resolved'
  | 'escalated'
  | 'no_answer'
  | 'user_declined'
  | 'ai_failed'
  | 'technical_failure'
  | null;
export type CallerType = 'ai_agent' | 'human_agent';
export type FailureReason =
  | 'network_error'
  | 'user_busy'
  | 'invalid_number'
  | 'timeout'
  | 'agent_down'
  | null;

export interface ICallLog extends Document {
  complaintId: string;           // References Complaint.complaintId
  roomName: string;              // LiveKit room name e.g. "call-GRV-20260308-0001-1"
  attemptNumber: number;         // Which attempt this log represents (1, 2, 3…)
  retryCount: number;            // Cumulative retries so far
  callStatus: CallStatus;
  callOutcome: CallOutcome;
  callerType: CallerType;
  failureReason: FailureReason;
  duration: number | null;       // Call duration in seconds
  transcriptSummary: string | null;  // Short summary, max 500 chars
  transcriptRaw: string | null;      // Full transcript, max 10,000 chars
  aiResolution: string | null;       // AI-generated resolution summary
  startedAt: Date | null;
  endedAt: Date | null;
  recordingUrl: string | null;   // Reserved for v2 — not used in v1
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    complaintId: {
      type: String,
      required: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    callStatus: {
      type: String,
      enum: ['scheduled', 'ringing', 'active', 'completed', 'failed', 'no_answer'],
      default: 'scheduled',
      index: true,
    },
    callOutcome: {
      type: String,
      enum: ['resolved', 'escalated', 'no_answer', 'user_declined', 'ai_failed', 'technical_failure', null],
      default: null,
    },
    callerType: {
      type: String,
      enum: ['ai_agent', 'human_agent'],
      default: 'ai_agent',
    },
    failureReason: {
      type: String,
      enum: ['network_error', 'user_busy', 'invalid_number', 'timeout', 'agent_down', null],
      default: null,
    },
    duration: {
      type: Number,
      default: null,
      min: 0,
    },
    transcriptSummary: {
      type: String,
      default: null,
      maxlength: 500,
    },
    transcriptRaw: {
      type: String,
      default: null,
      maxlength: 10_000,
    },
    aiResolution: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    recordingUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient per-complaint queries ordered by time
CallLogSchema.index({ complaintId: 1, createdAt: -1 });

const CallLog: Model<ICallLog> =
  mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema);

export default CallLog;
