const client = require('prom-client');
const logger = require('./logger');

// Create a Registry to collect metrics
const register = new client.Registry();

// Add default metrics (CPU, Memory, Event Loop, etc.)
client.collectDefaultMetrics({ register });

// --- Custom Metrics ---

// Gauge for Active Socket Connections
const connectedSockets = new client.Gauge({
    name: 'shareandcopy_connected_sockets_total',
    help: 'Total number of active socket.io connections',
    registers: [register]
});

// Counter for Total Data Transferred (Session)
const dataTransferred = new client.Counter({
    name: 'shareandcopy_data_transferred_bytes_total',
    help: 'Total bytes transferred via P2P (reported by clients)',
    registers: [register]
});

// Histogram for API Request Duration
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // Buckets for response time from 0.1s to 10s
    registers: [register]
});

module.exports = {
    register,
    connectedSockets,
    dataTransferred,
    httpRequestDurationMicroseconds
};
