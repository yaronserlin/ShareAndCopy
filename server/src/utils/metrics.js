/**
 * Prometheus metrics registry and custom metrics exposed via the
 * `/metrics` endpoint.
 */

const client = require('prom-client');
const logger = require('./logger');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

/** Current number of active Socket.IO connections. */
const connectedSockets = new client.Gauge({
    name: 'shareandcopy_connected_sockets_total',
    help: 'Total number of active socket.io connections',
    registers: [register]
});

/** Total bytes transferred peer-to-peer, as self-reported by clients. */
const dataTransferred = new client.Counter({
    name: 'shareandcopy_data_transferred_bytes_total',
    help: 'Total bytes transferred via P2P (reported by clients)',
    registers: [register]
});

/** HTTP request duration histogram, labeled by method/route/status code. */
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
