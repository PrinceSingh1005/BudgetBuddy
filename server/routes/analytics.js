const express = require('express');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { queryValidation } = require('../middleware/validation');
const logger = require('../utils/logger');
const { startOfDay, endOfDay, parseISO, format } = require('date-fns');
const { getCachedAnalytics, setCachedAnalytics } = require('../services/cacheService');

const router = express.Router();

// Get request for expenses by category
router.get('/expenses-by-category', auth, queryValidation, async (req, res) => {
  try {
    const { from, to } = req.query;
    const cacheKey = `expenses-by-category:${req.user._id}:${from}:${to}`;
    
    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const matchQuery = {
      userId: req.user._id,
      type: 'expense'
    };

    if (from || to) {
      matchQuery.date = {};
      if (from) matchQuery.date.$gte = startOfDay(parseISO(from));
      if (to) matchQuery.date.$lte = endOfDay(parseISO(to));
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          count: 1,
          _id: 0
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Cache result
    await setCachedAnalytics(cacheKey, result, 300); // 5 minutes

    res.json(result);
  } catch (error) {
    logger.error('Expenses by category error:', error);
    res.status(500).json({ error: 'Failed to fetch category analytics' });
  }
});

// Get expenses by date
router.get('/expenses-by-date', auth, queryValidation, async (req, res) => {
  try {
    const { interval = 'day', from, to } = req.query;
    const cacheKey = `expenses-by-date:${req.user._id}:${interval}:${from}:${to}`;
    
    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const matchQuery = {
      userId: req.user._id,
      type: 'expense'
    };

    if (from || to) {
      matchQuery.date = {};
      if (from) matchQuery.date.$gte = startOfDay(parseISO(from));
      if (to) matchQuery.date.$lte = endOfDay(parseISO(to));
    }

    let dateFormat;
    switch (interval) {
      case 'week':
        dateFormat = '%Y-W%U';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          total: 1,
          count: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    await setCachedAnalytics(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Expenses by date error:', error);
    res.status(500).json({ error: 'Failed to fetch date analytics' });
  }
});

router.get('/income-daily-flow', auth, queryValidation, async (req, res) => {
  try {
    const { from, to } = req.query;
    const cacheKey = `income-daily-flow:${req.user._id}:${from}:${to}`;

    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const start = startOfDay(parseISO(from));
    const end = endOfDay(parseISO(to));

    // Get all income transactions sorted by date
    const incomes = await Transaction.find({
      userId: req.user._id,
      type: 'income',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });


    const dailyFlow = [];
    let currentIncome = 0;
    let incomeIndex = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);

      // Add any income that occurred on this day
      while (
        incomeIndex < incomes.length &&
        startOfDay(incomes[incomeIndex].date).getTime() === startOfDay(day).getTime()
      ) {
        currentIncome += incomes[incomeIndex].amount;
        incomeIndex++;
      }

      dailyFlow.push({
        date: format(day, 'yyyy-MM-dd'),
        income: currentIncome
      });
    }

    await setCachedAnalytics(cacheKey, dailyFlow, 300);
    res.json(dailyFlow);
  } catch (error) {
    logger.error('Income daily flow error:', error);
    res.status(500).json({ error: 'Failed to fetch income flow' });
  }
});

// income vs expenses summary
router.get('/summary', auth, queryValidation, async (req, res) => {
  try {
    const { from, to } = req.query;
    const cacheKey = `summary:${req.user._id}:${from}:${to}`;
    
    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const matchQuery = { userId: req.user._id };

    if (from || to) {
      matchQuery.date = {};
      if (from) matchQuery.date.$gte = startOfDay(parseISO(from));
      if (to) matchQuery.date.$lte = endOfDay(parseISO(to));
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      income: { total: 0, count: 0 },
      expenses: { total: 0, count: 0 },
      balance: 0
    };

    result.forEach(item => {
      if (item._id === 'income') {
        summary.income = { total: item.total, count: item.count };
      } else if (item._id === 'expense') {
        summary.expenses = { total: item.total, count: item.count };
      }
    });

    summary.balance = summary.income.total - summary.expenses.total;

    await setCachedAnalytics(cacheKey, summary, 300);

    res.json(summary);
  } catch (error) {
    logger.error('Summary analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch summary analytics' });
  }
});

// Get top merchants
router.get('/top-merchants', auth, queryValidation, async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const cacheKey = `top-merchants:${req.user._id}:${from}:${to}:${limit}`;
    
    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const matchQuery = {
      userId: req.user._id,
      merchant: { $exists: true, $ne: null, $ne: '' }
    };

    if (from || to) {
      matchQuery.date = {};
      if (from) matchQuery.date.$gte = startOfDay(parseISO(from));
      if (to) matchQuery.date.$lte = endOfDay(parseISO(to));
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$merchant',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          merchant: '$_id',
          total: 1,
          count: 1,
          _id: 0
        }
      },
      { $sort: { total: -1 } },
      { $limit: parseInt(limit) }
    ]);

    await setCachedAnalytics(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    logger.error('Top merchants error:', error);
    res.status(500).json({ error: 'Failed to fetch merchant analytics' });
  }
});

router.get('/daily-financial-summary', auth, queryValidation, async (req, res) => {
  try {
    const { from, to } = req.query;
    const cacheKey = `daily-financial-summary:${req.user._id}:${from}:${to}`;

    const cached = await getCachedAnalytics(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const start = startOfDay(parseISO(from));
    const end = endOfDay(parseISO(to));
    
    const incomes = await Transaction.find({
      userId: req.user._id,
      type: 'income',
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const expenses = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expenseMap = {};
    expenses.forEach(e => {
      expenseMap[e._id] = e.total;
    });

    const summary = [];
    let currentIncome = 0;
    let incomeIndex = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);
      const dayStr = format(day, 'yyyy-MM-dd');

      while (
        incomeIndex < incomes.length &&
        format(incomes[incomeIndex].date, 'yyyy-MM-dd') === dayStr
      ) {
        currentIncome += incomes[incomeIndex].amount;
        incomeIndex++;
      }

      const dailyExpense = expenseMap[dayStr] || 0;

      summary.push({
        date: dayStr,
        income: currentIncome,
        expenses: dailyExpense,
        netSavings: currentIncome - dailyExpense
      });
    }

    await setCachedAnalytics(cacheKey, summary, 300);
    res.json(summary);
  } catch (error) {
    logger.error('Daily financial summary error:', error);
    res.status(500).json({ error: 'Failed to fetch financial summary' });
  }
});

module.exports = router;
