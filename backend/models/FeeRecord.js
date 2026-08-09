const mongoose = require('mongoose');

const FEE_STATUSES = ['full', 'half', 'missing', 'absent'];

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    month: {
      // Format: "YYYY-MM" e.g. "2026-07"
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format'],
    },
    status: {
      type: String,
      enum: {
        values: FEE_STATUSES,
        message: 'Status must be one of: full, half, missing, absent',
      },
      default: 'missing',
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound unique index: one fee record per student per month
feeRecordSchema.index({ studentId: 1, month: 1 }, { unique: true });

// Virtual: whether this record has a pending amount
feeRecordSchema.virtual('isPending').get(function () {
  return this.status === 'missing' || this.status === 'half';
});

// Auto-set amountPaid and paidAt based on status
feeRecordSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'full') {
      this.amountPaid = this.amountDue;
      this.paidAt = this.paidAt || new Date();
    } else if (this.status === 'half') {
      this.amountPaid = Math.floor(this.amountDue / 2);
      this.paidAt = this.paidAt || new Date();
    } else if (this.status === 'missing' || this.status === 'absent') {
      this.amountPaid = 0;
      this.paidAt = null;
    }
  }
  next();
});

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
module.exports.FEE_STATUSES = FEE_STATUSES;
