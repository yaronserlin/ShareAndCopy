/**
 * Theme context: persists the user's light/dark/system preference and
 * applies it to the document, tracking OS theme changes when set to
 * "system".
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

/**
 * Provides the current theme and theme controls to descendant components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element} The context provider wrapping `children`.
 */
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

    useEffect(() => {
        const root = window.document.documentElement;

        /**
         * Resolves "system" to the OS-reported scheme and applies the
         * result to the document's `data-bs-theme` attribute.
         *
         * @param {'light'|'dark'|'system'} targetTheme
         */
        const applyTheme = (targetTheme) => {
            let actualTheme = targetTheme;
            if (targetTheme === 'system') {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    actualTheme = 'dark';
                } else {
                    actualTheme = 'light';
                }
            }
            root.setAttribute('data-bs-theme', actualTheme);
        };

        applyTheme(theme);
        localStorage.setItem('theme', theme);

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme('system');
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

    }, [theme]);

    /** Flips the theme between "light" and "dark" (leaving "system" via direct `setTheme`). */
    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

/** @returns {Object} The current theme context value (theme, setTheme, toggleTheme). */
export const useTheme = () => useContext(ThemeContext);
