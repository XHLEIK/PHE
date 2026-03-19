import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IConsumerPendingBill extends Document {
  consumerId: string;
  pendingAmount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConsumerPendingBillSchema = new Schema<IConsumerPendingBill>(
  {
    consumerId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    pendingAmount: {
      type: Number,
      required: true,
      min: 0,
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

if (mongoose.models.ConsumerPendingBill) {
  mongoose.deleteModel('ConsumerPendingBill');
}

const ConsumerPendingBill: Model<IConsumerPendingBill> = mongoose.model<IConsumerPendingBill>(
  'ConsumerPendingBill',
  ConsumerPendingBillSchema
);

export default ConsumerPendingBill;
