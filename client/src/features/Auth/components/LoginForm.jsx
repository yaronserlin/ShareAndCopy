import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { validateField } from '../../../utils/validation';
import { useAuthForm } from '../../../hooks/useAuthForm';

const LoginForm = () => {
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
            const res = await api.post('/auth/login', formData);
            login(res.data.token, res.data.roomId);
            toast.success('Logged in successfully!');
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Login Error:", err);
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3 auth-form-container">
            <div>
                <label className="form-label text-secondary small fw-bold">Email Address</label>
                <input
                    className={`form-control auth-input ${touched.email && (errors.email ? 'is-invalid' : 'is-valid')}`}
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
            </div>
            <div>
                <label className="form-label text-secondary small fw-bold">Password</label>
                <div className="input-group">
                    <input
                        className={`form-control auth-input ${touched.password && (errors.password ? 'is-invalid' : 'is-valid')}`}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Your password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                    />
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ zIndex: 0 }}
                    >
                        <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                    </button>
                    {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-100 fw-bold py-2 mt-2 auth-btn-gradient"
            >
                {isLoading ? 'Processing...' : 'Login'}
            </button>
        </form>
    );
};

export default LoginForm;
