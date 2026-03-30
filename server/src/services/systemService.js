/**
 * Preview: server/src/services/systemService.js
 * Description: Server business logic service.
 */

const os = require('os');




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
