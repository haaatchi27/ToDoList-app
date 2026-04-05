import { useState, useRef } from 'react';
import MemoModal from './MemoModal';

/**
 * Recursive TaskItem component for rendering hierarchical tasks.
 * Supports groups, ordering (drag & drop), expand/collapse, and inline child creation.
 */
export default function TaskItem({ task, onToggle, onDelete, onAddChild, onReorder, onUpdate, depth = 0, parentGroupType = null, showCompleted = true, showFailed = false, parentRef = null }) {
    const [expanded, setExpanded] = useState(true);
    const [showAddChild, setShowAddChild] = useState(false);
    const [childTitle, setChildTitle] = useState('');
    const [childDueDate, setChildDueDate] = useState('');
    const [childRecommendedDate, setChildRecommendedDate] = useState('');
    const [childIsRequired, setChildIsRequired] = useState(true);
    const [childPriority, setChildPriority] = useState(99);
    const [childIsGroup, setChildIsGroup] = useState(false);
    const [childGroupType, setChildGroupType] = useState('UNRANKED');
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editDueDate, setEditDueDate] = useState('');
    const [editRecommendedDate, setEditRecommendedDate] = useState('');
    const [editIsRequired, setEditIsRequired] = useState(task.is_required ?? true);
    const [editPriority, setEditPriority] = useState(task.priority || 99);
    const [editGroupType, setEditGroupType] = useState(task.group_type || 'UNRANKED');
    const [isMemoOpen, setIsMemoOpen] = useState(false);

    const dragRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const isGroup = task.is_group;
    const children = task.children || [];
    const isRanked = task.group_type === 'RANKED';
    const progressPercent = task.completion_total > 0
        ? Math.round((task.completion_completed / task.completion_total) * 100)
        : 0;

    if (!showCompleted && task.status === 'COMPLETED') {
        return null;
    }
    if (!showFailed && task.status === 'FAILED') {
        return null;
    }

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
        if (childDueDate && childRecommendedDate && new Date(childRecommendedDate) > new Date(childDueDate)) {
            alert("推奨実行日時は期限より前である必要があります。");
            return;
        }
        onAddChild(task.id, {
            title: childTitle.trim(),
            parent: task.id,
            due_date: childDueDate || null,
            recommended_datetime: childRecommendedDate || null,
            is_required: childIsRequired,
            priority: parseInt(childPriority) || 99,
            is_group: childIsGroup,
            group_type: childGroupType,
        });
        setChildTitle('');
        setChildDueDate('');
        setChildRecommendedDate('');
        setChildIsRequired(true);
        setChildPriority(99);
        setChildIsGroup(false);
        setChildGroupType('UNRANKED');
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
        setEditRecommendedDate(toLocalDateTimeString(task.recommended_datetime));
        setEditIsRequired(task.is_required ?? true);
        setEditPriority(task.priority || 99);
        setEditGroupType(task.group_type || 'UNRANKED');
        setIsEditing(true);
    };

    const handleEditSave = () => {
        if (editDueDate && editRecommendedDate && new Date(editRecommendedDate) > new Date(editDueDate)) {
            alert("推奨実行日時は期限より前である必要があります。");
            return;
        }

        const updates = {};
        if (editTitle.trim() && editTitle !== task.title) {
            updates.title = editTitle.trim();
        }
        const newDueDate = editDueDate || null;
        const oldDueDate = task.due_date ? toLocalDateTimeString(task.due_date) : '';
        if (editDueDate !== oldDueDate) {
            updates.due_date = newDueDate;
        }
        const newRecDate = editRecommendedDate || null;
        const oldRecDate = task.recommended_datetime ? toLocalDateTimeString(task.recommended_datetime) : '';
        if (editRecommendedDate !== oldRecDate) {
            updates.recommended_datetime = newRecDate;
        }
        if (editIsRequired !== (task.is_required ?? true)) {
            updates.is_required = editIsRequired;
        }

        if (parseInt(editPriority) !== (task.priority || 99)) {
            updates.priority = parseInt(editPriority) || 99;
        }
        if (editGroupType !== (task.group_type || 'UNRANKED')) {
            updates.group_type = editGroupType;
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

    const handleMemoSave = (newMemo) => {
        onUpdate(task.id, { memo: newMemo });
        setIsMemoOpen(false);
    };

    // Drag and drop — store both task id and parent id for same-level matching
    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';

        const payload = JSON.stringify({
            id: task.id,
            parent: task.parent == null ? '__top__' : String(task.parent)
        });
        e.dataTransfer.setData('text/plain', payload);
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

        try {
            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData) return;
            const data = JSON.parse(rawData);

            const draggedId = parseInt(data.id);
            const draggedParent = data.parent;
            const myParent = task.parent == null ? '__top__' : String(task.parent);

            // Only allow reorder between siblings (same parent)
            if (draggedId !== task.id && draggedParent === myParent) {
                onReorder(task.parent, draggedId, task.id);
            }
        } catch (err) {
            console.error("Drag payload parsing failed:", err);
        }
    };

    const displayDue = isGroup ? task.effective_due_date : task.due_date;
    const dueStatus = getDueStatus(displayDue);

    return (
        <div
            ref={dragRef}
            className={`task-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ animationDelay: `${depth * 50}ms` }}
        >
            <div className="task-item-header">
                {/* Drag handle - only show if manual reordering is allowed (UNRANKED item) */}
                {task.group_type !== 'RANKED' && (
                    <span
                        className="drag-handle"
                        title="ドラッグで並べ替え"
                        draggable
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >⠿</span>
                )}

                {/* Group expand / Single checkbox */}
                {isGroup ? (
                    <span
                        className={`task-expand ${expanded ? 'expanded' : ''}`}
                        onClick={() => {
                            const willExpand = !expanded;
                            setExpanded(willExpand);
                            setTimeout(() => {
                                if (willExpand) {
                                    // Expanding: scroll this directory to top
                                    dragRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    // Collapsing: scroll parent directory to top (or self if top-level)
                                    const target = parentRef?.current || dragRef.current;
                                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }, 50);
                        }}
                    >
                        ▶
                    </span>
                ) : (
                    <span
                        className={`task-checkbox ${task.status === 'COMPLETED' ? 'checked' : ''}`}
                        onClick={() => onToggle(task.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        {task.status === 'FAILED' && <span style={{ color: 'red', fontSize: '0.7rem' }}>✖</span>}
                        {task.status === 'NOT_REQUIRED' && <span style={{ color: 'orange', fontSize: '0.7rem' }}>➖</span>}
                    </span>
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

                            {/* 優先度付きタスク（編集画面） */}
                            {!isGroup && (
                                <div className="due-date-edit-container">
                                    <label className="form-label-inline">
                                        <span>📅 期限:</span>
                                        <input
                                            type="datetime-local"
                                            className="form-input form-input-sm"
                                            value={editDueDate}
                                            onChange={(e) => setEditDueDate(e.target.value)}
                                            onFocus={() => handleDateFocus(setEditDueDate, editDueDate)}
                                            onClick={() => handleDateFocus(setEditDueDate, editDueDate)}
                                            title="期限"
                                        />
                                    </label>
                                    <label className="form-label-inline ml-xs">
                                        <span>⭐ 推奨:</span>
                                        <input
                                            type="datetime-local"
                                            className="form-input form-input-sm"
                                            value={editRecommendedDate}
                                            onChange={(e) => setEditRecommendedDate(e.target.value)}
                                            onFocus={() => handleDateFocus(setEditRecommendedDate, editRecommendedDate)}
                                            onClick={() => handleDateFocus(setEditRecommendedDate, editRecommendedDate)}
                                            title="推奨実行日時"
                                        />
                                    </label>
                                    <label className="form-checkbox-label ml-xs" title="必須タスク">
                                        <input
                                            type="checkbox"
                                            checked={editIsRequired}
                                            onChange={(e) => setEditIsRequired(e.target.checked)}
                                        />
                                        必須
                                    </label>
                                    <button
                                        className="btn btn-icon btn-ghost btn-xs ml-xs"
                                        onClick={handleDueDateClear}
                                        title="期限をクリア"
                                    >
                                        ×
                                    </button>

                                    <label className="form-checkbox-label ml-xs">
                                        <input
                                            type="checkbox"
                                            checked={editGroupType === 'RANKED'}
                                            onChange={(e) => setEditGroupType(e.target.checked ? 'RANKED' : 'UNRANKED')}
                                        />
                                        順位付き
                                        {editGroupType === 'RANKED' && (
                                            <input
                                                type="number"
                                                className="form-input form-input-xs ml-xs"
                                                style={{ width: '120px' }}
                                                value={editPriority}
                                                onChange={(e) => setEditPriority(e.target.value)}
                                                placeholder="優先度"
                                                title="優先度 (数値が小さいほど高い)"
                                            />
                                        )}
                                    </label>


                                </div>
                            )}

                            {/* グループ */}
                            {isGroup && (
                                <div className="due-date-edit-container">
                                    <label className="form-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={editGroupType === 'RANKED'}
                                            onChange={(e) => setEditGroupType(e.target.checked ? 'RANKED' : 'UNRANKED')}
                                        />
                                        順位付き_追加画面？
                                        {editGroupType === 'RANKED' && (
                                            <input
                                                type="number"
                                                className="form-input form-input-xs ml-xs"
                                                style={{ width: '120px' }}
                                                value={editPriority}
                                                onChange={(e) => setEditPriority(e.target.value)}
                                                placeholder="優先度"
                                                title="優先度 (数値が小さいほど高い)"
                                            />
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            className={`task-title ${task.status === 'COMPLETED' ? 'completed' : ''} ${['FAILED', 'NOT_REQUIRED'].includes(task.status) ? 'inactive' : ''}`}
                            onClick={(e) => { e.stopPropagation(); setIsMemoOpen(true); }}
                            style={{ cursor: 'pointer', opacity: ['FAILED', 'NOT_REQUIRED'].includes(task.status) ? 0.6 : 1 }}
                            title="クリックでメモを表示"
                        >
                            {task.title}
                        </div>
                    )}

                    {/* ToDoList 直下（親なし） */}
                    <div className="task-meta">

                        {/* 優先度付きグループ */}
                        {isGroup && (
                            <>
                                <span className="task-badge task-badge-group">
                                    📁
                                </span>

                                {/* 順位付きを非表示 */}
                                {task.group_type === 'RANKED' && false && (
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
                                {task.group_type === 'RANKED' && parentGroupType !== 'RANKED' && (
                                    <span className="task-badge task-badge-priority">
                                        優先度{task.priority || ''}
                                    </span>
                                )}                            </>
                        )}

                        {/* Due date display (Static) - Only show if deadline exists */}
                        {/* 基本タスク */}
                        {!isEditing && displayDue && (
                            <span className={`task-due ${dueStatus}`}>
                                📅 期限: {formatDate(displayDue)}
                            </span>
                        )}
                        {!isEditing && task.recommended_datetime && (
                            <span className="task-due">
                                ⭐ 推奨: {formatDate(task.recommended_datetime)}
                            </span>
                        )}
                        {!isEditing && !task.is_required && (
                            <span className="task-badge task-badge-group">
                                任意
                            </span>
                        )}
                        {!isEditing && task.status === 'FAILED' && (
                            <span className="task-badge" style={{ background: 'var(--color-danger)', color: '#fff' }}>
                                失敗（期限超過）
                            </span>
                        )}
                        {!isEditing && task.status === 'NOT_REQUIRED' && (
                            <span className="task-badge" style={{ background: 'var(--color-text-light)', color: '#fff' }}>
                                実施不要
                            </span>
                        )}
                        {/* 順位付きを非表示 */}
                        {!isEditing && !isGroup && task.group_type === 'RANKED' && false && (
                            <span className="task-badge task-badge-ranked">
                                ↕ 順位付き
                            </span>
                        )}

                        {!isEditing && !isGroup && task.group_type === 'RANKED' && (
                            <span className="task-badge task-badge-priority">
                                優先度{task.priority || ''}
                            </span>
                        )}

                        {/* 親グループが優先度月出ないこと */}
                        {/* {!isEditing && !isGroup && task.group_type === 'RANKED' && parentGroupType !== 'RANKED' && (
                            <span className="task-badge task-badge-priority">
                                P{task.priority || 99}
                            </span>
                        )} */}
                    </div>
                </div>

                {/* Actions */}
                {/* 右端（編集中のアクション or 子タスク追加・削除 */}
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
                        <label className="form-label-inline ml-xs">
                            <span>📅 期限:</span>
                            <input
                                type="datetime-local"
                                className="form-input form-input-sm"
                                value={childDueDate}
                                onChange={(e) => setChildDueDate(e.target.value)}
                                onFocus={() => handleDateFocus(setChildDueDate, childDueDate)}
                                onClick={() => handleDateFocus(setChildDueDate, childDueDate)}
                                title="期限"
                            />
                        </label>
                        <label className="form-label-inline ml-xs">
                            <span>⭐ 推奨:</span>
                            <input
                                type="datetime-local"
                                className="form-input form-input-sm"
                                value={childRecommendedDate}
                                onChange={(e) => setChildRecommendedDate(e.target.value)}
                                onFocus={() => handleDateFocus(setChildRecommendedDate, childRecommendedDate)}
                                onClick={() => handleDateFocus(setChildRecommendedDate, childRecommendedDate)}
                                title="推奨実行日時"
                            />
                        </label>
                        <label className="form-checkbox-label ml-xs" title="必須タスク">
                            <input
                                type="checkbox"
                                checked={childIsRequired}
                                onChange={(e) => setChildIsRequired(e.target.checked)}
                            />
                            必須
                        </label>

                        <label className="form-checkbox-label">
                            <input
                                type="checkbox"
                                checked={childIsGroup}
                                onChange={(e) => setChildIsGroup(e.target.checked)}
                            />
                            グループ
                        </label>
                        <label className="form-checkbox-label">
                            <input
                                type="checkbox"
                                checked={childGroupType === 'RANKED'}
                                onChange={(e) => setChildGroupType(e.target.checked ? 'RANKED' : 'UNRANKED')}
                            />
                            順位付き
                        </label>
                        {childGroupType === 'RANKED' && (
                            <input
                                type="number"
                                className="form-input form-input-xs"
                                style={{ width: '60px' }}
                                placeholder="優先度"
                                value={childPriority}
                                onChange={(e) => setChildPriority(e.target.value)}
                            />
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
                            parentGroupType={task.group_type}
                            showCompleted={showCompleted}
                            showFailed={showFailed}
                            parentRef={dragRef}
                        />
                    ))}
                </div>
            )}

            <MemoModal
                isOpen={isMemoOpen}
                onClose={() => setIsMemoOpen(false)}
                memo={task.memo}
                onSave={handleMemoSave}
                taskTitle={task.title}
            />
        </div>
    );
}
