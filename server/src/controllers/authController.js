/**
 * Preview: server/src/controllers/authController.js
 * Description: Server controller handling requests.
 */

const authService = require('../services/authService');
const logger = require('../utils/logger');
const responseHandler = require('../utils/responseHandler');
const RevokedToken = require('../models/RevokedToken');
const { getIO } = require('../socket');




exports.register = async (req, res) => {
    
    logger.debug('Register request received');
    const { email, password, firstName, lastName } = req.body; 

    try {
        
        const result = await authService.register({ email, password, firstName, lastName });
        
        logger.info(`New user registered: ${email} with room ID: ${result.roomId}`);
        
        responseHandler.success(res, result, 'User registered successfully', 201);
    } catch (err) {
        
        if (err.message === 'Email already exists' || err.code === 11000) {
            logger.warn(`Registration failed: Email already exists - ${email}`);
            
            return responseHandler.error(res, 'Email already exists', null, 400);
        }
        
        logger.error(`Registration error for ${email}: ${err.message}`, err);
        
        responseHandler.error(res, 'Registration failed', err.message);
    }
};


exports.login = async (req, res) => {
    
    logger.debug('Login request received');
    const { email, password, deviceId, deviceName } = req.body; 

    try {
        
        const result = await authService.login(email, password, deviceId, deviceName);
        
        
        logger.info(`User logged in: ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
        
        responseHandler.success(res, result, 'Login successful');
    } catch (err) {
        
        logger.warn(`Login failed for ${email}: ${err.message}`);
        
        if (err.message.includes('Invalid credentials')) {
            
            return responseHandler.error(res, 'Invalid credentials', null, 401);
        }
        
        logger.error(`Login error for ${email}: ${err.message}`, err);
        
        responseHandler.error(res, 'Login failed', err.message);
    }
};


exports.verify = (req, res) => {
    
    logger.debug(`Token verified for user: ${req.currentUser.email}`);

    
    
    responseHandler.success(res, {
        valid: true, 
        user: {
            id: req.currentUser._id,
            email: req.currentUser.email,
            firstName: req.currentUser.firstName,
            lastName: req.currentUser.lastName,
            isAdmin: req.currentUser.isAdmin || false,
            roomId: req.currentUser.roomId || req.currentUser._id, 
            isGuest: req.currentUser.isGuest || false
        }
    }, 'Token verified successfully');
};


exports.revokeDevice = async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return responseHandler.error(res, 'DeviceID required', null, 400);
    }

    try {
        const user = req.currentUser;
        let deviceFound = false;

        
        const deviceIndex = user.authorizedDevices.findIndex(d => d.deviceId === deviceId);

        if (deviceIndex !== -1) {
            deviceFound = true;
            const device = user.authorizedDevices[deviceIndex];
            const jti = device.jti;

            
            if (jti) {
                const exists = await RevokedToken.exists({ jti });
                if (!exists) {
                    await RevokedToken.create({
                        jti,
                        expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
                    });
                    logger.info(`Token revoked for device ${deviceId} (JTI: ${jti})`);
                }
            }

            
            user.authorizedDevices.splice(deviceIndex, 1);
            await user.save();
        }

        
        
        const io = getIO();
        const roomId = user._id.toString();
        const sockets = await io.in(roomId).fetchSockets();

        let socketFound = false;
        for (const socket of sockets) {
            if (socket.data.deviceInfo && socket.data.deviceInfo.deviceId === deviceId) {
                socketFound = true;
                deviceFound = true; 
                socket.emit('force-logout');
                logger.info(`Socket emitting force-logout for device: ${deviceId}`);

                setTimeout(() => {
                    socket.disconnect(true);
                    logger.info(`Socket disconnected for revoked device: ${deviceId}`);
                }, 500);
            }
        }

        if (!deviceFound) {
            return responseHandler.error(res, 'Device not found', null, 404);
        }

        responseHandler.success(res, null, 'Device revoked successfully');

    } catch (err) {
        logger.error(`Revocation failed: ${err.message}`);
        responseHandler.error(res, 'Revocation failed', err.message);
    }
};
