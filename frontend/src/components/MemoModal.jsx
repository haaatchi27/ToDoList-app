import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * MemoModal component to display and edit task notes.
 * Supports URL linkification and a switch between view and edit modes.
 * Uses React Portal to render at the top level of the DOM (document.body)
 * ensuring it stays above all other components and blur effects apply correctly.
 */
export default function MemoModal({ isOpen, onClose, memo, onSave, taskTitle }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedMemo, setEditedMemo] = useState(memo || '');

    useEffect(() => {
        setEditedMemo(memo || '');
        if (isOpen) {
            setIsEditing(false); // Reset to view mode when opened
        }
    }, [memo, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(editedMemo);
        setIsEditing(false);
    };

    /**
     * Converts URLs in text to <a> tags.
     */
    const linkify = (text) => {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part && part.match(urlRegex)) {
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="memo-link">
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const modalJSX = (
        <div className="modal-overlay" onClick={onClose} style={{ pointerEvents: 'auto' }}>
            <div className="modal-content memo-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>メモ: {taskTitle}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {isEditing ? (
                        <textarea
                            className="form-input memo-textarea"
                            value={editedMemo}
                            onChange={(e) => setEditedMemo(e.target.value)}
                            placeholder="メモを入力してください..."
                            autoFocus
                        />
                    ) : (
                        <div className="memo-view">
                            {editedMemo ? (
                                <pre className="memo-text">{linkify(editedMemo)}</pre>
                            ) : (
                                <p className="text-muted">メモはまだありません。</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {isEditing ? (
                        <>
                            <button className="btn btn-primary" onClick={handleSave}>保存</button>
                            <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>キャンセル</button>
                        </>
                    ) : (
                        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>編集</button>
                    )}
                </div>
            </div>
        </div>
    );

    // Render into the document body to escape any parent stacking contexts
    return createPortal(modalJSX, document.body);
}
