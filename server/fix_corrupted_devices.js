/**
 * One-off maintenance script that removes `authorizedDevices` entries
 * left with an empty `jti` by a since-fixed bug in the socket
 * device-activity flush (see `socket.js`), which corrupted the owning
 * user's document and made every later `save()` on it (login with a
 * device, device revocation, admin promotion) fail with a
 * ValidationError.
 *
 * Dry-run by default: reports which users are affected without writing
 * anything. Pass `--apply` to actually strip the corrupted entries.
 *
 * Usage:
 *   node fix_corrupted_devices.js            # report only
 *   node fix_corrupted_devices.js --apply    # report and fix
 */

const mongoose = require('mongoose');
const path = require('path');
const User = require('./src/models/User');
const logger = require('./src/utils/logger');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apply = process.argv.includes('--apply');

/**
 * Connects to MongoDB, finds every user with a corrupted (empty-`jti`)
 * `authorizedDevices` entry, reports them, and — only when `--apply` is
 * passed — strips just those entries, leaving the rest of each
 * document untouched.
 *
 * @returns {Promise<void>}
 */
const fixCorruptedDevices = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        logger.info('MongoDB Connected');

        const affected = await User.find(
            { 'authorizedDevices.jti': '' },
            { email: 1, authorizedDevices: 1 }
        );

        if (affected.length === 0) {
            logger.info('No corrupted authorizedDevices entries found.');
            process.exit(0);
        }

        logger.info(`Found ${affected.length} user(s) with corrupted device entries:`);
        for (const user of affected) {
            const badCount = user.authorizedDevices.filter(d => !d.jti).length;
            logger.info(`  - ${user.email}: ${badCount} corrupted / ${user.authorizedDevices.length} total device(s)`);
        }

        if (!apply) {
            logger.info('Dry run only (no changes made). Re-run with --apply to fix these users.');
            process.exit(0);
        }

        const result = await User.updateMany(
            {},
            { $pull: { authorizedDevices: { jti: '' } } }
        );
        logger.info(`Fixed ${result.modifiedCount} user document(s).`);

        process.exit(0);
    } catch (err) {
        logger.error('fix_corrupted_devices failed', err);
        process.exit(1);
    }
};

fixCorruptedDevices();
