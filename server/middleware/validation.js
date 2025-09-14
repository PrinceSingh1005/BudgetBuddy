const { body, query, param } = require('express-validator');
const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation Error', 
      details: errors.array() 
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

const transactionValidation = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive number'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('category').trim().isLength({ min: 1, max: 50 }).withMessage('Category required'),
  body('merchant').optional().trim().isLength({ max: 100 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  handleValidationErrors
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('from').optional().isISO8601().withMessage('From date must be valid ISO date'),
  query('to').optional().isISO8601().withMessage('To date must be valid ISO date'),
  query('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  transactionValidation,
  queryValidation,
  handleValidationErrors
};
