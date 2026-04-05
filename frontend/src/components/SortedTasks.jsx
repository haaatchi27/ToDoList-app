import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function SortedTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('recommended_datetime');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getFlatTasks(sortBy);
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [sortBy]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleToggle = async (id) => {
        try {
            await api.toggleTask(id);
            fetchTasks();
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '未設定';
        const d = new Date(dateStr);
        return d.toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="glass-card" style={{ maxWidth: '800px', margin: 'var(--space-xl) auto', padding: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h1 className="header-title" style={{ fontSize: '1.5rem', margin: 0 }}>📅 期日・推奨一覧</h1>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.history.back()}
                >
                    ◀ 戻る
                </button>
            </div>

            <div className="task-list-controls" style={{ marginBottom: 'var(--space-md)' }}>
                <select
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="recommended_datetime">⭐ 推奨実行日時が近い順</option>
                    <option value="due_date">📅 期限が近い順</option>
                </select>
            </div>

            {error && <p className="text-danger" style={{ color: 'var(--color-danger)' }}>⚠ {error}</p>}

            {loading ? (
                <p>読み込み中…</p>
            ) : tasks.length === 0 ? (
                <p>未完了のタスクがありません。</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {tasks.map(task => (
                        <div key={task.id} className="glass-card" style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <label className="form-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={task.is_completed}
                                    onChange={() => handleToggle(task.id)}
                                />
                            </label>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: '500', fontSize: '1.05rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: 'var(--text-primary)' }}>
                                    {task.parent_title ? <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em', marginRight: '6px' }}>{task.parent_title} &gt;</span> : null}
                                    {task.title}
                                    {task.is_required ? <span style={{ color: 'var(--color-danger)', fontSize: '0.7em', marginLeft: '8px', border: '1px solid currentColor', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>必須</span> : null}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-md)', marginTop: '6px' }}>
                                    <span style={{ color: sortBy === 'recommended_datetime' && task.recommended_datetime ? 'var(--accent-primary)' : 'inherit' }}>
                                        ⭐ 推奨: {formatDate(task.recommended_datetime)}
                                    </span>
                                    <span style={{ color: sortBy === 'due_date' && task.due_date ? 'var(--color-danger)' : 'inherit' }}>
                                        📅 期限: {formatDate(task.due_date)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
