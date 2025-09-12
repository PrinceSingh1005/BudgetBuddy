const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  date: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  merchant: String,
  notes: String,
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceiptFile'
  },
  meta: {
    rawOCRText: String,
    source: {
      type: String,
      enum: ['manual', 'ocr', 'import'],
      default: 'manual'
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);