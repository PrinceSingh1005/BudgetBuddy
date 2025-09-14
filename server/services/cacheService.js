
const logger = require('../utils/logger') || console;

const cache = new Map(); // key -> { value, expiresAt }

function _isExpired(entry) {
  return !entry || (entry.expiresAt && Date.now() > entry.expiresAt);
}

async function getCachedAnalytics(key) {
  try {
    const entry = cache.get(key);
    if (!entry || _isExpired(entry)) {
      if (entry) cache.delete(key);
      return null;
    }
    return entry.value;
  } catch (err) {
    logger.error('Cache get error:', err);
    return null;
  }
}

async function setCachedAnalytics(key, data, ttl = 300) {
  try {
    const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;
    cache.set(key, { value: data, expiresAt });
  } catch (err) {
    logger.error('Cache set error:', err);
  }
}

async function clearAnalyticsCache(userId) {
  try {
    if (!userId) {
      cache.clear();
      return;
    }
    
    for (const key of Array.from(cache.keys())) {
      if (key.includes(`:${userId}:`) || key.endsWith(`:${userId}`) || key.startsWith(`${userId}:`)) {
        cache.delete(key);
      }
    }
  } catch (err) {
    logger.error('Cache clear error:', err);
  }
}

module.exports = {
  getCachedAnalytics,
  setCachedAnalytics,
  clearAnalyticsCache
};
