const tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');

async function extractTextFromImage(buffer) {
  try {
    const { data } = await tesseract.recognize(buffer, 'eng');
    return { text: data.text, confidence: data.confidence || 0.85 };
  } catch (err) {
    console.error('extractTextFromImage error:', err);
    throw new Error('Failed to extract text from image');
  }
}

async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return { text: data.text, confidence: 0.75 }; 
  } catch (err) {
    console.error('extractTextFromPDF error:', err);
    throw new Error('Failed to extract text from PDF');
  }
}

function parseReceiptText(text) {
  if (!text) return {};

  const result = {};

  const amountPatterns = [
    /total\s*[:$]?\s*(\d+\.\d{2})/i,
    /amount\s*[:$]?\s*(\d+\.\d{2})/i,
    /\$\s*(\d+\.\d{2})\s*$/m,
    /(\d+\.\d{2})\s*$(?!.*\d+\.\d{2})/m, 
    /(\d+\.\d{2})/g 
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0) {
        result.amount = amount;
        break;
      }
    }
  }

  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,         
    /(\d{2}\/\d{2}\/\d{4})/,       
    /(\d{2}-\d{2}-\d{4})/,         
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/, 
    /(\d{1,2}-\d{1,2}-\d{2,4})/    
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        let dateStr = match[1];
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts[2].length === 2) {
            parts[2] = '20' + parts[2]; 
          }
          dateStr = parts.join('/');
        }
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          result.date = date;
          result.dateString = dateStr;
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  const lines = text.split('\n').filter(line => line.trim());
  
  const merchantPatterns = [
    /^[A-Z][A-Za-z\s&',.-]{3,50}$/,  
    /^[A-Z\s&',.]{4,50}$/,          
  ];

  for (let i = 0; i < Math.min(5, lines.length); i++) { 
    const line = lines[i].trim();
    if (line.length < 3 || line.length > 50) continue;
    
    for (const pattern of merchantPatterns) {
      if (pattern.test(line) && !line.match(/\d{2}\/\d{2}\/\d{4}/) && !line.includes('$')) {
        result.merchant = line;
        break;
      }
    }
    if (result.merchant) break;
  }

  // Category detection based on merchant name or text content
  const textLower = text.toLowerCase();
  
  if (textLower.includes('grocery') || textLower.includes('supermarket') || 
      textLower.includes('walmart') || textLower.includes('target') ||
      textLower.includes('kroger') || textLower.includes('safeway')) {
    result.category = 'groceries';
  } else if (textLower.includes('restaurant') || textLower.includes('cafe') || 
             textLower.includes('coffee') || textLower.includes('pizza') ||
             textLower.includes('burger') || textLower.includes('dining')) {
    result.category = 'food';
  } else if (textLower.includes('gas') || textLower.includes('fuel') || 
             textLower.includes('shell') || textLower.includes('exxon') ||
             textLower.includes('chevron') || textLower.includes('bp')) {
    result.category = 'transportation';
  } else if (textLower.includes('pharmacy') || textLower.includes('cvs') || 
             textLower.includes('walgreens') || textLower.includes('medical')) {
    result.category = 'healthcare';
  } else if (textLower.includes('hotel') || textLower.includes('motel') ||
             textLower.includes('inn') || textLower.includes('resort')) {
    result.category = 'travel';
  } else if (textLower.includes('amazon') || textLower.includes('ebay') ||
             textLower.includes('shop') || textLower.includes('store')) {
    result.category = 'shopping';
  } else {
    result.category = 'other';
  }

  result.type = 'expense';

  if (result.amount) {
    result.total = result.amount;
    result.totalAmount = result.amount;
  }

  return result;
}

module.exports = {
  extractTextFromImage,
  extractTextFromPDF,
  parseReceiptText,
};