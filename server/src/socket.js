const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('./config/env');
const User = require('./models/User');
const DailyStat = require('./models/DailyStat');
const logger = require('./utils/logger');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: '*', // Adjust for production
            methods: ['GET', 'POST']
        }
    });

    // Middleware: Authenticate Socket
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, env.JWT_SECRET);

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

        // Attach device info to socket
        socket.deviceInfo = {
            deviceId,
            deviceName: (isGuest ? '[Guest] ' : '') + (deviceName || 'Unknown')
        };

        logger.info(`Socket connected: ${socket.id} (User/Room: ${userId}, Device: ${deviceId}, Guest: ${isGuest})`);

        // Join User's Private Room
        socket.join(userId);

        // Update Device Activity (Only for authenticated Hosts)
        if (deviceId && !isGuest) {
            await User.updateOne(
                { _id: userId, 'authorizedDevices.deviceId': deviceId },
                {
                    $set: {
                        'authorizedDevices.$.lastActive': new Date(),
                        'authorizedDevices.$.deviceName': deviceName || 'Unknown Device'
                    }
                }
            ).catch(err => {
                // If device not found, push it
                return User.findByIdAndUpdate(userId, {
                    $addToSet: {
                        authorizedDevices: {
                            deviceId,
                            deviceName: deviceName || 'Unknown Device',
                            lastActive: new Date()
                        }
                    }
                });
            });
        }

        // Notify other devices in the room (EXCLUDING sender)
        socket.to(userId).emit('device-online', {
            socketId: socket.id,
            deviceId: deviceId,
            deviceName: deviceName
        });

        // --- Send Initial Device List to New Connection ---
        try {
            const sockets = await io.in(userId).fetchSockets();
            const deviceList = sockets
                .filter(s => s.id !== socket.id && s.deviceInfo)
                .map(s => ({
                    socketId: s.id,
                    deviceId: s.deviceInfo.deviceId,
                    deviceName: s.deviceInfo.deviceName
                }));

            socket.emit('initial-device-list', deviceList);
        } catch (err) {
            logger.error(`Error fetching device list: ${err.message}`);
        }

        // 1. Device Registration (Explicit)
        socket.on('register-device', async (data) => {
            // Can be used to update metadata if needed
            logger.info(`Device registered: ${data.deviceId}`);
        });

        // 1.5 Request Device List (Fix for navigation)
        socket.on('request-device-list', async () => {
            try {
                const sockets = await io.in(userId).fetchSockets();
                const deviceList = sockets
                    .filter(s => s.id !== socket.id && s.deviceInfo)
                    .map(s => ({
                        socketId: s.id,
                        deviceId: s.deviceInfo.deviceId,
                        deviceName: s.deviceInfo.deviceName
                    }));

                socket.emit('initial-device-list', deviceList);
            } catch (err) {
                logger.error(`Error fetching device list: ${err.message}`);
            }
        });

        // 2. Signaling Event (WebRTC)
        // Payload: { targetSocketId, signalData, type (offer/answer/candidate) }
        socket.on('signal', (data) => {
            const { targetSocketId, signalData, type } = data;

            // Security: Ensure target is in valid format or belongs to user logic (if strictly personal P2P)
            // For now, allow sending to any valid socket ID, typically another device of same user

            if (targetSocketId) {
                io.to(targetSocketId).emit('signal', {
                    senderSocketId: socket.id,
                    senderDeviceId: deviceId,
                    type,
                    signalData
                });
                logger.debug(`Signal (${type}) sent from ${socket.id} to ${targetSocketId}`);
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

            // Generate a full long-term Auth Token for the new device
            // Since Device A is authenticated, it can authorize this.
            // In a stricter model, we might just send the creds encrypted.
            // Generating a new token here is easier.

            // Generate a Guest Token for the new device
            // This allows joining the room but not full user access/persistence
            const guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;

            const newToken = jwt.sign(
                {
                    id: guestId,
                    roomId: userId,
                    isGuest: true,
                    scope: 'guest',
                    name: 'Guest Device'
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
            const size = data.size || 0;
            const type = data.type || 'upload'; // 'upload' or 'download'
            const today = new Date().toISOString().split('T')[0];

            logger.info(`REPORT-TRANSFER (${type}): Received from ${socket.id} (User: ${userId}, Guest: ${socket.user.isGuest}). Size: ${size}`);

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
            // Notify others
            socket.to(userId).emit('device-offline', {
                socketId: socket.id,
                deviceId: deviceId
            });
        });
    });


    return io;
};

module.exports = initSocket;
