const express = require('express');
const multer = require('multer');
const ImportJob = require('../models/ImportJob');
const { auth } = require('../middleware/auth');
const { queueImportJob } = require('../services/queueService');
const logger = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for large PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  }
});

// Upload PDF for import
router.post('/upload', auth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Create import job
    const importJob = new ImportJob({
      userId: req.user._id,
      fileId: null 
    });

    await importJob.save();

    // Queue import processing
    await queueImportJob({
      jobId: importJob._id,
      userId: req.user._id,
      fileBuffer: req.file.buffer,
      originalName: req.file.originalname
    });

    logger.info(`Import job created: ${importJob._id} for user: ${req.user._id}`);

    res.status(201).json({
      jobId: importJob._id,
      status: importJob.status
    });
  } catch (error) {
    logger.error('Import upload error:', error);
    res.status(500).json({ error: 'Failed to upload import file' });
  }
});

// Get import job status
router.get('/:jobId/status', auth, async (req, res) => {
  try {
    const importJob = await ImportJob.findOne({
      _id: req.params.jobId,
      userId: req.user._id
    });

    if (!importJob) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json({
      jobId: importJob._id,
      status: importJob.status,
      summary: importJob.summary,
      startedAt: importJob.startedAt,
      finishedAt: importJob.finishedAt
    });
  } catch (error) {
    logger.error('Get import status error:', error);
    res.status(500).json({ error: 'Failed to fetch import status' });
  }
});

module.exports = router;