/**
 * Constants governing the WebRTC peer-to-peer file transfer pipeline:
 * size limits, chunking, progress reporting, and connection state enums.
 */

/** Largest file, in bytes, that a transfer will accept (500 MiB). */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;
/** Size, in bytes, of each chunk streamed over the data channel. */
export const CHUNK_SIZE = 64 * 1024;

/** Minimum percentage-point delta before a progress update is emitted. */
export const PROGRESS_UPDATE_THRESHOLD = 5;
/** Progress value representing a fully completed transfer. */
export const PROGRESS_FINAL = 100;

/** Delay, in ms, before a completed transfer's object URL is revoked. */
export const URL_CLEANUP_DELAY = 3000;

/** Fallback STUN servers used when the server does not supply ICE servers. */
export const DEFAULT_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
];

/** Delay, in ms, before disconnecting an idle socket. */
export const SOCKET_DISCONNECT_DELAY = 500;

/** Lifecycle states of a single file transfer. */
export const TRANSFER_STATE = {
    IDLE: 'idle',
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETE: 'complete',
    FAILED: 'failed'
};


/** Lifecycle states of the peer-to-peer connection. */
export const CONNECTION_STATE = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    FAILED: 'failed',
    CHECKING: 'checking'
};
