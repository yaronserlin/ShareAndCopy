/**
 * Auth screen: switches between login, registration, and device-pairing
 * modes based on the current route and query string.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './components/AuthLayout/AuthLayout';
import LoginForm from './components/LoginForm/LoginForm';
import RegisterForm from './components/RegisterForm/RegisterForm';
import PairingLogin from '../../components/PairingLogin';

/**
 * Renders the login, register, or device-pairing form inside the shared
 * {@link module:features/Auth/components/AuthLayout}.
 *
 * @returns {JSX.Element} The auth screen.
 */
const Auth = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
    const [isPairing, setIsPairing] = useState(false);

    useEffect(() => {
        setIsLogin(location.pathname !== '/register');

        const params = new URLSearchParams(location.search);
        if (params.get('pairingCode')) {
            setIsPairing(true);
        } else {
            setIsPairing(false);
        }
    }, [location]);

    /** Toggles between login and register, or exits pairing mode. */
    const handleSwitchMode = () => {
        if (isPairing) {
            setIsPairing(false);
            navigate('/login');
        } else {
            navigate(isLogin ? '/register' : '/login');
        }
    };

    return (
        <AuthLayout
            title={isPairing ? "Pair New Device" : (isLogin ? "Welcome Back" : "Create Account")}
            subtitle={isPairing ? "Enter the code displayed on your logged-in device." : (isLogin ? 'Login to continue.' : 'Create an account to get started.')}
            onSwitchMode={handleSwitchMode}
            switchText={isPairing ? "Back to Login" : (isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in')}
        >
            {isPairing ? (
                <PairingLogin onCancel={() => setIsPairing(false)} />
            ) : (
                <>
                    {isLogin ? <LoginForm /> : <RegisterForm />}

                    {isLogin && (
                        <div className="text-center mt-3">
                            <button
                                className="btn btn-link text-decoration-none small"
                                onClick={() => setIsPairing(true)}
                            >
                                <i className="bi bi-qr-code me-1"></i>
                                Pair with another device
                            </button>
                        </div>
                    )}
                </>
            )}
        </AuthLayout>
    );
};

export default Auth;
