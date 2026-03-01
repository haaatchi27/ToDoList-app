const API_BASE = '/api';

async function request(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
}

export const api = {
    register: (data) =>
        request('/register/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getTasks: () => request('/tasks/'),
    getTask: (id) => request(`/tasks/${id}/`),
    createTask: (data) => request('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
    updateTask: (id, data) => request(`/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteTask: (id) => request(`/tasks/${id}/`, { method: 'DELETE' }),
    toggleTask: (id) => request(`/tasks/${id}/toggle/`, { method: 'POST' }),
    reorderTasks: (groupId, taskIds) =>
        request(`/tasks/${groupId}/reorder/`, {
            method: 'POST',
            body: JSON.stringify({ task_ids: taskIds }),
        }),
    reorderTopLevelTasks: (taskIds) =>
        request('/tasks/reorder_top_level/', {
            method: 'POST',
            body: JSON.stringify({ task_ids: taskIds }),
        }),
    sortGroupTasks: (groupId, sortBy) =>
        request(`/tasks/${groupId}/sort/`, {
            method: 'POST',
            body: JSON.stringify({ sort_by: sortBy }),
        }),
    sortTopLevelTasks: (sortBy) =>
        request('/tasks/sort_top_level/', {
            method: 'POST',
            body: JSON.stringify({ sort_by: sortBy }),
        }),
};
