import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'head_admin' | 'department_admin' | 'staff';
  departments: string[]; // department IDs — required for department_admin and staff roles
  mustRotatePassword: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  createdBy: string | null; // email of the admin who created this user
  isSeeded: boolean; // true if created by seed script
  createdAt: Date;
  updatedAt: Date;
}

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
      enum: ['head_admin', 'department_admin', 'staff'],
      default: 'staff',
    },
    departments: {
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

// Force re-registration so schema enum changes are picked up after hot-reload
if (mongoose.models.User) {
  mongoose.deleteModel('User');
}
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
