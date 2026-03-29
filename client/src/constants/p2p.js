// WebRTC Configuration
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const CHUNK_SIZE = 64 * 1024; // 64KB chunks

// Progress Update Throttling
export const PROGRESS_UPDATE_THRESHOLD = 5; // Update every 5% change
export const PROGRESS_FINAL = 100;

// Cleanup Delays
export const URL_CLEANUP_DELAY = 3000; // 3 seconds before revoking object URLs

// ICE Server Configuration
export const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

// Socket Timeouts
export const SOCKET_DISCONNECT_DELAY = 500; // milliseconds

// Transfer States
export const TRANSFER_STATE = {
    IDLE: 'idle',
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETE: 'complete',
    FAILED: 'failed'
};

// Connection States
export const CONNECTION_STATE = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed',
    CHECKING: 'checking'
};
