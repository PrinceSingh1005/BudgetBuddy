const express = require('express');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { transactionValidation, queryValidation } = require('../middleware/validation');
const logger = require('../utils/logger');
const { startOfDay, endOfDay, parseISO } = require('date-fns');
const { clearAnalyticsCache } = require('../services/cacheService');

const router = express.Router();

// Get transactions with filtering and pagination
router.get('/', auth, queryValidation, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      from,
      to,
      type,
      category,
      sort = 'date_desc'
    } = req.query;

    // Build filter
    const filter = { userId: req.user._id };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = startOfDay(parseISO(from));
      if (to) filter.date.$lte = endOfDay(parseISO(to));
    }
    
    if (type) filter.type = type;
    if (category) filter.category = category;

    // Build sort
    const sortField = sort.split('_')[0];
    const sortOrder = sort.split('_')[1] === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('receiptId', 'originalName status'),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('receiptId');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', auth, transactionValidation, async (req, res) => {
  try {
    const transaction = new Transaction({
      ...req.body,
      userId: req.user._id
    });

    await transaction.save();
    await clearAnalyticsCache(req.user._id);
    logger.info(`Transaction created: ${transaction._id} for user: ${req.user._id}`);
    
    res.status(201).json(transaction);
  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
router.put('/:id', auth, transactionValidation, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await clearAnalyticsCache(req.user._id);
    logger.info(`Transaction updated: ${transaction._id}`);
    
    res.json(transaction);
  } catch (error) {
    logger.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await clearAnalyticsCache(req.user._id);
    logger.info(`Transaction deleted: ${req.params.id}`);
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    logger.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;