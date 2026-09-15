/**
 * Preview: server/__tests__/pushService.test.js
 * Description: Push fan-out: category filtering, device exclusion, and the disabled-by-default path.
 */

jest.mock('web-push', () => ({
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn().mockResolvedValue({}),
    generateVAPIDKeys: jest.fn()
}));
jest.mock('../src/models/PushSubscription');

describe('pushService with no VAPID keys configured', () => {
    let pushService;

    beforeEach(() => {
        jest.resetModules();
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
        pushService = require('../src/services/pushService');
    });

    it('reports itself as disabled', () => {
        expect(pushService.isEnabled()).toBe(false);
        expect(pushService.getPublicKey()).toBeNull();
    });

    it('silently delivers nothing instead of throwing', async () => {
        await expect(pushService.sendToUser('user-1', {
            category: 'transfers',
            title: 'x',
            body: 'y'
        })).resolves.toBe(0);
    });
});

describe('pushService with VAPID keys configured', () => {
    let pushService;
    let webpush;
    let PushSubscription;

    const subscription = {
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p', auth: 'a' }
    };

    beforeEach(() => {
        jest.resetModules();
        process.env.VAPID_PUBLIC_KEY = 'test-public-key';
        process.env.VAPID_PRIVATE_KEY = 'test-private-key';

        webpush = require('web-push');
        PushSubscription = require('../src/models/PushSubscription');
        pushService = require('../src/services/pushService');

        jest.clearAllMocks();
    });

    afterAll(() => {
        delete process.env.VAPID_PUBLIC_KEY;
        delete process.env.VAPID_PRIVATE_KEY;
    });

    it('only queries devices that opted in to the category, skipping the device that caused the event', async () => {
        PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([subscription]) });

        const delivered = await pushService.sendToUser('user-1', {
            category: 'transfers',
            title: 'Incoming file',
            body: 'A device is sending you a file.'
        }, { excludeDeviceId: 'device-sender' });

        expect(PushSubscription.find).toHaveBeenCalledWith({
            userId: 'user-1',
            'preferences.transfers': true,
            deviceId: { $ne: 'device-sender' }
        });
        expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
        expect(delivered).toBe(1);
    });

    it('sends the payload the service worker expects', async () => {
        PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([subscription]) });

        await pushService.sendToUser('user-1', {
            category: 'pairing',
            title: 'Pairing request',
            body: 'A device is asking to pair.',
            url: '/dashboard'
        });

        const [, payload] = webpush.sendNotification.mock.calls[0];
        const parsed = JSON.parse(payload);

        expect(parsed).toMatchObject({
            title: 'Pairing request',
            body: 'A device is asking to pair.',
            category: 'pairing',
            url: '/dashboard'
        });
    });

    it('prunes a subscription the push service reports as gone', async () => {
        PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([subscription]) });
        PushSubscription.deleteOne.mockResolvedValue({ deletedCount: 1 });

        const gone = new Error('gone');
        gone.statusCode = 410;
        webpush.sendNotification.mockRejectedValueOnce(gone);

        const delivered = await pushService.sendToUser('user-1', {
            category: 'transfers',
            title: 'x',
            body: 'y'
        });

        expect(delivered).toBe(0);
        expect(PushSubscription.deleteOne).toHaveBeenCalledWith({ endpoint: subscription.endpoint });
    });

    it('never lets a delivery failure escape to the caller', async () => {
        PushSubscription.find.mockReturnValue({ lean: () => Promise.reject(new Error('db down')) });

        await expect(pushService.sendToUser('user-1', {
            category: 'transfers',
            title: 'x',
            body: 'y'
        })).resolves.toBe(0);
    });
});
