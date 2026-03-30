/**
 * Preview: server/src/middleware/rateLimiter.js
 * Description: Express middleware module.
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const env = require('../config/env');


const RATE_LIMIT_MESSAGE = 'Too many requests from this IP, please try again later.';




const apiLimiter = rateLimit({
    
    
    windowMs: env.RATE_LIMIT_WINDOW_MS,

    
    
    max: env.RATE_LIMIT_MAX_REQUESTS,

    
    message: RATE_LIMIT_MESSAGE,

    
    handler: (req, res) => {
        
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);

        
        
        const retryAfterSeconds = req.rateLimit.resetTime
            ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
            : null;

        
        
        res.status(429).json({
            success: false,
            message: RATE_LIMIT_MESSAGE,
            retryAfter: retryAfterSeconds
        });
    },

    
    
    standardHeaders: true,

    
    
    legacyHeaders: false,
});

module.exports = apiLimiter;
