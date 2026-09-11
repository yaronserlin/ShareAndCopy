/**
 * Fallback STUN server list returned to clients when no TURN server is
 * configured via environment variables.
 */

module.exports = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'stun:stun1.l.google.com:19302'
        },
        {
            urls: 'stun:stun2.l.google.com:19302'
        },
        {
            urls: 'stun:stun3.l.google.com:19302'
        },
        {
            urls: 'stun:stun4.l.google.com:19302'
        }
    ]
};
