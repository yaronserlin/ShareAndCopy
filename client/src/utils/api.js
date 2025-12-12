import axios from 'axios';
import API_BASE_URL from '../config';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Response Interceptor: Handle Global Errors (Optional)
api.interceptors.response.use((response) => {
    return response;
}, (error) => {
    // We can handle 401s here specifically if needed (e.g. redirect to login)
    return Promise.reject(error);
});

export default api;
