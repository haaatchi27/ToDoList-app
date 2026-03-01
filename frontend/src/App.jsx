import { useState, useCallback, useEffect } from 'react';
import { api } from './api';
import TaskItem from './components/TaskItem';

export default function App() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Top-level form state
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [groupType, setGroupType] = useState('UNRANKED');

    const fetchTasks = useCallback(async () => {
        try {
            const data = await api.getTasks();
            setTasks(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleCreateTask = async () => {
        if (!title.trim()) return;
        try {
            await api.createTask({
                title: title.trim(),
                due_date: dueDate || null,
                is_group: isGroup,
                group_type: isGroup ? groupType : null,
            });
            setTitle('');
            setDueDate('');
            setIsGroup(false);
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
            // Reorder top-level tasks
            const childIds = tasks.map((c) => c.id);
            const fromIdx = childIds.indexOf(draggedId);
            const toIdx = childIds.indexOf(targetId);
            if (fromIdx === -1 || toIdx === -1) return;

            childIds.splice(fromIdx, 1);
            childIds.splice(toIdx, 0, draggedId);

            try {
                await api.reorderTopLevelTasks(childIds);
                fetchTasks();
            } catch (err) {
                setError(err.message);
            }
        } else {
            // Reorder children within a group
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
            } catch (err) {
                setError(err.message);
            }
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

    return (
        <div className="app-container">
            <header className="app-header">
                <h1 className="app-title">ToDoList</h1>
                <p className="app-subtitle">階層型タスク管理</p>
            </header>

            {/* Create task form */}
            <div className="glass-card task-form">
                <div className="form-row">
                    <input
                        id="task-title-input"
                        className="form-input"
                        placeholder="新しいタスクを追加…"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                    />
                    <input
                        id="task-due-input"
                        type="datetime-local"
                        className="form-input form-input-sm"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                    <button id="task-create-btn" className="btn btn-primary" onClick={handleCreateTask}>
                        追加
                    </button>
                </div>
                <div className="form-row">
                    <label className="form-checkbox-label">
                        <input
                            type="checkbox"
                            checked={isGroup}
                            onChange={(e) => setIsGroup(e.target.checked)}
                        />
                        グループタスクとして作成
                    </label>
                    {isGroup && (
                        <select
                            className="form-select"
                            value={groupType}
                            onChange={(e) => setGroupType(e.target.value)}
                        >
                            <option value="UNRANKED">順位なし</option>
                            <option value="RANKED">順位付き</option>
                        </select>
                    )}
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="glass-card" style={{ borderColor: 'var(--color-danger)', marginBottom: 'var(--space-md)' }}>
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>⚠ {error}</p>
                </div>
            )}

            {/* Task list */}
            {loading ? (
                <div className="task-list-empty">
                    <div className="task-list-empty-icon">⏳</div>
                    <p>読み込み中…</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="task-list-empty">
                    <div className="task-list-empty-icon">📋</div>
                    <p>タスクがありません。新しいタスクを追加してみましょう！</p>
                </div>
            ) : (
                <div className="task-list">
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            onReorder={handleReorder}
                            onUpdate={handleUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
