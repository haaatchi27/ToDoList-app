import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import TaskItem from './components/TaskItem';
import Register from './Register';
import Login from './Login';
import Settings from './Settings';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="app-container">読み込み中…</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

export default function App() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tab state
    const [activeTab, setActiveTab] = useState('task'); // 'task' or 'group'

    // Form state
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState(99);
    const [groupType, setGroupType] = useState('UNRANKED');

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.getTasks();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleCreate = async () => {
        if (!title.trim()) return;
        const isGroup = activeTab === 'group';
        try {
            await api.createTask({
                title: title.trim(),
                due_date: isGroup ? null : (dueDate || null),
                priority: parseInt(priority) || 99,
                is_group: isGroup,
                group_type: isGroup ? groupType : null,
            });
            setTitle('');
            setDueDate('');
            setPriority(99);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.toggleTask(id);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteTask(id);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddChild = async (parentId, data) => {
        try {
            await api.createTask(data);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleReorder = async (parentId, draggedId, targetId) => {
        if (parentId === null) {
            const childIds = tasks.map((c) => c.id);
            const fromIdx = childIds.indexOf(draggedId);
            const toIdx = childIds.indexOf(targetId);
            if (fromIdx === -1 || toIdx === -1) return;
            childIds.splice(fromIdx, 1);
            childIds.splice(toIdx, 0, draggedId);
            try {
                await api.reorderTopLevelTasks(childIds);
                fetchTasks();
            } catch (err) { setError(err.message); }
        } else {
            const findGroup = (items) => {
                for (const item of items) {
                    if (item.id === parentId) return item;
                    if (item.children) {
                        const found = findGroup(item.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            const group = findGroup(tasks);
            if (!group) return;
            const childIds = group.children.map((c) => c.id);
            const fromIdx = childIds.indexOf(draggedId);
            const toIdx = childIds.indexOf(targetId);
            if (fromIdx === -1 || toIdx === -1) return;
            childIds.splice(fromIdx, 1);
            childIds.splice(toIdx, 0, draggedId);
            try {
                await api.reorderTasks(parentId, childIds);
                fetchTasks();
            } catch (err) { setError(err.message); }
        }
    };

    const handleUpdate = async (id, data) => {
        try {
            await api.updateTask(id, data);
            fetchTasks();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/settings" element={
                <ProtectedRoute>
                    <Settings />
                </ProtectedRoute>
            } />
            <Route path="/" element={
                <ProtectedRoute>
                    <div className="app-container">
                        <header className="app-header">
                            <div className="header-top">
                                <Link to="/settings" className="btn btn-ghost btn-sm" title="設定">
                                    ⚙️ 設定
                                </Link>
                                <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                                    ログアウト
                                </button>
                            </div>
                            <h1 className="app-title">ToDoList</h1>
                            <p className="app-subtitle">階層型タスク管理</p>
                        </header>

                        {/* Tabbed Creation Form */}
                        <div className="glass-card task-form-container">
                            <div className="form-tabs">
                                <button
                                    className={`tab-btn ${activeTab === 'task' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('task')}
                                >
                                    タスク作成
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('group')}
                                >
                                    グループ作成
                                </button>
                            </div>
                            <div className="form-content">
                                <div className="form-row">
                                    <input
                                        className="form-input"
                                        placeholder={activeTab === 'task' ? "新しいタスクを追加…" : "新しいグループを追加…"}
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    />
                                    {activeTab === 'task' && (
                                        <>
                                            <input
                                                type="datetime-local"
                                                className="form-input form-input-sm"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                className="form-input form-input-xs"
                                                style={{ width: '80px' }}
                                                placeholder="優先度"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                title="優先度 (数値が小さいほど高い)"
                                            />
                                        </>
                                    )}
                                    {activeTab === 'group' && (
                                        <>
                                            <select
                                                className="form-select"
                                                value={groupType}
                                                onChange={(e) => setGroupType(e.target.value)}
                                            >
                                                <option value="UNRANKED">順位なし</option>
                                                <option value="RANKED">順位付き</option>
                                            </select>
                                            <input
                                                type="number"
                                                className="form-input form-input-xs"
                                                style={{ width: '80px' }}
                                                placeholder="優先度"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                                title="優先度 (数値が小さいほど高い)"
                                            />
                                        </>
                                    )}
                                    <button className="btn btn-primary" onClick={handleCreate}>
                                        追加
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="glass-card" style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
                                <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>⚠ {error}</p>
                            </div>
                        )}

                        <div className="task-list">
                            {loading ? (
                                <div className="task-list-empty">読み込み中…</div>
                            ) : tasks.length === 0 ? (
                                <div className="task-list-empty">タスクがありません。</div>
                            ) : (
                                tasks.map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        onToggle={handleToggle}
                                        onDelete={handleDelete}
                                        onAddChild={handleAddChild}
                                        onReorder={handleReorder}
                                        onUpdate={handleUpdate}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </ProtectedRoute>
            } />
        </Routes>
    );
}
