const mongoose = require('mongoose');

const importJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReceiptFile',
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'finished', 'failed'],
    default: 'queued'
  },
  summary: {
    imported: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    errors: [String]
  },
  startedAt: Date,
  finishedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('ImportJob', importJobSchema);
