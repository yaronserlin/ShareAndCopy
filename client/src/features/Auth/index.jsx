import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import API_BASE_URL from '../../config';
import './styles/Auth.css';

const Auth = () => {
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(location.pathname !== '/register');

    React.useEffect(() => {
        setIsLogin(location.pathname !== '/register');
    }, [location]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const passwordLength = 8;

    const validateField = (name, value) => {
        let error = null;
        switch (name) {
            case 'firstName':
            case 'lastName':
                if (!value) error = 'Required';
                else if (!/^[A-Za-z]+$/.test(value)) error = 'Only English letters allowed';
                break;
            case 'email':
                if (!value) error = 'Required';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email address';
                break;
            case 'password':
                if (!value) error = 'Required';
                else if (!isLogin) {
                    if (value.length < passwordLength) error = `At least ${passwordLength} characters`;
                    else if (!/[A-Z]/.test(value)) error = 'At least 1 uppercase letter';
                    else if (!/[a-z]/.test(value)) error = 'At least 1 lowercase letter';
                    else if (!/[0-9]/.test(value)) error = 'At least 1 number';
                }
                break;
            case 'confirmPassword':
                if (!value) error = 'Required';
                else if (value !== password) error = 'Passwords do not match';
                break;
            default:
                break;
        }
        return error;
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched({ ...touched, [name]: true });
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Update state based on name
        if (name === 'firstName') setFirstName(value);
        if (name === 'lastName') setLastName(value);
        if (name === 'email') setEmail(value);
        if (name === 'password') setPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);

        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    // Special handler for password changes affecting confirm password validation
    React.useEffect(() => {
        if (!isLogin && touched.confirmPassword) {
            const error = validateField('confirmPassword', confirmPassword);
            setErrors(prev => ({ ...prev, confirmPassword: error }));
        }
    }, [password, confirmPassword, touched]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all fields
        const newErrors = {};
        if (!isLogin) {
            newErrors.firstName = validateField('firstName', firstName);
            newErrors.lastName = validateField('lastName', lastName);
            newErrors.confirmPassword = validateField('confirmPassword', confirmPassword);
        }
        newErrors.email = validateField('email', email);
        newErrors.password = validateField('password', password);

        // Remove nulls
        Object.keys(newErrors).forEach(key => newErrors[key] === null && delete newErrors[key]);

        setErrors(newErrors);
        setTouched({
            firstName: true, lastName: true, email: true, password: true, confirmPassword: true
        });

        if (Object.keys(newErrors).length > 0) {
            return; // Stop if errors
        }

        setIsLoading(true);
        const endpoint = isLogin ? 'login' : 'register';
        const payload = isLogin ? { email, password } : { email, password, firstName, lastName };

        try {
            // const res = await axios.post(`http://169.254.171.173:5001/api/auth/${endpoint}`, payload);
            const res = await axios.post(`${API_BASE_URL}/auth/${endpoint}`, payload);

            login(res.data.token, res.data.roomId);
            toast.success(isLogin ? 'Logged in successfully!' : 'Account created!');
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Auth Error:", err);
            toast.error(err.response?.data?.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="d-flex justify-content-center align-items-center vh-100 position-relative overflow-hidden">
            {/* Background Decorations */}
            <div className="auth-blob auth-blob-1"></div>
            <div className="auth-blob auth-blob-2"></div>
            <div className="auth-blob auth-blob-3"></div>

            <div className="position-relative z-1 w-100 p-4 p-md-5 glass-panel rounded-4 m-3 auth-card">
                <div className="text-center mb-4">
                    <h2 className="display-6 fw-bold mb-2">
                        Share & Copy
                    </h2>
                    <p className="text-secondary small">
                        {isLogin ? 'Welcome back! Login to continue.' : 'Create an account to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="d-flex flex-column gap-3 auth-form-container" key={isLogin ? 'login' : 'register'}>
                    {!isLogin && (
                        <div className="row g-2">
                            <div className="col-6">
                                <label className="form-label text-secondary small fw-bold">First Name</label>
                                <input
                                    className={`form-control auth-input ${touched.firstName && (errors.firstName ? 'is-invalid' : 'is-valid')}`}
                                    type="text"
                                    name="firstName"
                                    placeholder="First"
                                    value={firstName}
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
                                    value={lastName}
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
                    )}

                    <div>
                        <label className="form-label text-secondary small fw-bold">Email Address</label>
                        <input
                            className={`form-control auth-input ${touched.email && (errors.email ? 'is-invalid' : 'is-valid')}`}
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={email}
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
                                value={password}
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
                        {!isLogin && !errors.password && <div className="form-text small text-muted">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</div>}
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="form-label text-secondary small fw-bold">Confirm Password</label>
                            <div className="input-group">
                                <input
                                    className={`form-control auth-input ${touched.confirmPassword && (errors.confirmPassword ? 'is-invalid' : 'is-valid')}`}
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
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
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary w-100 fw-bold py-2 mt-2 auth-btn-gradient"
                    >
                        {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        className="btn btn-link text-secondary text-decoration-none small"
                        onClick={() => navigate(isLogin ? '/register' : '/login')}
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
