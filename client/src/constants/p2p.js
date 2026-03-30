/**
 * Preview: client/src/constants/p2p.js
 * Description: Frontend application module.
 */

export const MAX_FILE_SIZE = 500 * 1024 * 1024; 
export const CHUNK_SIZE = 64 * 1024; 


export const PROGRESS_UPDATE_THRESHOLD = 5; 
export const PROGRESS_FINAL = 100;


export const URL_CLEANUP_DELAY = 3000; 


export const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];


export const SOCKET_DISCONNECT_DELAY = 500; 


export const TRANSFER_STATE = {
    IDLE: 'idle',
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETE: 'complete',
    FAILED: 'failed'
};


export const CONNECTION_STATE = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed',
    CHECKING: 'checking'
};
