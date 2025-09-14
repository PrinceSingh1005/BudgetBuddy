const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const ImportJob = require('../models/ImportJob');
const Transaction = require('../models/Transaction');
const ReceiptFile = require('../models/ReceiptFile');
const { extractTextFromPDF, parseTableFromPDF } = require('../services/pdfService');
const { clearAnalyticsCache } = require('../services/cacheService');
const logger = require('../utils/logger') || console;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'imports');

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

async function savePdfToLocal(buffer, userId, originalName) {
  await ensureUploadDir();
  const safeName = originalName ? originalName.replace(/\s+/g, '_') : 'import.pdf';
  // create somewhat-unique filename
  const filename = `${userId || 'anon'}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;
  const localPath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(localPath, buffer);
  return { localPath, filename };
}

async function processImport(jobData = {}) {
  const { jobId, userId, fileBuffer, originalName } = jobData;

  if (!jobId) {
    throw new Error('processImport: jobId is required');
  }

  try {
    logger.info(`processImport starting for job ${jobId}`);

    // Mark job running
    await ImportJob.findByIdAndUpdate(jobId, { status: 'running', startedAt: new Date() });

    // Save PDF locally
    let localPath;
    try {
      const saved = await savePdfToLocal(fileBuffer, userId, originalName || 'import.pdf');
      localPath = saved.localPath;
    } catch (err) {
      logger.error('Failed saving import PDF locally:', err);
      throw err;
    }

    // Create a ReceiptFile document to keep a record of the uploaded PDF
    const receiptFile = new ReceiptFile({
      userId,
      filePath: localPath, 
      originalName: originalName || 'import.pdf',
      mimeType: 'application/pdf',
      size: Buffer.isBuffer(fileBuffer) ? fileBuffer.length : undefined,
      status: 'done', 
      uploadedAt: new Date()
    });
    await receiptFile.save();

    await ImportJob.findByIdAndUpdate(jobId, { fileId: receiptFile._id });

    const pdfData = await extractTextFromPDF(fileBuffer || (await fs.readFile(localPath)));

    const parsedTransactions = parseTableFromPDF(pdfData.text || '');

    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const transactionData of parsedTransactions || []) {
      try {
        const tx = new Transaction({
          userId,
          ...transactionData,
          receiptId: receiptFile._id,
          meta: {
            source: 'import',
            parsedFrom: 'pdf'
          }
        });
        await tx.save();
        imported++;
      } catch (err) {
        failed++;
        const msg = err && err.message ? err.message : String(err);
        errors.push(msg);
        logger.error('Transaction import error:', err);
      }
    }

    // Update job with results
    await ImportJob.findByIdAndUpdate(jobId, {
      status: 'finished',
      summary: { imported, failed, errors: errors.slice(0, 50) },
      finishedAt: new Date()
    });

    // Clear analytics cache for user so analytics pick up imported transactions
    try {
      await clearAnalyticsCache(userId);
      logger.info(`Analytics cache cleared for user ${userId} after import`);
    } catch (e) {
      logger.warn('clearAnalyticsCache failed:', e);
    }

    logger.info(`processImport completed for job ${jobId}: imported=${imported} failed=${failed}`);
    return { success: true, imported, failed, errors };

  } catch (err) {
    logger.error(`processImport failed for job ${jobId}:`, err);

    // persist failure to ImportJob
    try {
      await ImportJob.findByIdAndUpdate(jobId, {
        status: 'failed',
        summary: { imported: 0, failed: 0, errors: [err.message || String(err)] },
        finishedAt: new Date()
      });
    } catch (innerErr) {
      logger.error('Failed to mark ImportJob as failed:', innerErr);
    }
    throw err;
  }
}

module.exports = {
  processImport,
  savePdfToLocal, 
};