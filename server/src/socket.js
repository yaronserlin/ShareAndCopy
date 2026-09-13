/**
 * Socket.IO server setup: authenticates connections via the same JWTs
 * used for HTTP requests, tracks which devices are online per user room,
 * relays WebRTC signaling messages between a user's own devices, and
 * handles the device-pairing handshake and usage-stat reporting.
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const env = require('./config/env');
const { getAllowedOrigins } = require('./middleware/cors');
const User = require('./models/User');
const DailyStat = require('./models/DailyStat');
const RevokedToken = require('./models/RevokedToken');
const logger = require('./utils/logger');
const { maskRoomId, maskPairingCode } = require('./utils/logSanitize');
const { connectedSockets, dataTransferred } = require('./utils/metrics');
const pairingStore = require('./utils/pairingStore');
const { parseCookies } = require('./utils/cookies');

let io;

/** Buffers `authorizedDevices` activity updates, flushed periodically in bulk. */
const deviceActivityBuffer = new Map();

/** Per-socket, per-event rate limit counters. */
const socketRateLimits = new Map();

/** Maximum times a failed device-activity bulk update is requeued before being dropped. */
const MAX_DEVICE_ACTIVITY_RETRIES = 3;

/**
 * Simple fixed-window rate limiter for socket events.
 *
 * @param {string} socketId
 * @param {string} event
 * @param {number} [maxRequests=100] - Requests allowed per window.
 * @param {number} [windowMs=60000] - Window size, in ms.
 * @returns {boolean} Whether the request is within the rate limit.
 */
const checkSocketRateLimit = (socketId, event, maxRequests = 100, windowMs = 60000) => {
    const now = Date.now();

    if (!socketRateLimits.has(socketId)) {
        socketRateLimits.set(socketId, {});
    }

    const socketLimits = socketRateLimits.get(socketId);

    if (!socketLimits[event] || now > socketLimits[event].resetAt) {
        socketLimits[event] = { count: 1, resetAt: now + windowMs };
        return true;
    }

    if (socketLimits[event].count >= maxRequests) {
        return false;
    }

    socketLimits[event].count++;
    return true;
};

