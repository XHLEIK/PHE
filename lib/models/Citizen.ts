/**
 * lib/models/Citizen.ts
 * Citizen user model — separate from admin User model.
 *
 * Citizens register via email + OTP verification, then can:
 * - Submit complaints linked to their account
 * - Track complaint status in their dashboard
 * - Receive email notifications on status changes
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICitizen extends Document {
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  state: string;
  district: string;
  // Verification
  isVerified: boolean;
  // Account security
  isLocked: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CitizenSchema = new Schema<ICitizen>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
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
      select: false, // Excluded from queries by default
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },
    isVerified: {
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
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Performance indexes
CitizenSchema.index({ isVerified: 1, createdAt: -1 }); // admin citizen list queries
CitizenSchema.index({ state: 1, district: 1 }); // geographic lookups

// Force re-registration so schema changes are picked up after hot-reload
if (mongoose.models.Citizen) {
  mongoose.deleteModel('Citizen');
}
const Citizen: Model<ICitizen> = mongoose.model<ICitizen>('Citizen', CitizenSchema);

export default Citizen;
