const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { auth } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Generate tokens
const generateTokens = async (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  
  const refreshTokenString = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  
  const refreshToken = new RefreshToken({
    token: refreshTokenString,
    userId,
    expiresAt
  });
  
  await refreshToken.save();
  
  return { accessToken, refreshToken: refreshTokenString };
};

// Register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      passwordHash: password 
    });

    await user.save();
    
    const tokens = await generateTokens(user._id);
    
    logger.info(`User registered: ${email}`);
    
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = await generateTokens(user._id);
    
    logger.info(`User logged in: ${email}`);
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    await RefreshToken.deleteOne({ token: refreshToken });
    const accessToken = jwt.sign(
      { userId: tokenDoc.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } 
    );

    const newRefreshTokenString = crypto.randomBytes(64).toString('hex');
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); 

    const newRefreshToken = new RefreshToken({
      token: newRefreshTokenString,
      userId: tokenDoc.userId,
      expiresAt: newExpiresAt,
    });

    await newRefreshToken.save();

    res.json({
      accessToken,
      refreshToken: newRefreshTokenString,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});


// Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      settings: req.user.settings
    }
  });
});

module.exports = router;