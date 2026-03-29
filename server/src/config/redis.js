const { createClient } = require('redis');
const logger = require('../utils/logger');
const env = require('./env');

let redisClient = null;
let isConnected = false;
let errorLogged = false; // Prevent spam logging

/**
 * Initialize Redis client
 * @returns {Promise<Object>} Redis client instance
 */
const initRedis = async () => {
    if (redisClient && isConnected) {
        return redisClient;
    }

    try {
        const url = env.REDIS_HOST
            ? `redis://${env.REDIS_PASSWORD ? ':' + env.REDIS_PASSWORD + '@' : ''}${env.REDIS_HOST}:${env.REDIS_PORT}`
            : null;

        if (!url) {
            if (!errorLogged) {
                logger.warn('Redis not configured. Pairing codes will use in-memory storage (not recommended for production).');
                errorLogged = true;
            }
            return null;
        }

        redisClient = createClient({ url });

        redisClient.on('error', (err) => {
            if (!errorLogged) {
                logger.warn('Redis unavailable, using in-memory fallback for pairing codes');
                logger.debug(`Redis error: ${err.message}`);
                errorLogged = true;
            }
            isConnected = false;
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
            isConnected = true;
            errorLogged = false; // Reset flag on successful connection
        });

        // Try to connect with timeout to avoid hanging
        try {
            await Promise.race([
                redisClient.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000))
            ]);
        } catch (connectErr) {
            if (!errorLogged) {
                logger.warn('Redis connection failed, using in-memory fallback');
                errorLogged = true;
            }
            return null;
        }

        return redisClient;
    } catch (err) {
        logger.error(`Failed to initialize Redis: ${err.message}`);
        return null;
    }
};

/**
 * Get Redis client instance
 * @returns {Object|null} Redis client or null if not initialized
 */
const getRedisClient = () => {
    return redisClient && isConnected ? redisClient : null;
};

/**
 * Set a value in Redis with expiration
 * @param {string} key - Redis key
 * @param {string} value - Value to store
 * @param {number} expirationSeconds - TTL in seconds
 */
const setWithExpiry = async (key, value, expirationSeconds) => {
    const client = getRedisClient();
    if (!client) {
        // Fallback to in-memory map if Redis unavailable
        return false;
    }

    try {
        await client.setEx(key, expirationSeconds, value);
        return true;
    } catch (err) {
        logger.error(`Redis SET error: ${err.message}`);
        return false;
    }
};

/**
 * Get a value from Redis
 * @param {string} key - Redis key
 * @returns {Promise<string|null>} Value or null
 */
const get = async (key) => {
    const client = getRedisClient();
    if (!client) {
        return null;
    }

    try {
        return await client.get(key);
    } catch (err) {
        logger.error(`Redis GET error: ${err.message}`);
        return null;
    }
};

/**
 * Delete a key from Redis
 * @param {string} key - Redis key
 */
const del = async (key) => {
    const client = getRedisClient();
    if (!client) {
        return false;
    }

    try {
        await client.del(key);
        return true;
    } catch (err) {
        logger.error(`Redis DEL error: ${err.message}`);
        return false;
    }
};

module.exports = {
    initRedis,
    getRedisClient,
    setWithExpiry,
    get,
    del
};
