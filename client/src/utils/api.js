/**
 * Shared axios instance for all REST calls to the backend. Sends
 * credentials (cookies) with every request and broadcasts a
 * `rate-limit-exceeded` window event on HTTP 429 responses.
 */

import axios from 'axios';
import { API_BASE_URL } from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
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
