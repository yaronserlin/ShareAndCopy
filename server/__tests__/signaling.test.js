/**
 * Preview: server/__tests__/signaling.test.js
 * Description: Test suite for ShareAndCopy functionality.
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const User = require('../src/models/User');
const initSocket = require('../src/socket');
const testDb = require('./testDb');
const pairingStore = require('../src/utils/pairingStore');

describe('Signaling Server', () => {
    let io, clientSocket1, clientSocket2;
    let server;
    let userA;
    let tokenA;
    let port;

    beforeAll(async () => {
        
        await testDb.connect();
    });

    afterAll(async () => {
        await testDb.close();
    });

    beforeEach(async () => {
        
        
        
        

        
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
        
        if (clientSocket1) {
            clientSocket1.disconnect();
            clientSocket1 = null;
        }
        if (clientSocket2) {
            clientSocket2.disconnect();
            clientSocket2 = null;
        }

        
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
        
        clientSocket1 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'device1', deviceName: 'Laptop' }
        });

        clientSocket1.on('connect', () => {
            
            clientSocket2 = new Client(`http://localhost:${port}`, {
                auth: { token: tokenA },
                query: { deviceId: 'device2', deviceName: 'Phone' }
            });

            
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
                    
                    clientSocket1.emit('signal', {
                        targetSocketId: clientSocket2.id,
                        type: 'offer',
                        signalData: 'attack'
                    });

                    
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

    test('approves a pairing request even though its code was already redeemed via verify-pairing', (done) => {
        const code = 'ABC123';

        clientSocket1 = new Client(`http://localhost:${port}`, {
            auth: { token: tokenA },
            query: { deviceId: 'deviceA' }
        });

        clientSocket1.on('pairing-error', (payload) => {
            done(new Error(`approve-pairing was unexpectedly rejected: ${payload?.message}`));
        });

        clientSocket1.on('confirmation-request', ({ socketId }) => {
            clientSocket1.emit('approve-pairing', { targetSocketId: socketId, code });
        });

        clientSocket1.on('connect', () => {
            const pairingToken = jwt.sign(
                { id: userA._id.toString(), scope: 'pairing', code },
                env.JWT_SECRET,
                { expiresIn: 60 * 5 }
            );
            pairingStore.set(code, userA._id.toString(), pairingToken, 60 * 5 * 1000);

            clientSocket1.emit('join-pairing', code);

            // Simulates the second device's POST /auth/verify-pairing,
            // which redeems the code (and, before the fix, deleted its
            // pairingStore entry outright) before the owning device ever
            // gets a chance to approve it.
            const redeemed = pairingStore.consume(code);
            expect(redeemed).toBeTruthy();

            clientSocket2 = new Client(`http://localhost:${port}`, {
                auth: { token: redeemed.token }
            });

            clientSocket2.on('connect', () => {
                clientSocket2.emit('request-pairing', {
                    code,
                    deviceInfo: { model: 'Test Phone', os: 'TestOS' }
                });
            });

            clientSocket2.on('pairing-success', ({ token, user }) => {
                try {
                    expect(token).toEqual(expect.any(String));
                    expect(user.roomId).toBe(userA._id.toString());
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
    });
});

