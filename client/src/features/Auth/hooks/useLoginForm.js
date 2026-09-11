/**
 * Hook backing {@link module:features/Auth/components/LoginForm}: field
 * validation state plus the login submit handler.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { useAuthForm } from '../../../hooks/useAuthForm';
import { getDeviceId, getDeviceName } from '../../../utils/deviceUtils';

/**
 * Manages the login form's fields and submits credentials to
 * `POST /auth/login`, logging the user in and navigating to the
 * dashboard on success.
 *
 * @returns {Object} Form field state/handlers plus `isLoading`, `showPassword`, and `setShowPassword`.
 */
export const useLoginForm = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        formData,
        errors,
        touched,
        handleChange,
        handleBlur,
        validateAll
    } = useAuthForm({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateAll()) return;

        setIsLoading(true);
        try {
            const deviceId = getDeviceId();
            const deviceName = getDeviceName({ email: formData.email });
            const res = await api.post('/auth/login', { ...formData, deviceId, deviceName });
            login(res.data.data.roomId, res.data.data.isAdmin);
            toast.success('Logged in successfully!');
            navigate('/dashboard');
        } catch (err) {
            console.error("Login Error:", err);
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        formData,
        errors,
        touched,
        isLoading,
        showPassword,
        setShowPassword,
        handleChange,
        handleBlur,
        handleSubmit
    };
};
