import { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

export const themes = [
    { id: 'indigo', name: 'Indigo' },
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
    { id: 'ocean', name: 'Ocean' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'forest', name: 'Forest' },
    { id: 'midnight', name: 'Midnight' },
    { id: 'rose', name: 'Rose' },
];

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'indigo');

    useEffect(() => {
        // Remove all theme classes that are NOT the default
        themes.forEach(t => {
            if (t.id !== 'indigo') {
                document.body.classList.remove(`theme-${t.id}`);
            }
        });

        // Add current theme class (if not indigo)
        if (theme !== 'indigo') {
            document.body.classList.add(`theme-${theme}`);
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
