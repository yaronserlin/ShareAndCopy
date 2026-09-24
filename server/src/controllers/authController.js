/**
 * Controllers for authentication endpoints: registration, login,
 * session verification, logout, and device revocation.
 */

const authService = require('../services/authService');
const logger = require('../utils/logger');
const { maskEmail, maskRoomId } = require('../utils/logSanitize');
const responseHandler = require('../utils/responseHandler');
const RevokedToken = require('../models/RevokedToken');
const pushService = require('../services/pushService');
const { getIO } = require('../socket');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');

const REVOKED_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * POST /auth/register
 * Creates a new user account and sets access/refresh token cookies.
 */
exports.register = async (req, res) => {
    logger.debug('Register request received');
    const { email, password, firstName, lastName, termsAccepted } = req.body;

    try {

        const result = await authService.register({ email, password, firstName, lastName, termsAccepted });

        logger.info(`New user registered: ${maskEmail(email)} (Room: ${maskRoomId(result.roomId)})`);

        setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
        const { token, ...body } = result;

        responseHandler.success(res, body, 'User registered successfully', 201);
    } catch (err) {
        if (err.message === 'Email already exists' || err.code === 11000) {
            logger.warn(`Registration failed: Email already exists - ${maskEmail(email)}`);
            return responseHandler.error(res, 'Email already exists', null, 400);
        }
        logger.error(`Registration error for ${maskEmail(email)}`, err);
        responseHandler.error(res, 'Registration failed', err.message);
    }
};

/**
 * POST /auth/login
 * Authenticates a user by email/password, registers the requesting
 * device, and sets access/refresh token cookies.
 */
exports.login = async (req, res) => {
    logger.debug('Login request received');
    const { email, password, deviceId, deviceName } = req.body;

    try {
        const result = await authService.login(email, password, deviceId, deviceName);

        logger.info(`User logged in: ${maskEmail(email)}`);

        // Tell the account's other devices about the sign-in. Delivery
        // is best-effort and never blocks the response.
        pushService.sendToUser(String(result.user.id), {
            category: 'security',
            title: 'New sign-in',
            body: `${deviceName || 'A new device'} just signed in to your account.`,
            tag: 'sign-in'
        }, { excludeDeviceId: deviceId });

        setAuthCookies(res, { accessToken: result.accessToken, refreshToken: result.refreshToken });
        const { token, ...body } = result;

        responseHandler.success(res, body, 'Login successful');
    } catch (err) {
        logger.warn(`Login failed for ${maskEmail(email)}: ${err.message}`);
        if (err.message.includes('Invalid credentials')) {
            return responseHandler.error(res, 'Invalid credentials', null, 401);
        }
        if (err.message === 'Device revoked') {
            return responseHandler.error(res, 'This device has been revoked. Please pair it again from an authorized device.', null, 403);
        }
        logger.error(`Login error for ${maskEmail(email)}`, err);
        responseHandler.error(res, 'Login failed', err.message);
    }
};

/**
 * GET /auth/verify
 * Confirms the current access token is valid and returns the
 * authenticated user's public profile. Requires auth middleware to have
 * populated `req.currentUser`.
 */
exports.verify = (req, res) => {
    logger.debug(`Token verified for user: ${maskEmail(req.currentUser.email)}`);

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

/**
 * POST /auth/logout
 * Revokes the current access token's JTI (if present) and clears the
 * auth cookies.
 */
exports.logout = async (req, res) => {
    try {
        if (req.user?.jti) {
            try {
                await RevokedToken.create({
                    jti: req.user.jti,
                    expireAt: new Date(Date.now() + REVOKED_TOKEN_TTL_MS)
                });
            } catch (err) {
                if (err.code !== 11000) throw err;
            }
        }
    } catch (err) {
        logger.error('Logout revocation failed', err);
    }

    clearAuthCookies(res);
    responseHandler.success(res, null, 'Logged out successfully');
};

/**
 * POST /auth/revoke
 * Removes a device from the user's authorized devices, revokes its
 * access-token JTI, blocklists its device ID against future logins (see
 * `authService.login`), and force-disconnects any of its active sockets.
 */
exports.revokeDevice = async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return responseHandler.error(res, 'DeviceID required', null, 400);
    }

    if (req.currentUser.isGuest) {
        return responseHandler.error(res, 'Not available for guest sessions', null, 403);
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
                try {
                    await RevokedToken.create({
                        jti,
                        expireAt: new Date(Date.now() + REVOKED_TOKEN_TTL_MS)
                    });
                    logger.info(`Token revoked for device ${deviceId} (JTI: ${jti})`);
                } catch (err) {
                    if (err.code !== 11000) throw err;
                    logger.info(`Token already revoked for device ${deviceId} (JTI: ${jti})`);
                }
            }

            user.authorizedDevices.splice(deviceIndex, 1);

            // A revoked device must stop receiving the account's
            // notifications, not just lose API access.
            await pushService.removeDeviceSubscriptions(user._id.toString(), deviceId);

            const revokedIndex = user.revokedDevices.findIndex(d => d.deviceId === deviceId);
            const revokedEntry = { deviceId, deviceName: device.deviceName, revokedAt: new Date() };
            if (revokedIndex !== -1) {
                user.revokedDevices[revokedIndex] = revokedEntry;
            } else {
                user.revokedDevices.push(revokedEntry);
            }

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

        pushService.sendToUser(user._id.toString(), {
            category: 'security',
            title: 'Device removed',
            body: 'A device was removed from your account and can no longer access it.',
            tag: 'device-revoked'
        }, { excludeDeviceId: deviceId });

        responseHandler.success(res, null, 'Device revoked successfully');

    } catch (err) {
        logger.error('Revocation failed', err);
        responseHandler.error(res, 'Revocation failed', err.message);
    }
};

/**
 * GET /auth/revoked-devices
 * Lists the current user's revoked devices, most recently revoked first.
 */
exports.listRevokedDevices = (req, res) => {
    if (req.currentUser.isGuest) {
        return responseHandler.error(res, 'Not available for guest sessions', null, 403);
    }

    const devices = [...req.currentUser.revokedDevices]
        .sort((a, b) => b.revokedAt - a.revokedAt);

    responseHandler.success(res, { devices }, 'Revoked devices retrieved successfully');
};

/**
 * POST /auth/reactivate-device
 * Removes a device from the revoked-devices blocklist, letting it log
 * in again with the account's normal credentials. Its next successful
 * login re-adds it to `authorizedDevices` as usual.
 */
exports.reactivateDevice = async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return responseHandler.error(res, 'DeviceID required', null, 400);
    }

    if (req.currentUser.isGuest) {
        return responseHandler.error(res, 'Not available for guest sessions', null, 403);
    }

    try {
        const user = req.currentUser;
        const revokedIndex = user.revokedDevices.findIndex(d => d.deviceId === deviceId);

        if (revokedIndex === -1) {
            return responseHandler.error(res, 'Device not found in revoked list', null, 404);
        }

        user.revokedDevices.splice(revokedIndex, 1);
        await user.save();

        logger.info(`Device reactivated: ${deviceId}`);
        responseHandler.success(res, null, 'Device reactivated successfully');
    } catch (err) {
        logger.error('Device reactivation failed', err);
        responseHandler.error(res, 'Reactivation failed', err.message);
    }
};
