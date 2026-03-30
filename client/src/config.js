// /**
//  * Preview: client/src/config.js
//  * Description: Frontend application module.
//  */

const SERVER_PORT = import.meta.env.VITE_SERVER_PORT || 5001;


export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:' + SERVER_PORT;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
    `${import.meta.env.VITE_SERVER_URL || 'http://localhost:' + SERVER_PORT}/api`

export default API_BASE_URL;