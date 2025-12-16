import React from 'react';
import { useRegisterForm } from '../../hooks/useRegisterForm';
import styles from '../../styles/AuthShared.module.css';

/**
 * Register Form Component
 * Handles user registration.
 * @returns {JSX.Element} Rendered component
 */
const RegisterForm = () => {
    const {
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
    } = useRegisterForm();

    return (
        <form onSubmit={handleSubmit} className={`d-flex flex-column gap-3 ${styles.authFormContainer}`}>
            <div className="row g-2">
                <div className="col-6">
                    <label className="form-label text-secondary small fw-bold">First Name</label>
                    <input
                        className={`form-control ${styles.authInput} ${touched.firstName && (errors.firstName ? 'is-invalid' : 'is-valid')}`}
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
                        className={`form-control ${styles.authInput} ${touched.lastName && (errors.lastName ? 'is-invalid' : 'is-valid')}`}
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
                        className={`form-control ${styles.authInput} ${touched.confirmPassword && (errors.confirmPassword ? 'is-invalid' : 'is-valid')}`}
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
                className={`btn btn-primary w-100 fw-bold py-2 mt-2 ${styles.authBtnGradient}`}
            >
                {isLoading ? 'Processing...' : 'Create Account'}
            </button>
        </form>
    );
};

export default RegisterForm;
