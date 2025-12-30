import React from 'react';
import { useRegisterForm } from '../../hooks/useRegisterForm';
import FormInput from '../../../../components/common/FormInput';
import PasswordInput from '../../../../components/common/PasswordInput';
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
        handleChange,
        handleBlur,
        handleSubmit
    } = useRegisterForm();

    return (
        <form onSubmit={handleSubmit} className={`d-flex flex-column gap-3 ${styles.authFormContainer}`}>
            <div className="row g-2">
                <div className="col-6">
                    <FormInput
                        label="First Name"
                        name="firstName"
                        placeholder="First"
                        value={formData.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.firstName}
                        touched={touched.firstName}
                        required
                        helperText={!errors.firstName ? "Only English letters" : null}
                    />
                </div>
                <div className="col-6">
                    <FormInput
                        label="Last Name"
                        name="lastName"
                        placeholder="Last"
                        value={formData.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.lastName}
                        touched={touched.lastName}
                        required
                        helperText={!errors.lastName ? "Only English letters" : null}
                    />
                </div>
            </div>

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
                placeholder="To keep it secret"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                touched={touched.password}
                required
                helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number"
            />

            <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.confirmPassword}
                touched={touched.confirmPassword}
                required
            />

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
