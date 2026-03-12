import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

/**
 * Append-only audit log with integrity hash chain.
 * Each entry's `integrityHash` is computed from its content + the previous entry's hash,
 * making the chain tamper-evident.
 */
export interface IAuditLog extends Document {
  action: string; // e.g. "complaint.created", "admin.login", "admin.created", "complaint.status_changed"
  actor: string; // email of user who performed the action
  targetType: 'complaint' | 'user' | 'system' | 'department';
  targetId: string; // e.g. complaint _id or user _id
  changes: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
  correlationId: string; // for tracing across requests
  ipAddress: string;
  integrityHash: string; // SHA-256 chain hash
  previousHash: string; // hash of the previous audit entry
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['complaint', 'user', 'system', 'department'],
      required: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    correlationId: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      default: 'unknown',
    },
    integrityHash: {
      type: String,
      required: true,
    },
    previousHash: {
      type: String,
      default: 'GENESIS',
    },
  },
  {
    timestamps: true,
    // Make collection append-only: no updates or deletes allowed via Mongoose
    strict: true,
  }
);

// Performance indexes
AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 }); // timeline queries
AuditLogSchema.index({ actor: 1, createdAt: -1 }); // actor history
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2-year TTL

// Disallow update/delete operations at the schema level
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are append-only and cannot be updated');
});
AuditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('Audit logs are append-only and cannot be deleted');
});

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;

// ---------------------------------------------------------------------------
// Helper: create an audit entry with hash chain integrity
// ---------------------------------------------------------------------------
export async function createAuditEntry(params: {
  action: string;
  actor: string;
  targetType: 'complaint' | 'user' | 'system' | 'department';
  targetId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
}): Promise<IAuditLog> {
  // Get the last audit entry's hash to chain
  const lastEntry = await AuditLog.findOne().sort({ createdAt: -1 }).select('integrityHash').lean();
  const previousHash = lastEntry?.integrityHash ?? 'GENESIS';

  // Compute integrity hash: SHA-256(action + actor + targetId + changes_json + previousHash + timestamp)
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    action: params.action,
    actor: params.actor,
    targetId: params.targetId,
    changes: params.changes ?? {},
    previousHash,
    timestamp,
  });
  const integrityHash = crypto.createHash('sha256').update(payload).digest('hex');

  const entry = await AuditLog.create({
    action: params.action,
    actor: params.actor,
    targetType: params.targetType,
    targetId: params.targetId,
    changes: params.changes ?? {},
    metadata: params.metadata ?? {},
    correlationId: params.correlationId || crypto.randomUUID(),
    ipAddress: params.ipAddress ?? 'unknown',
    integrityHash,
    previousHash,
  });

  return entry;
}
