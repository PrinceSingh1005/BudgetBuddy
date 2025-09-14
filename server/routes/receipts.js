// src/routes/receipts.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const ReceiptFile = require('../models/ReceiptFile');
const Transaction = require('../models/Transaction');
const { clearAnalyticsCache } = require('../services/cacheService');
const { auth } = require('../middleware/auth');
const { processReceipt } = require('../workers/ocrWorker');
const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'receipts');
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const ensureDir = async (dir) => {
  try { await fs.mkdir(dir, { recursive: true }); } catch (e) {}
};

// Get all receipts for user
router.get('/', auth, async (req, res) => {
  try {
    const receipts = await ReceiptFile.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Get receipt by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const receipt = await ReceiptFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// Delete receipt
router.delete('/:id', auth, async (req, res) => {
  try {
    const receipt = await ReceiptFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    
    // Delete file from local storage
    try {
      await fs.unlink(receipt.filePath);
    } catch (err) {
      console.warn('File deletion error (file may not exist):', err);
    }
    
    await ReceiptFile.findByIdAndDelete(req.params.id);
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// Upload receipt
router.post('/upload', auth, upload.single('receipt'), async (req, res) => {
  let localPath;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    await ensureDir(UPLOAD_DIR);

    const filename = `${req.user._id}-${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    localPath = path.join(UPLOAD_DIR, filename);
    await fs.writeFile(localPath, req.file.buffer);

    const receiptFile = new ReceiptFile({
      userId: req.user._id,
      filePath: localPath, 
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'uploaded'
    });
    await receiptFile.save();

    // Offload processing to background
    setImmediate(async () => {
      try {
        await processReceipt({ fileId: receiptFile._id, userId: req.user._id, localPath });
      } catch (err) {
        console.error('Background OCR failed for', receiptFile._id, err);
      }
    });

    res.status(201).json({
      fileId: receiptFile._id,
      status: receiptFile.status,
      originalName: receiptFile.originalName
    });
  } catch (error) {
    // Clean up file if database operation failed
    if (localPath) {
      try {
        await fs.unlink(localPath);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    console.error('Receipt upload error:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// Download receipt
router.get('/:id/download', auth, async (req, res) => {
  try {
    const receipt = await ReceiptFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    
    // Check if file exists
    try {
      await fs.access(receipt.filePath);
    } catch (err) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    res.download(receipt.filePath, receipt.originalName);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download receipt' });
  }
});

// Get receipt status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const receipt = await ReceiptFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ status: receipt.status });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Failed to get receipt status' });
  }
});

module.exports = router;