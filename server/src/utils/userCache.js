const NodeCache = require('node-cache');
const User = require('../models/User');
const logger = require('./logger');

// PERF-04: Cache user lookups with 5-minute TTL
const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Get user by ID with caching
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const getCachedUser = async (userId) => {
    const cacheKey = `user:${userId}`;

    // Try cache first
    const cached = userCache.get(cacheKey);
    if (cached) {
        logger.debug(`User cache hit: ${userId}`);
        return cached;
    }

    // Fetch from DB
    try {
        const user = await User.findById(userId);
        if (user) {
            userCache.set(cacheKey, user);
            logger.debug(`User cached: ${userId}`);
        }
        return user;
    } catch (err) {
        logger.error(`User lookup failed: ${err.message}`);
        return null;
    }
};

/**
 * Invalidate user cache
 * @param {string} userId - User ID
 */
const invalidateUserCache = (userId) => {
    const cacheKey = `user:${userId}`;
    userCache.del(cacheKey);
    logger.debug(`User cache invalidated: ${userId}`);
};

/**
 * Clear all user cache
 */
const clearUserCache = () => {
    userCache.flushAll();
    logger.info('User cache cleared');
};

module.exports = {
    getCachedUser,
    invalidateUserCache,
    clearUserCache
};
