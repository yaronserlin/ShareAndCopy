/**
 * Prints a fresh VAPID key pair for Web Push, ready to paste into the
 * server's environment. Only the server needs them: clients fetch the
 * public key from `GET /api/push/config`.
 *
 * Run with `npm run generate-vapid`. Generate the pair once per
 * deployment and keep it: replacing it invalidates every existing push
 * subscription, so every device has to opt in again.
 */

const webpush = require('web-push');

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

process.stdout.write([
    '',
    'Add these to the server environment (and VAPID_PUBLIC_KEY to the client build):',
    '',
    `VAPID_PUBLIC_KEY=${publicKey}`,
    `VAPID_PRIVATE_KEY=${privateKey}`,
    'VAPID_SUBJECT=mailto:you@example.com',
    '',
    'The client reads the public key from GET /api/push/config at runtime,',
    'so it needs no build-time configuration of its own.',
    '',
    ''
].join('\n'));
