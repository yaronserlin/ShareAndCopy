/**
 * Preview: costant.js
 * Description: ShareAndCopy source file.
 */

export const APP_CONSTANTS = {
    MAX_STORAGE_BYTES: 1024 * 1024 * 1024 * 10, 
    FORBIDDEN_EXTENSIONS: ['.exe', '.sh', '.bat', '.cmd', '.msi', '.bin', '.vbs', '.js', '.jar'],
    REGEX: {
        
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        
        NAME: /^[A-Za-z]+$/,
        
        PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};
