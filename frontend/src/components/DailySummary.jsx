import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function DailySummary() {
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedDates, setExpandedDates] = useState({});

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            const data = await api.getDailySummary();
            setSummary(data);
        } catch (err) {
            console.error(err);
            setError('日別のまとめデータを取得できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (date) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    if (loading) return <div className="app-container"><p>読み込み中…</p></div>;
    if (error) return <div className="app-container"><p className="text-danger">{error}</p></div>;

    return (
        <div className="glass-card" style={{ maxWidth: '800px', margin: 'var(--space-xl) auto', padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h1 className="header-title" style={{ fontSize: '1.5rem', margin: 0 }}>📝 日別タスクまとめ</h1>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.history.back()}
                >
                    ◀ 戻る
                </button>
            </div>

            {summary.length === 0 ? (
                <p>完了または失敗したタスクはまだありません。</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {summary.map((day) => {
                        const isExpanded = expandedDates[day.date] || false;
                        return (
                            <div key={day.date} className="glass-card" style={{ padding: 'var(--space-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>{day.date}</h2>
                                        <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xs)', fontSize: '0.9rem' }}>
                                            <span style={{ color: 'var(--accent-primary)' }}>✅ 完了: {day.completed_count}</span>
                                            <span style={{ color: 'var(--color-danger)' }}>✖ 失敗: {day.failed_count}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => toggleExpand(day.date)}
                                    >
                                        {isExpanded ? '詳細を隠す ▲' : '詳細を見る ▼'}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)' }}>
                                        {day.completed_tasks.length > 0 && (
                                            <div style={{ marginBottom: 'var(--space-sm)' }}>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: 'var(--space-xs)' }}>完了タスク</h3>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {day.completed_tasks.map(task => (
                                                        <li key={task.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            ✓ {task.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {day.failed_tasks.length > 0 && (
                                            <div>
                                                <h3 style={{ fontSize: '1rem', color: 'var(--color-danger)', marginBottom: 'var(--space-xs)' }}>失敗タスク</h3>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {day.failed_tasks.map(task => (
                                                        <li key={task.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                                                            ✖ {task.title}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {day.completed_tasks.length === 0 && day.failed_tasks.length === 0 && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>詳細なタスク情報がありません。</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