/**
 * Creates and configures the Socket.IO server on top of the given HTTP
 * server, wiring up authentication and all real-time event handlers.
 *
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
const initSocket = (server) => {
    const allowedOrigins = env.NODE_ENV === 'production'
        ? [env.PUBLIC_URL].filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5001', 'http://127.0.0.1:5173'];

    // Same LAN-origin patterns (10.x, 172.16-31.x, 192.168.x, localhost)
    // used by the HTTP CORS middleware, so the two never drift apart.
    const lanOriginPatterns = getAllowedOrigins();

    io = socketIo(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin && env.NODE_ENV !== 'production') {
                    return callback(null, true);
                }

                if (allowedOrigins.includes(origin) || (env.NODE_ENV !== 'production' && lanOriginPatterns.some(pattern => pattern.test(origin)))) {
                    callback(null, true);
                } else {
                    logger.warn(`CORS blocked origin: ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    /**
     * Authenticates each connecting socket using the same JWT (from
     * cookie or handshake auth) issued by the HTTP auth flow, attaching
     * a `user`, guest identity, or pairing identity to `socket.user`.
     */
    io.use(async (socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie);
            const token = socket.handshake.auth?.token || cookies.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, env.JWT_SECRET);

            if (decoded.jti) {
                const revoked = await RevokedToken.findOne({ jti: decoded.jti });
                if (revoked) {
                    return next(new Error('Authentication error: Token revoked'));
                }
            }

            if (decoded.scope === 'guest' || decoded.isGuest) {
                socket.user = {
                    _id: decoded.roomId,
                    id: decoded.id,
                    isGuest: true,
                    name: decoded.name
                };
                return next();
            }

            if (decoded.scope === 'pairing') {
                socket.user = { _id: decoded.id, isPairing: true };
                socket.pairingCode = decoded.code;
                return next();
            }

            const user = await User.findById(decoded.id).select('-password').lean();

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            logger.child({ socketId: socket.id }).error('Socket auth error', err);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    /**
     * Per-connection setup: registers the socket in its user's room (so
     * signaling and device-list events can be broadcast to just that
     * user's own devices), announces it to the user's other devices, and
     * wires up all client-to-server event handlers.
     */
    io.on('connection', async (socket) => {
        const userId = socket.user._id.toString();
        const isGuest = socket.user.isGuest;
        const displayUserId = isGuest ? maskRoomId(userId) : userId;
        const log = logger.child({ socketId: socket.id, userId: displayUserId, isGuest });
        const { deviceId, deviceName } = socket.handshake.query;

        const sanitizedDeviceId = validator.escape(deviceId || '');
        const sanitizedDeviceName = validator.escape((isGuest ? '[Guest] ' : '') + (deviceName || 'Unknown'));

        socket.data.deviceInfo = {
            deviceId: sanitizedDeviceId,
            deviceName: sanitizedDeviceName
        };

        connectedSockets.inc();

        log.info(`Socket connected (User/Room: ${displayUserId}, Device: ${deviceId}, Guest: ${isGuest})`);

        if (!socket.user.isPairing) {
            socket.join(userId);

            if (sanitizedDeviceId && !isGuest) {
                const bufferKey = `${userId}:${sanitizedDeviceId}`;
                deviceActivityBuffer.set(bufferKey, {
                    userId,
                    deviceId: sanitizedDeviceId,
                    deviceName: sanitizedDeviceName,
                    timestamp: new Date()
                });
            }

            socket.to(userId).emit('device-online', {
                socketId: socket.id,
                deviceId: sanitizedDeviceId,
                deviceName: sanitizedDeviceName
            });

            try {
                const sockets = await io.in(userId).fetchSockets();
                const deviceList = sockets
                    .filter(s => s.id !== socket.id && s.data.deviceInfo)
                    .map(s => ({
                        socketId: s.id,
                        deviceId: s.data.deviceInfo.deviceId,
                        deviceName: s.data.deviceInfo.deviceName
                    }));

                socket.emit('initial-device-list', deviceList);
            } catch (err) {
                log.error('Error fetching device list', err);
            }
        }

        socket.on('register-device', async (data) => {
            try {
                const cleanDeviceId = validator.escape(data.deviceId || '');
                log.debug(`Device registered: ${cleanDeviceId}`);
            } catch (err) {
                log.error('Error registering device', err);
            }
        });

        socket.on('request-device-list', async () => {
            try {
                const sockets = await io.in(userId).fetchSockets();
                const deviceList = sockets
                    .filter(s => s.id !== socket.id && s.data.deviceInfo)
                    .map(s => ({
                        socketId: s.id,
                        deviceId: s.data.deviceInfo.deviceId,
                        deviceName: s.data.deviceInfo.deviceName
                    }));

                socket.emit('initial-device-list', deviceList);
            } catch (err) {
                log.error('Error fetching device list', err);
            }
        });

        /**
         * Relays a WebRTC signaling payload (offer/answer/candidate) to
         * another of this user's sockets, after confirming the target is
         * actually in the sender's own room (prevents signaling an
         * arbitrary socket ID belonging to someone else).
         */
        socket.on('signal', async (data) => {
            if (!checkSocketRateLimit(socket.id, 'signal', 100, 60000)) {
                log.warn(`Rate limit exceeded on 'signal' event`);
                return socket.emit('error', { message: 'Too many requests. Please slow down.' });
            }

            try {
                const { targetSocketId, signalData, type } = data || {};

                if (targetSocketId) {
                    const roomSockets = await io.in(userId).fetchSockets();
                    const isTargetInRoom = roomSockets.some(s => s.id === targetSocketId);

                    if (isTargetInRoom) {
                        io.to(targetSocketId).emit('signal', {
                            senderSocketId: socket.id,
                            senderDeviceId: sanitizedDeviceId,
                            type,
                            signalData
                        });
                        log.debug(`Signal (${type}) sent to ${targetSocketId}`);
                    } else {
                        log.warn(`Security alert: attempted to signal socket ${targetSocketId} not in room ${displayUserId}`);
                    }
                }
            } catch (err) {
                log.error('Error relaying signal', err);
            }
        });

        /**
         * Lets the pairing-code owner's socket join a dedicated room for
         * that code, so a `request-pairing` from a new device can be
         * routed only to the device that generated the code.
         */
        socket.on('join-pairing', (code) => {
            try {
                if (socket.user.isGuest || socket.user.isPairing || !pairingStore.isOwner(code, userId)) {
                    log.warn(`Denied joining pairing room for code ${maskPairingCode(code)}`);
                    return;
                }

                socket.join(`pairing-${code}`);
                log.info(`Joined pairing room for code ${maskPairingCode(code)}`);
            } catch (err) {
                log.error('Error joining pairing room', err);
            }
        });


        /**
         * Broadcasts a new device's pairing request to the pairing
         * code's room, prompting the owning device to approve or deny it.
         */
        socket.on('request-pairing', (data) => {
            try {
                if (!checkSocketRateLimit(socket.id, 'request-pairing', 10, 60000)) {
                    log.warn(`Rate limit exceeded on 'request-pairing' event`);
                    return;
                }

                const { code, deviceInfo } = data;

                io.to(`pairing-${code}`).emit('confirmation-request', {
                    socketId: socket.id,
                    deviceInfo
                });

                // Join the pairing room *after* the broadcast above (so
                // this socket doesn't receive its own confirmation-request)
                // so a later `approve-pairing` can verify its targetSocketId
                // is actually the device that requested this code, instead
                // of trusting a caller-supplied socket ID outright.
                socket.join(`pairing-${code}`);
            } catch (err) {
                log.error('Error handling pairing request', err);
            }
        });

        /**
         * Approves a pending pairing request: issues a short-lived guest
         * JWT scoped to this user's room and sends it to the requesting
         * device, subject to a per-host guest-device cap.
         */
        socket.on('approve-pairing', async (data) => {
            try {
                const { targetSocketId, code } = data;

                if (socket.user.isGuest || socket.user.isPairing || !pairingStore.isOwner(code, userId)) {
                    log.warn(`Denied approve-pairing for code ${maskPairingCode(code)}`);
                    return socket.emit('pairing-error', { message: 'Not authorized to approve this pairing request' });
                }

                // Verify targetSocketId is actually a member of this
                // pairing's room (joined in the `request-pairing` handler
                // above), the same way the `signal` handler confirms a
                // target is in the sender's own room before relaying to
                // it — otherwise a caller could supply an arbitrary
                // socket ID and have a guest token delivered to it.
                const pairingRoom = io.sockets.adapter.rooms.get(`pairing-${code}`);
                if (!targetSocketId || !pairingRoom || !pairingRoom.has(targetSocketId)) {
                    log.warn(`Denied approve-pairing: target socket not in pairing room for code ${maskPairingCode(code)}`);
                    return socket.emit('pairing-error', { message: 'Invalid pairing target' });
                }

                // Finalize the code immediately after authorizing, rather
                // than after the async guest-count/token-issuance work
                // below, so a duplicate approve-pairing for the same code
                // (a double-click, a client retry) can't also pass the
                // isOwner check and mint a second guest session.
                pairingStore.remove(code);

                const MAX_GUESTS_PER_HOST = 10;
                const roomSockets = await io.in(userId).fetchSockets();
                const guestCount = roomSockets.filter(s => s.user && s.user.isGuest).length;

                if (guestCount >= MAX_GUESTS_PER_HOST) {
                    log.warn(`Guest limit reached for user ${displayUserId}`);
                    return socket.emit('pairing-error', {
                        message: `Maximum guest limit (${MAX_GUESTS_PER_HOST}) reached`
                    });
                }

                const guestId = `guest_${crypto.randomUUID()}`;

                const jti = crypto.randomUUID();
                const newToken = jwt.sign(
                    {
                        id: guestId,
                        roomId: userId,
                        isGuest: true,
                        scope: 'guest',
                        name: 'Guest Device',
                        jti
                    },
                    env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                io.to(targetSocketId).emit('pairing-success', {
                    token: newToken,
                    user: { isGuest: true, roomId: userId }
                });

                const today = new Date().toISOString().split('T')[0];
                DailyStat.findOneAndUpdate(
                    { date: today },
                    { $inc: { guestSessions: 1 } },
                    { upsert: true }
                ).catch(e => log.error('Error updating guest stats', e));

                log.info(`Pairing approved for target socket ${targetSocketId}`);
            } catch (err) {
                log.error('Error approving pairing', err);
            }
        });

        /**
         * Records a completed upload/download for metrics and, unless
         * the reporting socket is a guest, updates that user's lifetime
         * transfer stats.
         */
        socket.on('report-transfer', async (data) => {
            if (!checkSocketRateLimit(socket.id, 'report-transfer', 200, 60000)) {
                log.warn(`Rate limit exceeded on 'report-transfer' event`);
                return;
            }

            const size = data.size || 0;
            const type = data.type || 'upload';
            const today = new Date().toISOString().split('T')[0];

            log.debug(`Report-transfer (${type}) received. Size: ${size}`);

            dataTransferred.inc(size);

            try {
                if (type !== 'download') {
                    const dailyRes = await DailyStat.findOneAndUpdate(
                        { date: today },
                        {
                            $inc: {
                                totalDataTransferred: size,
                                totalUploads: 1
                            }
                        },
                        { upsert: true, new: true }
                    );
                    log.debug(`DailyStat updated. Total: ${dailyRes.totalDataTransferred}`);
                }

                if (!socket.user.isGuest) {
                    const incUpdate = { dataTransferred: size };
                    if (type === 'download') {
                        incUpdate.downloadCount = 1;
                    } else {
                        incUpdate.uploadCount = 1;
                    }

                    const userRes = await User.updateOne(
                        { _id: userId },
                        { $inc: incUpdate }
                    );
                    log.debug(`User stats updated. Modified: ${userRes.modifiedCount}`);
                }

                log.info(`Report-transfer (${type}) processed. Size: ${size}`);
            } catch (err) {
                log.error('Stats update error', err);
            }
        });

        /** Decrements connection metrics and clears per-socket rate limit state. */
        socket.on('disconnect', (reason) => {
            log.info(`Socket disconnected: ${reason}`);
            connectedSockets.dec();

            socketRateLimits.delete(socket.id);

            if (!socket.user.isPairing) {
                socket.to(userId).emit('device-offline', {
                    socketId: socket.id,
                    deviceId: sanitizedDeviceId
                });
            }
        });
    });

    return io;
};

