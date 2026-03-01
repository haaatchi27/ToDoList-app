import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.login(username, password);
            login(data.access);
            navigate('/');
        } catch (err) {
            setError('ログインに失敗しました。ユーザー名またはパスワードが正しくありません。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h2>ログイン</h2>
                <form onSubmit={handleSubmit} className="auth-form">
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
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>
                {error && <p className="reg-message error-text">{error}</p>}
                <div className="auth-switch">
                    <span>アカウントをお持ちでないですか？</span>
                    <Link to="/signup" className="btn btn-link">
                        ユーザー登録
                    </Link>
                </div>
            </div>
        </div>
    );
}
