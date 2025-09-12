const mongoose = require('mongoose');

const receiptFileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  s3Key: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'done', 'error'],
    default: 'uploaded'
  },
  ocrResult: {
    text: String,
    confidence: Number,
    extractedData: {
      amount: Number,
      date: Date,
      merchant: String,
      category: String
    }
  },
  errorMessage: String,
  processedAt: Date
}, {
  timestamps: true
});

receiptFileSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('ReceiptFile', receiptFileSchema);
