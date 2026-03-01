import { useState, useRef } from 'react';

/**
 * Recursive TaskItem component for rendering hierarchical tasks.
 * Supports groups, ordering (drag & drop), expand/collapse, and inline child creation.
 */
export default function TaskItem({ task, onToggle, onDelete, onAddChild, onReorder, onUpdate, depth = 0 }) {
    const [expanded, setExpanded] = useState(true);
    const [showAddChild, setShowAddChild] = useState(false);
    const [childTitle, setChildTitle] = useState('');
    const [childDueDate, setChildDueDate] = useState('');
    const [childIsGroup, setChildIsGroup] = useState(false);
    const [childGroupType, setChildGroupType] = useState('UNRANKED');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDueDate, setEditDueDate] = useState('');

    const dragRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const isGroup = task.is_group;
    const children = task.children || [];
    const isRanked = task.group_type === 'RANKED';
    const progressPercent = task.completion_total > 0
        ? Math.round((task.completion_completed / task.completion_total) * 100)
        : 0;

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    };

    const getDueStatus = (dateStr) => {
        if (!dateStr) return '';
        const now = new Date();
        const due = new Date(dateStr);
        const diffMs = due - now;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffMs < 0) return 'overdue';
        if (diffDays <= 3) return 'soon';
        return '';
    };

    const handleAddChild = () => {
        if (!childTitle.trim()) return;
        onAddChild(task.id, {
            title: childTitle.trim(),
            parent: task.id,
            due_date: childDueDate || null,
            is_group: childIsGroup,
            group_type: childIsGroup ? childGroupType : null,
        });
        setChildTitle('');
        setChildDueDate('');
        setChildIsGroup(false);
        setShowAddChild(false);
    };

    // Helper to format date for datetime-local input
    const toLocalDateTimeString = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleEditStart = (e) => {
        e.stopPropagation();
        setEditTitle(task.title);
        setEditDueDate(toLocalDateTimeString(task.due_date));
        setIsEditing(true);
    };

    const handleEditSave = () => {
        const updates = {};
        if (editTitle.trim() && editTitle !== task.title) {
            updates.title = editTitle.trim();
        }
        const newDueDate = editDueDate || null;
        const oldDueDate = task.due_date ? toLocalDateTimeString(task.due_date) : '';
        if (editDueDate !== oldDueDate) {
            updates.due_date = newDueDate;
        }

        if (Object.keys(updates).length > 0) {
            onUpdate(task.id, updates);
        }
        setIsEditing(false);
    };

    const handleEditCancel = () => {
        setIsEditing(false);
    };

    const handleDueDateClear = (e) => {
        e.stopPropagation();
        setEditDueDate('');
    };

    // Drag and drop — store both task id and parent id for same-level matching
    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/task-id', String(task.id));
        e.dataTransfer.setData('application/task-parent', task.parent == null ? '__top__' : String(task.parent));
        setIsDragging(true);
    };
    const handleDragEnd = (e) => {
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.stopPropagation();
        setIsDragOver(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const draggedId = parseInt(e.dataTransfer.getData('application/task-id'));
        const draggedParent = e.dataTransfer.getData('application/task-parent');
        const myParent = task.parent == null ? '__top__' : String(task.parent);

        // Only allow reorder between siblings (same parent)
        if (draggedId !== task.id && draggedParent === myParent) {
            onReorder(task.parent, draggedId, task.id);
        }
    };

    const displayDue = isGroup ? task.effective_due_date : task.due_date;
    const dueStatus = getDueStatus(displayDue);

    return (
        <div
            ref={dragRef}
            className={`task-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ animationDelay: `${depth * 50}ms` }}
        >
            <div className="task-item-header">
                {/* Drag handle */}
                <span className="drag-handle" title="ドラッグで並べ替え">⠿</span>

                {/* Group expand / Single checkbox */}
                {isGroup ? (
                    <span
                        className={`task-expand ${expanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(!expanded)}
                    >
                        ▶
                    </span>
                ) : (
                    <span
                        className={`task-checkbox ${task.is_completed ? 'checked' : ''}`}
                        onClick={() => onToggle(task.id)}
                    />
                )}

                {/* Task info */}
                <div className="task-info" onClick={() => isGroup && !isEditing && setExpanded(!expanded)}>
                    {isEditing ? (
                        <div className="edit-form" onClick={(e) => e.stopPropagation()}>
                            <input
                                className="form-input mb-xs"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="タスク名"
                                autoFocus
                            />
                            {!isGroup && (
                                <div className="due-date-edit-container">
                                    <input
                                        type="datetime-local"
                                        className="form-input form-input-due"
                                        value={editDueDate}
                                        onChange={(e) => setEditDueDate(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-icon btn-ghost btn-xs"
                                        onClick={handleDueDateClear}
                                        title="期限をクリア"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`task-title ${task.is_completed ? 'completed' : ''}`}>
                            {task.title}
                        </div>
                    )}
                    <div className="task-meta">
                        {isGroup && (
                            <>
                                <span className="task-badge task-badge-group">
                                    📁
                                </span>
                                {isRanked && (
                                    <span className="task-badge task-badge-ranked">
                                        ↕ 順位付き
                                    </span>
                                )}
                                <span className="task-progress">
                                    <span className="task-progress-bar">
                                        <span className="task-progress-fill" style={{ width: `${progressPercent}%` }} />
                                    </span>
                                    {task.completion_completed}/{task.completion_total}
                                </span>
                            </>
                        )}
                        {/* Due date display (Static) - Only show if deadline exists */}
                        {!isEditing && displayDue && (
                            <span className={`task-due ${dueStatus}`}>
                                📅 {formatDate(displayDue)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                        <>
                            <button
                                className="btn btn-icon btn-primary"
                                onClick={handleEditSave}
                                title="保存"
                            >
                                ✓
                            </button>
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={handleEditCancel}
                                title="キャンセル"
                            >
                                ⤺
                            </button>
                            <button
                                className="btn btn-icon btn-danger"
                                onClick={() => onDelete(task.id)}
                                title="削除"
                            >
                                ×
                            </button>
                        </>
                    ) : (
                        <>
                            {isGroup && (
                                <button
                                    className="btn btn-icon btn-ghost"
                                    onClick={() => setShowAddChild(!showAddChild)}
                                    title="子タスクを追加"
                                >
                                    +
                                </button>
                            )}
                            <button
                                className="btn btn-icon btn-ghost"
                                onClick={handleEditStart}
                                title="編集"
                            >
                                ✎
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Inline add child form */}
            {isGroup && showAddChild && (
                <div className="task-children">
                    <div className="add-child-form">
                        <input
                            className="form-input"
                            placeholder="子タスク名…"
                            value={childTitle}
                            onChange={(e) => setChildTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
                            autoFocus
                        />
                        <input
                            type="datetime-local"
                            className="form-input form-input-sm"
                            value={childDueDate}
                            onChange={(e) => setChildDueDate(e.target.value)}
                        />
                        <label className="form-checkbox-label">
                            <input
                                type="checkbox"
                                checked={childIsGroup}
                                onChange={(e) => setChildIsGroup(e.target.checked)}
                            />
                            グループ
                        </label>
                        {childIsGroup && (
                            <select
                                className="form-select"
                                value={childGroupType}
                                onChange={(e) => setChildGroupType(e.target.value)}
                            >
                                <option value="UNRANKED">順位なし</option>
                                <option value="RANKED">順位付き</option>
                            </select>
                        )}
                        <button className="btn btn-primary" onClick={handleAddChild}>追加</button>
                    </div>
                </div>
            )}

            {/* Nested children */}
            {isGroup && expanded && children.length > 0 && (
                <div className="task-children">
                    {children.map((child) => (
                        <TaskItem
                            key={child.id}
                            task={child}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            onReorder={onReorder}
                            onUpdate={onUpdate}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
