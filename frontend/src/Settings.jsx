import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import { useTheme, themes as availableThemes } from './ThemeContext';

export default function Settings() {
    const navigate = useNavigate();
    const { theme: currentTheme, setTheme } = useTheme();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await api.getProfile();
                setProfile(data);
            } catch (err) {
                setError('プロフィールの取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-top">
                    <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm">
                        ← 戻る
                    </button>
                </div>
                <h1 className="app-title">設定</h1>
                <p className="app-subtitle">個人設定と外観</p>
            </header>

            <div className="settings-content">
                <section className="glass-card settings-section">
                    <h3>ユーザープロフィール</h3>
                    {loading ? (
                        <p className="text-muted">読み込み中…</p>
                    ) : error ? (
                        <p className="error-text">{error}</p>
                    ) : (
                        <div className="profile-info">
                            <div className="info-group">
                                <label>ユーザー名</label>
                                <p>{profile.username}</p>
                            </div>
                            <div className="info-group">
                                <label>メールアドレス</label>
                                <p>{profile.email || '未設定'}</p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="glass-card settings-section">
                    <h3>テーマ設定</h3>
                    <p className="text-muted mb-md">アプリケーションの外観を選択してください。</p>
                    <div className="theme-grid">
                        {availableThemes.map(t => (
                            <div
                                key={t.id}
                                className={`theme-option ${currentTheme === t.id ? 'active' : ''}`}
                                onClick={() => setTheme(t.id)}
                            >
                                <div className={`theme-preview ${t.id}`}></div>
                                <span>{t.name}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <style>{`
                .settings-content {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-lg);
                }
                .settings-section h3 {
                    margin-bottom: var(--space-md);
                    font-size: 1.1rem;
                    color: var(--text-primary);
                }
                .profile-info {
                    display: grid;
                    gap: var(--space-md);
                }
                .info-group label {
                    display: block;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-bottom: 2px;
                }
                .info-group p {
                    font-size: 1rem;
                    font-weight: 500;
                }
                .text-muted { color: var(--text-muted); }
                .mb-md { margin-bottom: var(--space-md); }
                
                .theme-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: var(--space-md);
                }
                .theme-option {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--space-sm);
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    background: var(--bg-input);
                    border: 2px solid transparent;
                }
                .theme-option:hover {
                    background: var(--bg-card-hover);
                }
                .theme-option.active {
                    border-color: var(--accent-primary);
                    background: var(--bg-card-hover);
                }
                .theme-preview {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                }
                .theme-preview.indigo { background: #6366f1; }
                .theme-preview.ocean { background: #06b6d4; }
                .theme-preview.sunset { background: #f43f5e; }
                .theme-preview.forest { background: #10b981; }
                .theme-option span {
                    font-size: 0.85rem;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
}
