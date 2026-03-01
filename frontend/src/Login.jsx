import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login({ onSwitchToRegister }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(username, password);
        } catch (err) {
            setError('ログインに失敗しました。ユーザー名またはパスワードを確認してください。');
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h2>ログイン</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>ユーザー名</label>
                        <input
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>パスワード</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    <button type="submit" className="btn btn-primary btn-block">ログイン</button>
                </form>
                <p className="auth-switch">
                    アカウントをお持ちでないですか？ <button className="btn-link" onClick={onSwitchToRegister}>新規登録</button>
                </p>
            </div>
        </div>
    );
}
