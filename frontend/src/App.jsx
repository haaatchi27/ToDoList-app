import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import TaskItem from './components/TaskItem';
import Register from './Register';
import Login from './Login';
import Settings from './Settings';
import DailySummary from './components/DailySummary';
import SortedTasks from './components/SortedTasks';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="app-container">読み込み中…</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

export default function App() {
    const { user, logout, token } = useAuth();
    const { setTheme } = useTheme();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Sync theme from backend once authenticated
    useEffect(() => {
        if (token) {
            api.getProfile()
                .then(data => {
                    if (data.theme) {
                        setTheme(data.theme);
                    }
                })
                .catch(e => console.error("Theme sync failed:", e));
        }
    }, [token, setTheme]);

    // Tab state
    const [activeTab, setActiveTab] = useState(null); // 'task', 'group', or null

    // Form state
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [recommendedDate, setRecommendedDate] = useState('');
    const [isRequired, setIsRequired] = useState(true);
    const [priority, setPriority] = useState(99);
    const [groupType, setGroupType] = useState('UNRANKED');

    const handleDateFocus = (setter, currentValue) => {
        if (!currentValue) {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            setter(`${year}-${month}-${day}T00:00`);
        }
    };

    // Filter state
    const [showCompleted, setShowCompleted] = useState(() => {
        const saved = localStorage.getItem('showCompleted');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [showFailed, setShowFailed] = useState(() => {
        const saved = localStorage.getItem('showFailed');
        return saved !== null ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('showCompleted', JSON.stringify(showCompleted));
    }, [showCompleted]);

    useEffect(() => {
        localStorage.setItem('showFailed', JSON.stringify(showFailed));
    }, [showFailed]);

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

        if (dueDate && recommendedDate && new Date(recommendedDate) > new Date(dueDate)) {
            setError("推奨実行日時は期限より前である必要があります。");
            return;
        }

        const isGroup = activeTab === 'group';
        try {
            await api.createTask({
                title: title.trim(),
                due_date: isGroup ? null : (dueDate || null),
                recommended_datetime: isGroup ? null : (recommendedDate || null),
                is_required: isRequired,
                priority: parseInt(priority) || 1000,
                is_group: isGroup,
                group_type: groupType,
            });
            setTitle('');
            setDueDate('');
            setRecommendedDate('');
            setIsRequired(true);
            setPriority(99);
            setGroupType('UNRANKED');
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
            <Route path="/daily-summary" element={
                <ProtectedRoute>
                    <DailySummary />
                </ProtectedRoute>
            } />
            <Route path="/sorted-tasks" element={
                <ProtectedRoute>
                    <SortedTasks />
                </ProtectedRoute>
            } />
            <Route path="/" element={
                <ProtectedRoute>
                    <div className="app-container">
                        <header className="app-header">
                            <div className="header-top">
                                <Link to="/sorted-tasks" className="btn btn-ghost btn-sm mr-xs" title="期日順ソート">
                                    📅 期日・推奨一覧
                                </Link>
                                <Link to="/daily-summary" className="btn btn-ghost btn-sm mr-xs" title="日別まとめ">
                                    📝 日別まとめ
                                </Link>
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
                                    onClick={() => setActiveTab(activeTab === 'task' ? null : 'task')}
                                >
                                    タスク作成
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
                                    onClick={() => setActiveTab(activeTab === 'group' ? null : 'group')}
                                >
                                    グループ作成
                                </button>
                            </div>
                            {activeTab && (
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
                                                <label className="form-label-inline">
                                                    <span>📅 期限:</span>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input form-input-sm"
                                                        value={dueDate}
                                                        onChange={(e) => setDueDate(e.target.value)}
                                                        onFocus={() => handleDateFocus(setDueDate, dueDate)}
                                                        onClick={() => handleDateFocus(setDueDate, dueDate)}
                                                        title="期限"
                                                    />
                                                </label>
                                                <label className="form-label-inline">
                                                    <span>⭐ 推奨:</span>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input form-input-sm"
                                                        value={recommendedDate}
                                                        onChange={(e) => setRecommendedDate(e.target.value)}
                                                        onFocus={() => handleDateFocus(setRecommendedDate, recommendedDate)}
                                                        onClick={() => handleDateFocus(setRecommendedDate, recommendedDate)}
                                                        title="推奨実行日時"
                                                    />
                                                </label>
                                                <label className="form-checkbox-label" title="必須タスク">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRequired}
                                                        onChange={(e) => setIsRequired(e.target.checked)}
                                                    />
                                                    必須
                                                </label>
                                                <label className="form-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={groupType === 'RANKED'}
                                                        onChange={(e) => setGroupType(e.target.checked ? 'RANKED' : 'UNRANKED')}
                                                    />
                                                    順位付き
                                                </label>

                                                {/* ここの表示・非表示を設定する。 */}
                                                {groupType === 'RANKED' && (
                                                    <input
                                                        type="number"
                                                        className="form-input form-input-xs"
                                                        style={{ width: '80px' }}
                                                        placeholder="優先度"
                                                        value={priority}
                                                        onChange={(e) => setPriority(e.target.value)}
                                                        title="優先度 (数値が小さいほど高い)"
                                                    />
                                                )}
                                            </>
                                        )}
                                        {activeTab === 'group' && (
                                            <>
                                                <label className="form-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={groupType === 'RANKED'}
                                                        onChange={(e) => setGroupType(e.target.checked ? 'RANKED' : 'UNRANKED')}
                                                    />
                                                    順位付き
                                                </label>
                                                {/* ここの表示・非表示を設定する。 */}
                                                {groupType === 'RANKED' && (
                                                    <input
                                                        type="number"
                                                        className="form-input form-input-xs"
                                                        style={{ width: '80px' }}
                                                        placeholder="優先度"
                                                        value={priority}
                                                        onChange={(e) => setPriority(e.target.value)}
                                                        title="優先度 (数値が小さいほど高い)"
                                                    />
                                                )}

                                            </>
                                        )}
                                        <button className="btn btn-primary" onClick={handleCreate}>
                                            追加
                                        </button>
                                    </div>
                                </div>
                            )}
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
                                        parentGroupType={null}
                                        showCompleted={showCompleted}
                                        showFailed={showFailed}
                                    />
                                ))
                            )}
                        </div>

                        <div className="task-list-controls" style={{ marginTop: 'var(--space-2xl)', display: 'flex', justifyContent: 'center' }}>
                            <button
                                className={`btn btn-sm ${showFailed ? 'btn-ghost' : 'btn-primary'} mr-xs`}
                                onClick={() => setShowFailed(!showFailed)}
                            >
                                {showFailed ? '✖ 失敗を非表示' : '👁 失敗を表示'}
                            </button>
                            <button
                                className={`btn btn-sm ${showCompleted ? 'btn-ghost' : 'btn-primary'}`}
                                onClick={() => setShowCompleted(!showCompleted)}
                            >
                                {showCompleted ? '✓ 完了を非表示' : '👁 完了を表示'}
                            </button>
                        </div>
                    </div>
                </ProtectedRoute>
            } />
        </Routes>
    );
}
