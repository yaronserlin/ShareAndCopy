/**
 * Preview: server/src/utils/metrics.js
 * Description: Server utility helper.
 */

const client = require('prom-client');
const logger = require('./logger');


const register = new client.Registry();


client.collectDefaultMetrics({ register });




const connectedSockets = new client.Gauge({
    name: 'shareandcopy_connected_sockets_total',
    help: 'Total number of active socket.io connections',
    registers: [register]
});


const dataTransferred = new client.Counter({
    name: 'shareandcopy_data_transferred_bytes_total',
    help: 'Total bytes transferred via P2P (reported by clients)',
    registers: [register]
});


const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], 
    registers: [register]
});

module.exports = {
    register,
    connectedSockets,
    dataTransferred,
    httpRequestDurationMicroseconds
};
