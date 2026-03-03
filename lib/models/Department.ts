import mongoose, { Schema, Document, Model } from 'mongoose';
import { createAuditEntry } from './AuditLog';

export interface IDepartment extends Document {
  id: string; // canonical slug e.g. "pwd", "health"
  label: string;
  description: string;
  subcategories: string[];
  sla_days: number;
  escalation_level: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    subcategories: {
      type: [String],
      default: [],
    },
    sla_days: {
      type: Number,
      default: 21,
      min: 1,
      max: 365,
    },
    escalation_level: {
      type: Number,
      default: 1,
      min: 1,
      max: 4,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ----------------------------------------------------------------------------
// Guard: prevent hard deletion — use active=false (soft-delete) instead
// We track complaints by department id string, so hard deleting a department
// would orphan existing complaint records.
// ----------------------------------------------------------------------------
DepartmentSchema.pre('deleteOne', function () {
  throw new Error('Hard deletion of departments is not allowed. Set active=false instead.');
});

DepartmentSchema.pre('findOneAndDelete', function () {
  throw new Error('Hard deletion of departments is not allowed. Set active=false instead.');
});

DepartmentSchema.pre('deleteMany', function () {
  throw new Error('Hard deletion of departments is not allowed. Set active=false instead.');
});

// ----------------------------------------------------------------------------
// Audit helper for department changes — called from API routes
// ----------------------------------------------------------------------------
export async function auditDepartmentChange(
  departmentId: string,
  actor: string,
  changes: Record<string, { from: unknown; to: unknown }>,
  ip?: string
) {
  await createAuditEntry({
    action: 'department.updated',
    actor,
    targetType: 'system',
    targetId: departmentId,
    changes,
    metadata: { departmentId },
    ipAddress: ip,
  });
}

const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
