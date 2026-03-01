import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

export default function Register() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            await api.register({
                username,
                password,
                email,
            });
            setMessage('ユーザーを登録しました！');
            setUsername('');
            setPassword('');
            setEmail('');
        } catch (err) {
            setMessage('登録に失敗しました: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <h2>ユーザー登録</h2>
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
                        <label>メールアドレス</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        {loading ? '登録中...' : '登録実行'}
                    </button>
                </form>
                {message && <p className={`reg-message ${message.includes('失敗') ? 'error-text' : ''}`}>{message}</p>}
                <div className="auth-switch">
                    <Link to="/" className="btn btn-link">
                        ← タスク一覧に戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
