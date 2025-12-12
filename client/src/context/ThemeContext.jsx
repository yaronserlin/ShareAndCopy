import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = (targetTheme) => {
            let actualTheme = targetTheme;
            if (targetTheme === 'system') {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    actualTheme = 'dark';
                } else {
                    actualTheme = 'light';
                }
            }
            // Bootstrap native dark mode
            root.setAttribute('data-bs-theme', actualTheme);
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);

        // Listen for system changes if in system mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