/**
 * Periodically flushes buffered `lastActive`/`deviceName` updates for
 * already-authorized devices in one bulk write, instead of writing to
 * MongoDB on every socket connection. A socket whose deviceId has no
 * matching `authorizedDevices` entry (never completed a real login) is
 * silently skipped rather than inserted — a fabricated entry would need
 * a placeholder `jti`, which fails the schema's own validator and would
 * corrupt the document, breaking every later `save()` on that user
 * (login, revoke, admin promotion) with a `ValidationError`.
 */
const deviceActivityInterval = setInterval(async () => {
    if (deviceActivityBuffer.size === 0) return;

    const updates = Array.from(deviceActivityBuffer.values());
    deviceActivityBuffer.clear();

    logger.debug(`Processing ${updates.length} buffered device activity updates`);

    try {
        const bulkOps = updates.map(({ userId, deviceId, deviceName, timestamp }) => ({
            updateOne: {
                filter: { _id: userId, 'authorizedDevices.deviceId': deviceId },
                update: {
                    $set: {
                        'authorizedDevices.$.lastActive': timestamp,
                        'authorizedDevices.$.deviceName': deviceName
                    }
                },
                upsert: false
            }
        }));

        if (bulkOps.length > 0) {
            const result = await User.bulkWrite(bulkOps, { ordered: false });
            logger.debug(`Device activity bulk update complete: ${result.modifiedCount} modified`);
        }
    } catch (err) {
        logger.error(`Bulk device activity update failed: ${err.message}`);

        updates.forEach(update => {
            const retryCount = (update.retryCount || 0) + 1;

            if (retryCount > MAX_DEVICE_ACTIVITY_RETRIES) {
                logger.error(`Dropping device activity update for ${update.userId}:${update.deviceId} after ${MAX_DEVICE_ACTIVITY_RETRIES} failed retries`);
                return;
            }

            const key = `${update.userId}:${update.deviceId}`;
            deviceActivityBuffer.set(key, { ...update, retryCount });
        });
    }
}, 30000);

deviceActivityInterval.unref();

module.exports = initSocket;
module.exports.getIO = () => io;
