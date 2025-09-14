const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const receiptRoutes = require('./routes/receipts');
const importRoutes = require('./routes/imports');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['https://budgetbuddy-1-cj4v.onrender.com' , process.env.FRONTEND_URL , 'http://localhost:3000'],
  credentials: true
}));
app.use(compression());

app.use((req, res, next) => {
  if (req.query) {
    Object.assign(req.query, mongoSanitize.sanitize(req.query));
  }
  if (req.body) {
    Object.assign(req.body, mongoSanitize.sanitize(req.body));
  }
  if (req.params) {
    Object.assign(req.params, mongoSanitize.sanitize(req.params));
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/receipts', receiptRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-assistant')
.then(() => logger.info('Connected to MongoDB'))
.catch(err => logger.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
