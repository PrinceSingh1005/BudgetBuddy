const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all users (admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find({})
        .select('-passwordHash')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments({})
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get system statistics
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const [userCount, transactionCount, totalVolume] = await Promise.all([
      User.countDocuments({}),
      Transaction.countDocuments({}),
      Transaction.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const recentTransactions = await Transaction.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      userCount,
      transactionCount,
      totalVolume: totalVolume[0]?.total || 0,
      recentTransactions
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
});

module.exports = router;
