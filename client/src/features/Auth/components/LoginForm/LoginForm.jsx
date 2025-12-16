import React from 'react';
import { useLoginForm } from '../../hooks/useLoginForm';
import styles from '../../styles/AuthShared.module.css';

/**
 * Login Form Component
 * Handles user login.
 * @returns {JSX.Element} Rendered component
 */
const LoginForm = () => {
    const {
        formData,
        errors,
        touched,
        isLoading,
        showPassword,
        setShowPassword,
        handleChange,
        handleBlur,
        handleSubmit
    } = useLoginForm();

    return (
        <form onSubmit={handleSubmit} className={`d-flex flex-column gap-3 ${styles.authFormContainer}`}>
            <div>
                <label className="form-label text-secondary small fw-bold">Email Address</label>
                <input
                    className={`form-control ${styles.authInput} ${touched.email && (errors.email ? 'is-invalid' : 'is-valid')}`}
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
                        className={`form-control ${styles.authInput} ${touched.password && (errors.password ? 'is-invalid' : 'is-valid')}`}
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
                className={`btn btn-primary w-100 fw-bold py-2 mt-2 ${styles.authBtnGradient}`}
            >
                {isLoading ? 'Processing...' : 'Login'}
            </button>
        </form>
    );
};

export default LoginForm;
