const os = require('os');

/**
 * Service for System operations
 * @module services/systemService
 */

/**
 * Get server's local IPv4 address
 * @returns {string|null} IP address or null if not found
 */
exports.getServerIp = () => {
    const interfaces = os.networkInterfaces();
    let serverIp = null;

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if ('IPv4' !== iface.family || iface.internal) {
                continue;
            }
            serverIp = iface.address;
            break;
        }
        if (serverIp) break;
    }

    return serverIp;
};
