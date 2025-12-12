import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import { validateField } from '../../../utils/validation';
import { useAuthForm } from '../../../hooks/useAuthForm';

const RegisterForm = () => {
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
            // Drop confirmPassword from payload
            const payload = { ...formData };
            delete payload.confirmPassword;

            const res = await api.post('/auth/register', payload);
            login(res.data.token, res.data.roomId);
            toast.success('Account created!');
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Register Error:", err);
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3 auth-form-container">
            <div className="row g-2">
                <div className="col-6">
                    <label className="form-label text-secondary small fw-bold">First Name</label>
                    <input
                        className={`form-control auth-input ${touched.firstName && (errors.firstName ? 'is-invalid' : 'is-valid')}`}
                        type="text"
                        name="firstName"
                        placeholder="First"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                    />
                    {errors.firstName ? (
                        <div className="invalid-feedback">{errors.firstName}</div>
                    ) : (
                        <div className="form-text small text-muted">Only English letters</div>
                    )}
                </div>
                <div className="col-6">
                    <label className="form-label text-secondary small fw-bold">Last Name</label>
                    <input
                        className={`form-control auth-input ${touched.lastName && (errors.lastName ? 'is-invalid' : 'is-valid')}`}
                        type="text"
                        name="lastName"
                        placeholder="Last"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                    />
                    {errors.lastName ? (
                        <div className="invalid-feedback">{errors.lastName}</div>
                    ) : (
                        <div className="form-text small text-muted">Only English letters</div>
                    )}
                </div>
            </div>

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
                        placeholder="To keep it secret"
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
                {!errors.password && <div className="form-text small text-muted">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</div>}
            </div>

            <div>
                <label className="form-label text-secondary small fw-bold">Confirm Password</label>
                <div className="input-group">
                    <input
                        className={`form-control auth-input ${touched.confirmPassword && (errors.confirmPassword ? 'is-invalid' : 'is-valid')}`}
                        type={showPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Confirm password"
                        value={formData.confirmPassword}
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
                    {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading || !isValid}
                className="btn btn-primary w-100 fw-bold py-2 mt-2 auth-btn-gradient"
            >
                {isLoading ? 'Processing...' : 'Create Account'}
            </button>
        </form>
    );
};

export default RegisterForm;
