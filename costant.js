export const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: 1024 * 1024 * 1024 * 100, // 1 GB
    FORBIDDEN_EXTENSIONS: ['.exe', '.sh', '.bat', '.cmd', '.msi', '.bin', '.vbs', '.js', '.jar'],
    REGEX: {
        // Simple email regex, can be improved if needed
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        // Only English letters allowed for names
        NAME: /^[A-Za-z]+$/,
        // Password: At least 8 chars, 1 uppercase, 1 lowercase, 1 number
        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};
