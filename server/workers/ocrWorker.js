
const fs = require('fs/promises');
const path = require('path');

const ReceiptFile = require('../models/ReceiptFile'); 
const Transaction = require('../models/Transaction'); 
const { clearAnalyticsCache } = require('../services/cacheService');
const {
  extractTextFromImage,
  extractTextFromPDF,
  parseReceiptText
} = require('../services/ocrService');

const logger = console; 

async function processReceipt(opts = {}) {
  const { fileId, userId, localPath: providedLocalPath } = opts;
  if (!fileId) throw new Error('fileId is required to process receipt');

  try {
    const receipt = await ReceiptFile.findById(fileId).exec();
    if (!receipt) {
      throw new Error(`ReceiptFile ${fileId} not found`);
    }

    // Use provided localPath or fallback to receipt.filePath (not s3Key)
    const localPath = providedLocalPath || receipt.filePath;
    if (!localPath) throw new Error('Local file path not available for receipt');

    await ReceiptFile.findByIdAndUpdate(fileId, { 
      status: 'processing', 
      processingStartedAt: new Date() 
    }).exec();

    const buffer = await fs.readFile(localPath);

    let ocrResult = { text: '', confidence: 0 };
    const mime = receipt.mimeType || path.extname(localPath).toLowerCase();

    if (mime === 'application/pdf' || /\.pdf$/i.test(localPath)) {
      const pdfOut = await extractTextFromPDF(buffer);
      ocrResult.text = pdfOut.text || '';
      ocrResult.confidence = pdfOut.confidence || 0.75;
    } else {
      const imgOut = await extractTextFromImage(buffer);
      ocrResult.text = imgOut.text || '';
      ocrResult.confidence = imgOut.confidence || 0.85;
    }

    const parsed = parseReceiptText(ocrResult.text || '');

    // Update receipt with OCR results - use both 'parsed' and 'extractedData' for compatibility
    receipt.ocrResult = {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      parsed: parsed,
      extractedData: parsed 
    };
    receipt.status = 'done';
    receipt.processedAt = new Date();
    await receipt.save();

    logger.info(`OCR done for receipt ${fileId} (user ${userId}). Parsed: ${JSON.stringify(parsed)}`);

    // Create transaction if we have valid amount
    const amt = parsed && (parsed.amount || parsed.total || parsed.totalAmount);
    const normalizedAmount = (typeof amt === 'string') ? parseFloat(amt.replace(/[^0-9.-]+/g, '')) : amt;

    if (!Number.isNaN(normalizedAmount) && normalizedAmount > 0) {
      const transaction = new Transaction({
        userId,
        type: parsed.type || 'expense',
        amount: normalizedAmount,
        date: parsed.date ? new Date(parsed.date) : (parsed.dateString ? new Date(parsed.dateString) : new Date()),
        category: parsed.category || 'other',
        merchant: parsed.merchant || parsed.store || null,
        receiptId: receipt._id,
        meta: { 
          parsed, 
          rawOCRTextLength: (ocrResult.text || '').length,
          source: 'ocr'
        }
      });
      await transaction.save();
      logger.info(`Transaction ${transaction._id} created from receipt ${fileId}`);

      // Clear analytics cache for the user so new transaction appears in analytics
      try {
        await clearAnalyticsCache(userId);
        logger.info(`Analytics cache cleared for user ${userId}`);
      } catch (cacheError) {
        logger.warn('Failed to clear analytics cache:', cacheError);
      }
    } else {
      logger.info(`No valid amount extracted for receipt ${fileId}; skipping transaction creation.`);
    }

    return { success: true, receiptId: receipt._id };
  } catch (err) {
    logger.error('processReceipt error:', err);
    try {
      // try to persist error state to the receipt doc
      await ReceiptFile.findByIdAndUpdate(
        fileId,
        { status: 'error', errorMessage: String(err), processedAt: new Date() },
        { new: true }
      ).exec();
    } catch (innerErr) {
      logger.error('Failed to write error status to ReceiptFile:', innerErr);
    }
    return { success: false, error: String(err) };
  }
}

module.exports = { processReceipt };