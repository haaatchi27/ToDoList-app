import React, { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Register({ onSwitchToLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { register } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(username, password, email);
        } catch (err) {
            setError('登録に失敗しました。このユーザー名は既に使用されている可能性があります。');
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h2>新規登録</h2>
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
                        <label>メールアドレス</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    <button type="submit" className="btn btn-primary btn-block">登録</button>
                </form>
                <p className="auth-switch">
                    既にアカウントをお持ちですか？ <button className="btn-link" onClick={onSwitchToLogin}>ログイン</button>
                </p>
            </div>
        </div>
    );
}
