/**
 * OS-level system information helpers.
 */

const os = require('os');

/**
 * Finds this machine's first non-internal IPv4 address, used to help
 * clients discover the server on a LAN.
 *
 * @returns {string|null} The server's local IP, or `null` if none is found.
 */
exports.getServerIp = () => {
    const interfaces = os.networkInterfaces();
    let serverIp = null;

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
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
