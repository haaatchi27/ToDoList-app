import { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [loading, setLoading] = useState(true);

    const login = useCallback((newToken) => {
        localStorage.setItem('access_token', newToken);
        setToken(newToken);
        // Simplified: just store token, could decode JWT for user info
        setUser({ loggedIn: true });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        if (token) {
            setUser({ loggedIn: true });
        }
        setLoading(false);
    }, [token]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
