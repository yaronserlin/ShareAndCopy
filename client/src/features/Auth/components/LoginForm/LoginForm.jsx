import React from 'react';
import { useLoginForm } from '../../hooks/useLoginForm';
import FormInput from '../../../../components/common/FormInput';
import PasswordInput from '../../../../components/common/PasswordInput';
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
        handleChange,
        handleBlur,
        handleSubmit
    } = useLoginForm();

    return (
        <form onSubmit={handleSubmit} className={`d-flex flex-column gap-3 ${styles.authFormContainer}`}>
            <FormInput
                label="Email Address"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
                touched={touched.email}
                required
            />

            <PasswordInput
                label="Password"
                name="password"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                touched={touched.password}
                required
            />

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
