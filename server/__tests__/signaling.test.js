const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const User = require('../src/models/User');
const initSocket = require('../src/socket');
const testDb = require('./testDb');

describe('Signaling Server', () => {
    let io, clientSocket1, clientSocket2;
    let server;
    let userA;
    let tokenA;
    let port;

    beforeAll(async () => {
        // Connect to in-memory DB
        await testDb.connect();
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        // Create server and socket for each test to ensure clean state or reuse? 
        // Reusing server is faster, but need to clean up clients.
        // Let's create server once per suite usually, but here we might want to ensure fresh state.
        // Actually, let's keep server running but clear DB.

        // Create a dummy user
        userA = new User({
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@example.com`,
            password: 'hashedpassword',
            roomId: 'room123'
        });
        await userA.save();
        tokenA = jwt.sign({ id: userA._id }, env.JWT_SECRET, { expiresIn: '1h' });

        server = createServer();
        io = initSocket(server);

        await new Promise((resolve) => {
            server.listen(() => {
                port = server.address().port;
                resolve();
            });
        });
    });

    afterEach((done) => {
        // Cleanup clients
        if (clientSocket1) {
            clientSocket1.disconnect();
            clientSocket1 = null;
        }
        if (clientSocket2) {
            clientSocket2.disconnect();
            clientSocket2 = null;
        }

        // Cleanup server
        io.close(() => {
            server.close(() => {
                testDb.clear().then(() => done());
            });
        });
    });

    test('should reject connection without token', (done) => {
        clientSocket1 = new Client(`http://localhost:${port}`);
        clientSocket1.on('connect_error', (err) => {
            expect(err.message).toBe('Authentication error: No token provided');
            done();
        });
    });

    test('should connect successfully with valid token', (done) => {
        clientSocket1 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'device1', deviceName: 'Laptop' }
        });

        clientSocket1.on('connect', () => {
            expect(clientSocket1.id).toBeDefined();
            done();
        });
    });

    test('should broadcast device-online to other devices of same user', (done) => {
        // Device 1 connects
        clientSocket1 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'device1', deviceName: 'Laptop' }
        });

        clientSocket1.on('connect', () => {
            // Device 2 connects
            clientSocket2 = new Client(`http://localhost:${port}`, {
                auth: { token: tokenA },
                query: { deviceId: 'device2', deviceName: 'Phone' }
            });

            // Device 1 should receive notification about Device 2
            clientSocket1.on('device-online', (data) => {
                try {
                    expect(data.deviceId).toBe('device2');
                    expect(data.deviceName).toBe('Phone');
                    done();
                } catch (error) {
                    done(error);
                }
            });
        });
    });

    test('should forward signal event to specific target', (done) => {
        clientSocket1 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'device1' }
        });

        clientSocket2 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'device2' }
        });

        clientSocket1.on('connect', () => {
            clientSocket2.on('connect', () => {
                // Device 1 sends signal to Device 2
                clientSocket1.emit('signal', {
                    targetSocketId: clientSocket2.id,
                    type: 'offer',
                    signalData: { sdp: 'fake-sdp' }
                });
            });
        });

        clientSocket2.on('signal', (data) => {
            try {
                expect(data.senderDeviceId).toBe('device1');
                expect(data.type).toBe('offer');
                expect(data.signalData.sdp).toBe('fake-sdp');
                done();
            } catch (error) {
                done(error);
            }
        });
    });
    test('should prevent signaling between users in different rooms', (done) => {
        // Create User B in different room
        const userB = new User({
            firstName: 'Bob',
            lastName: 'User',
            email: `bob-${Date.now()}@example.com`,
            password: 'hashedpassword',
            roomId: 'room999'
        });

        userB.save().then(() => {
            const tokenB = jwt.sign({ id: userB._id }, env.JWT_SECRET, { expiresIn: '1h' });

            clientSocket1 = new Client(`http://localhost:${port}`, {
                auth: { token: tokenA },
                query: { deviceId: 'deviceA' }
            });

            clientSocket2 = new Client(`http://localhost:${port}`, {
                auth: { token: tokenB },
                query: { deviceId: 'deviceB' }
            });

            let signalReceived = false;

            clientSocket2.on('signal', () => {
                signalReceived = true;
            });

            clientSocket1.on('connect', () => {
                clientSocket2.on('connect', () => {
                    // Try to compromise isolation
                    clientSocket1.emit('signal', {
                        targetSocketId: clientSocket2.id,
                        type: 'offer',
                        signalData: 'attack'
                    });

                    // Wait to ensure NOT received
                    setTimeout(() => {
                        try {
                            expect(signalReceived).toBe(false);
                            done();
                        } catch (e) {
                            done(e);
                        }
                    }, 500);
                });
            });
        });
    });
});

