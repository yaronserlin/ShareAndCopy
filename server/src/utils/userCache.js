/**
 * Preview: server/src/utils/userCache.js
 * Description: Server utility helper.
 */

const NodeCache = require('node-cache');
const User = require('../models/User');
const logger = require('./logger');


const userCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });


const getCachedUser = async (userId) => {
    const cacheKey = `user:${userId}`;

    
    const cached = userCache.get(cacheKey);
    if (cached) {
        logger.debug(`User cache hit: ${userId}`);
        return cached;
    }

    
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


const invalidateUserCache = (userId) => {
    const cacheKey = `user:${userId}`;
    userCache.del(cacheKey);
    logger.debug(`User cache invalidated: ${userId}`);
};


const clearUserCache = () => {
    userCache.flushAll();
    logger.info('User cache cleared');
};

module.exports = {
    getCachedUser,
    invalidateUserCache,
    clearUserCache
};
