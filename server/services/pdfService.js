const pdf = require('pdf-parse');
const logger = require('../utils/logger');

// Extract text from PDF
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const data = await pdf(pdfBuffer);
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.metadata
    };
  } catch (error) {
    logger.error('PDF text extraction error:', error);
    throw error;
  }
};

// Parse tabular data from PDF text
const parseTableFromPDF = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  const transactions = [];
  
  const transactionRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.*?)\s+([\-\$]?\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/g;
  
  let match;
  while ((match = transactionRegex.exec(text)) !== null) {
    try {
      const [, dateStr, description, amountStr] = match;
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;
      
      const amount = Math.abs(parseFloat(amountStr.replace(/[\$,\-]/g, '')));
      if (amount <= 0) continue;
      
      const isDebit = amountStr.includes('-') || description.toLowerCase().includes('debit');
      
      transactions.push({
        date,
        description: description.trim(),
        amount,
        type: isDebit ? 'expense' : 'income',
        category: categorizeFromDescription(description)
      });
    } catch (error) {
      logger.warn('Transaction parsing error:', error);
    }
  }
  
  return transactions;
};

// Categorize transaction from description
const categorizeFromDescription = (description) => {
  const desc = description.toLowerCase();
  
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food mart')) {
    return 'groceries';
  }
  if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('dining')) {
    return 'food';
  }
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('gasoline')) {
    return 'transportation';
  }
  if (desc.includes('pharmacy') || desc.includes('medical') || desc.includes('hospital')) {
    return 'healthcare';
  }
  if (desc.includes('rent') || desc.includes('mortgage') || desc.includes('utilities')) {
    return 'housing';
  }
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('wages')) {
    return 'salary';
  }
  
  return 'other';
};

module.exports = {
  extractTextFromPDF,
  parseTableFromPDF,
  categorizeFromDescription
};