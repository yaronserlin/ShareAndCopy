const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: 1024 * 1024 * 1024 * 10, // 10 GB
    FORBIDDEN_EXTENSIONS: ['.exe', '.sh', '.bat', '.cmd', '.msi', '.bin', '.vbs', '.js', '.jar'],
    REGEX: {
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        NAME: /^[A-Za-z]+$/,
        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};

module.exports = {
    APP_CONSTANTS,
    MAX_STORAGE_BYTES: APP_CONSTANTS.MAX_STORAGE_BYTES,
    FORBIDDEN_EXTENSIONS: APP_CONSTANTS.FORBIDDEN_EXTENSIONS
};