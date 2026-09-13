/**
 * Theme context: resolves the user's light/dark preference (stored
 * choice, falling back to the OS scheme) and applies it to the
 * document, tracking OS theme changes until the user makes an explicit
 * choice via {@link toggleTheme}.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

const ThemeContext = createContext();

/** @returns {'dark'|'light'} The OS-reported color scheme. */
const getSystemTheme = () => (
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

/**
 * Provides the current theme and theme controls to descendant components.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element} The context provider wrapping `children`.
 */
export const ThemeProvider = ({ children }) => {
    const hasExplicitPreference = useRef(Boolean(localStorage.getItem('theme')));
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || getSystemTheme());

    useEffect(() => {
        window.document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        if (hasExplicitPreference.current) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => setTheme(e.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    /** Flips the theme between "light" and "dark", marking the choice as explicit (stops following OS changes). */
    const toggleTheme = useCallback(() => {
        hasExplicitPreference.current = true;
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, toggleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

/** @returns {Object} The current theme context value (theme, setTheme, toggleTheme). */
export const useTheme = () => useContext(ThemeContext);
