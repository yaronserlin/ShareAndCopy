const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const env = require('./config/env');
const User = require('./models/User');
const DailyStat = require('./models/DailyStat');
const RevokedToken = require('./models/RevokedToken');
const logger = require('./utils/logger');
const { connectedSockets, dataTransferred } = require('./utils/metrics');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

let io;

// PERFORMANCE: Buffer device activity updates instead of immediate DB writes
const deviceActivityBuffer = new Map(); // key: "userId:deviceId", value: { userId, deviceId, deviceName, timestamp }

// SECURITY SEC-09: Rate limiting for socket events to prevent DoS
const socketRateLimits = new Map(); // socketId -> { event -> { count, resetAt } }

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

const initSocket = (server) => {
    // SECURITY: Define allowed origins based on environment
    const allowedOrigins = env.NODE_ENV === 'production'
        ? [env.PUBLIC_URL].filter(Boolean) // Only production URL
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5001', 'http://127.0.0.1:5173', 'http://192.168.1.112:5173']; // Dev ports

    const localOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/;

    io = socketIo(server, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, Postman, etc.) in development
                if (!origin && env.NODE_ENV !== 'production') {
                    return callback(null, true);
                }

                if (allowedOrigins.includes(origin) || (env.NODE_ENV !== 'production' && localOriginRegex.test(origin))) {
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

    // Redis Adapter Setup
    if (env.REDIS_HOST) {
        (async () => {
            try {
                const pubClient = createClient({
                    url: `redis://${env.REDIS_PASSWORD ? ':' + env.REDIS_PASSWORD + '@' : ''}${env.REDIS_HOST}:${env.REDIS_PORT}`
                });
                const subClient = pubClient.duplicate();

                await Promise.all([pubClient.connect(), subClient.connect()]);

                io.adapter(createAdapter(pubClient, subClient));
                logger.info('Redis Adapter connected. Cluster mode enabled.');
            } catch (err) {
                // If Redis fails, we fall back to in-memory adapter (default)
                // This is expected for local development without Docker
                logger.warn('Redis connection failed. Running in Single Node Mode (Memory Adapter).');
                logger.debug(`Redis Error Details: ${err.message}`);
            }
        })();
    } else {
        logger.info('Redis config missing. Running in Single Node Mode (Memory Adapter).');
    }

    // Middleware: Authenticate Socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, env.JWT_SECRET);

            // Check if token is revoked
            if (decoded.jti) {
                const revoked = await RevokedToken.findOne({ jti: decoded.jti });
                if (revoked) {
                    return next(new Error('Authentication error: Token revoked'));
                }
            }

            // Handle Guest/Device Tokens
            if (decoded.scope === 'guest' || decoded.isGuest) {
                socket.user = {
                    _id: decoded.roomId, // Treat Room ID as the User ID for room joining purposes
                    id: decoded.id, // Guest ID
                    isGuest: true,
                    name: decoded.name
                };
                return next();
            }

            // Handle Pairing Tokens
            if (decoded.scope === 'pairing') {
                socket.user = { _id: decoded.id, isPairing: true };
                socket.pairingCode = decoded.code;
                return next();
            }

            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (err) {
            logger.error(`Socket Auth Error: ${err.message}`);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user._id.toString(); // For Guest, this is RoomId (HostId)
        const isGuest = socket.user.isGuest;
        const { deviceId, deviceName } = socket.handshake.query;

        // SECURITY: Sanitize user-controlled inputs to prevent XSS
        const sanitizedDeviceId = validator.escape(deviceId || '');
        const sanitizedDeviceName = validator.escape((isGuest ? '[Guest] ' : '') + (deviceName || 'Unknown'));

        // Attach device info to socket
        socket.data.deviceInfo = {
            deviceId: sanitizedDeviceId,
            deviceName: sanitizedDeviceName
        };

        // Increment Connected Sockets Gauge
        connectedSockets.inc();

        logger.info(`Socket connected: ${socket.id} (User/Room: ${userId}, Device: ${deviceId}, Guest: ${isGuest})`);

        // Join User's Private Room
        socket.join(userId);

        // PERFORMANCE: Buffer device activity updates instead of immediate DB write
        if (sanitizedDeviceId && !isGuest) {
            const bufferKey = `${userId}:${sanitizedDeviceId}`;
            deviceActivityBuffer.set(bufferKey, {
                userId,
                deviceId: sanitizedDeviceId,
                deviceName: sanitizedDeviceName,
                timestamp: new Date()
            });
        }

        // Notify other devices in the room (EXCLUDING sender)
        socket.to(userId).emit('device-online', {
            socketId: socket.id,
            deviceId: sanitizedDeviceId,
            deviceName: sanitizedDeviceName
        });

        // --- Send Initial Device List to New Connection ---
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
            logger.error(`Error fetching device list: ${err.message}`);
        }

        // 1. Device Registration (Explicit)
        socket.on('register-device', async (data) => {
            // SECURITY: Sanitize device data
            const cleanDeviceId = validator.escape(data.deviceId || '');
            logger.info(`Device registered: ${cleanDeviceId}`);
        });

        // 1.5 Request Device List (Fix for navigation)
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
                logger.error(`Error fetching device list: ${err.message}`);
            }
        });

        // 2. Signaling Event (WebRTC)
        // Payload: { targetSocketId, signalData, type (offer/answer/candidate) }
        socket.on('signal', async (data) => {
            // SECURITY SEC-09: Rate limit signaling events
            if (!checkSocketRateLimit(socket.id, 'signal', 100, 60000)) {
                logger.warn(`Rate limit exceeded for socket ${socket.id} on 'signal' event`);
                return socket.emit('error', { message: 'Too many requests. Please slow down.' });
            }

            const { targetSocketId, signalData, type } = data;

            // Security: Ensure target is in the same room
            if (targetSocketId) {
                // Get all sockets in the user's room to verify membership
                const roomSockets = await io.in(userId).fetchSockets();
                const isTargetInRoom = roomSockets.some(s => s.id === targetSocketId);

                if (isTargetInRoom) {
                    io.to(targetSocketId).emit('signal', {
                        senderSocketId: socket.id,
                        senderDeviceId: sanitizedDeviceId,
                        type,
                        signalData
                    });
                    logger.debug(`Signal (${type}) sent from ${socket.id} to ${targetSocketId}`);
                } else {
                    logger.warn(`Security Alert: Socket ${socket.id} attempted to signal socket ${targetSocketId} not in room ${userId}`);
                }
            }
        });



        // --- Device Pairing Flow ---
        // 1. Device A (Logged In) joins the pairing room for its code
        socket.on('join-pairing', (code) => {
            // Verify code belongs to this user (optional strictly, but good for security)
            // For now, trust the token scope logic if we implemented that fully, 
            // but here we just join the room.
            socket.join(`pairing-${code}`);
            logger.info(`Socket ${socket.id} joined pairing room: pairing-${code}`);
        });

        // 2. Device B (New) scans QR and requests pairing
        // Note: Device B is NOT authenticated yet, so it might not have 'socket.user'.
        // We need to allow unauthenticated sockets for pairing? 
        // OR: We use a special "Pairing Token" generated by the scan?
        // Current design: Device B scans QR, gets {code, pairingToken}.
        // Device B connects to socket using this 'pairingToken'.
        // The 'io.use' middleware needs to handle 'pairing' scope tokens.

        socket.on('request-pairing', (data) => {
            // SECURITY SEC-09: Rate limit pairing requests
            if (!checkSocketRateLimit(socket.id, 'request-pairing', 10, 60000)) {
                logger.warn(`Rate limit exceeded for socket ${socket.id} on 'request-pairing' event`);
                return;
            }

            const { code, deviceInfo } = data;
            // Notify Device A (in the room)
            io.to(`pairing-${code}`).emit('confirmation-request', {
                socketId: socket.id,
                deviceInfo
            });
        });

        // 3. Device A approves
        socket.on('approve-pairing', async (data) => {
            const { targetSocketId } = data;

            // SECURITY: Limit guest sessions per host to prevent DoS
            const MAX_GUESTS_PER_HOST = 10;
            const roomSockets = await io.in(userId).fetchSockets();
            const guestCount = roomSockets.filter(s => s.user && s.user.isGuest).length;

            if (guestCount >= MAX_GUESTS_PER_HOST) {
                logger.warn(`Guest limit reached for user ${userId}`);
                return socket.emit('pairing-error', {
                    message: `Maximum guest limit (${MAX_GUESTS_PER_HOST}) reached`
                });
            }

            // Generate a full long-term Auth Token for the new device
            // Since Device A is authenticated, it can authorize this.
            // In a stricter model, we might just send the creds encrypted.
            // Generating a new token here is easier.

            // SECURITY: Generate a Guest Token for the new device
            // Use crypto-secure random UUID instead of Math.random()
            const guestId = `guest_${crypto.randomUUID()}`;

            // Include JTI for revocation capability
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
                { expiresIn: '24h' } // Guest session duration
            );

            io.to(targetSocketId).emit('pairing-success', {
                token: newToken,
                user: { isGuest: true, roomId: userId }
            });

            // Increment Guest Session Count
            const today = new Date().toISOString().split('T')[0];
            DailyStat.findOneAndUpdate(
                { date: today },
                { $inc: { guestSessions: 1 } },
                { upsert: true }
            ).catch(e => logger.error('Error updating guest stats', e));

            logger.info(`Pairing approved by ${userId} for target socket ${targetSocketId}`);
        });

        // 4. Report Transfer Stats
        socket.on('report-transfer', async (data) => {
            // SECURITY SEC-09: Rate limit transfer reports
            if (!checkSocketRateLimit(socket.id, 'report-transfer', 200, 60000)) {
                logger.warn(`Rate limit exceeded for socket ${socket.id} on 'report-transfer' event`);
                return;
            }

            const size = data.size || 0;
            const type = data.type || 'upload'; // 'upload' or 'download'
            const today = new Date().toISOString().split('T')[0];

            logger.info(`REPORT-TRANSFER (${type}): Received from ${socket.id} (User: ${userId}, Guest: ${socket.user.isGuest}). Size: ${size}`);

            // Increment Data Counter
            dataTransferred.inc(size);

            try {
                // Update Global Daily Stats (Only Count Uploads to avoid double global entry)
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
                    logger.info(`REPORT-TRANSFER: DailyStat updated. Total: ${dailyRes.totalDataTransferred}`);
                }

                // Update User Stats (if not guest)
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
                    logger.info(`REPORT-TRANSFER: User updated (${userId}). Modified: ${userRes.modifiedCount}`);
                } else {
                    logger.info(`REPORT-TRANSFER: User update skipped (Guest).`);
                }
            } catch (err) {
                logger.error(`Stats update error: ${err.message}`);
            }
        });

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}`);
            connectedSockets.dec(); // Decrement Connected Sockets Gauge

            // SECURITY SEC-09: Cleanup rate limit tracking
            socketRateLimits.delete(socket.id);

            // Notify others
            socket.to(userId).emit('device-offline', {
                socketId: socket.id,
                deviceId: sanitizedDeviceId
            });
        });
    });


    return io;
};

// PERFORMANCE: Background worker to flush buffered device activity updates
// Runs every 30 seconds to reduce DB load
setInterval(async () => {
    if (deviceActivityBuffer.size === 0) return;

    const updates = Array.from(deviceActivityBuffer.values());
    deviceActivityBuffer.clear();

    logger.debug(`Processing ${updates.length} buffered device activity updates`);

    try {
        // Build bulk operations
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

        // Execute bulk write (unordered for performance)
        if (bulkOps.length > 0) {
            const result = await User.bulkWrite(bulkOps, { ordered: false });
            logger.debug(`Device activity bulk update complete: ${result.modifiedCount} modified`);

            // Handle devices that weren't found (need to be added)
            const notFoundUpdates = updates.filter((update, index) => {
                return bulkOps[index] && !result.modifiedCount;
            });

            // Add missing devices
            for (const { userId, deviceId, deviceName, timestamp } of notFoundUpdates) {
                await User.findByIdAndUpdate(userId, {
                    $addToSet: {
                        authorizedDevices: {
                            deviceId,
                            deviceName,
                            lastActive: timestamp,
                            jti: '' // Will be set on next login
                        }
                    }
                }).catch(err => logger.error(`Failed to add device: ${err.message}`));
            }
        }
    } catch (err) {
        logger.error(`Bulk device activity update failed: ${err.message}`);
        // Re-buffer failed updates for next cycle
        updates.forEach(update => {
            const key = `${update.userId}:${update.deviceId}`;
            deviceActivityBuffer.set(key, update);
        });
    }
}, 30000); // 30 seconds

module.exports = initSocket;
module.exports.getIO = () => io;
