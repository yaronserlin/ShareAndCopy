import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './components/AuthLayout/AuthLayout';
import LoginForm from './components/LoginForm/LoginForm';
import RegisterForm from './components/RegisterForm/RegisterForm';
import BackgroundDecorations from '../../components/common/BackgroundDecorations';

const Auth = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(location.pathname !== '/register');

    useEffect(() => {
        setIsLogin(location.pathname !== '/register');
    }, [location]);

    const handleSwitchMode = () => {
        navigate(isLogin ? '/register' : '/login');
    };

    return (
        <>
            <BackgroundDecorations />
            <AuthLayout
                title={isLogin ? "Welcome Back" : "Create Account"}
                subtitle={isLogin ? 'Login to continue.' : 'Create an account to get started.'}
                onSwitchMode={handleSwitchMode}
                switchText={isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            >
                {isLogin ? <LoginForm /> : <RegisterForm />}
            </AuthLayout>
        </>
    );
};

export default Auth;
