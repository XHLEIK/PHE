import mongoose, { Schema, Document, Model } from 'mongoose';
import { ADMIN_ROLES, type AdminRole, type LocationScope } from '@/lib/rbac';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  departments: string[]; // department IDs — required for department-scoped roles
  locationScope: LocationScope;
  effectivePermissions: string[];
  mustRotatePassword: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  lastLoginIP: string;
  isActive: boolean; // soft-deactivate (replaces hard delete)
  phone: string;
  avatar: string; // URL or initials placeholder
  deactivatedAt: Date | null;
  deactivatedBy: string | null; // email of admin who deactivated
  createdBy: string | null; // email of the admin who created this user
  isSeeded: boolean; // true if created by seed script
  createdAt: Date;
  updatedAt: Date;
}

const LocationScopeSchema = new Schema(
  {
    country: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    block: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ADMIN_ROLES as unknown as string[],
      default: 'support_staff',
    },
    departments: {
      type: [String],
      default: [],
    },
    locationScope: {
      type: LocationScopeSchema,
      default: () => ({}),
    },
    effectivePermissions: {
      type: [String],
      default: [],
    },
    mustRotatePassword: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIP: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deactivatedBy: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      default: null,
    },
    isSeeded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transform(_doc: any, ret: any) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance indexes
UserSchema.index({ role: 1, isActive: 1 }); // role-based queries
UserSchema.index({ departments: 1, isActive: 1 }); // department admin lookups
UserSchema.index({ 'locationScope.state': 1, 'locationScope.district': 1, role: 1 }); // scope queries
UserSchema.index({ role: 1, 'locationScope.state': 1, 'locationScope.district': 1, departments: 1 }); // RBAC compound

// Force re-registration so schema enum changes are picked up after hot-reload
if (mongoose.models.User) {
  mongoose.deleteModel('User');
}
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
