/**
 * Hook backing {@link module:features/Auth/components/RegisterForm}:
 * field validation state plus the account-creation submit handler.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { useAuthForm } from '../../../hooks/useAuthForm';

/**
 * Manages the registration form's fields and submits a new account to
 * `POST /auth/register`, logging the user in and navigating to the
 * dashboard on success.
 *
 * @returns {Object} Form field state/handlers plus `isValid`, `isLoading`, `showPassword`, and `setShowPassword`.
 */
export const useRegisterForm = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        formData,
        errors,
        touched,
        isValid,
        handleChange,
        handleBlur,
        validateAll
    } = useAuthForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
    }, true);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateAll()) return;

        setIsLoading(true);
        try {
            const payload = { ...formData };
            delete payload.confirmPassword;

            const res = await api.post('/auth/register', payload);
            login(res.data.data.roomId, res.data.data.user?.isAdmin || false, res.data.data.accessToken, res.data.data.refreshToken);
            toast.success('Account created!');
            navigate('/dashboard');
        } catch (err) {
            console.error("Register Error:", err);
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        formData,
        errors,
        touched,
        isValid,
        isLoading,
        showPassword,
        setShowPassword,
        handleChange,
        handleBlur,
        handleSubmit
    };
};
