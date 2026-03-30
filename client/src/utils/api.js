/**
 * Preview: client/src/utils/api.js
 * Description: Frontend application module.
 */

import axios from 'axios';
import API_BASE_URL from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});


api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});


api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    
    if (error.response && error.response.status === 429) {
        window.dispatchEvent(new Event('rate-limit-exceeded'));
    }

    
    return Promise.reject(error);
});

export default api;
