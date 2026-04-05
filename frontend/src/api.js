const API_BASE = '/api';

async function request(url, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });
    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || res.statusText);
    }
    if (res.status === 204) return null;
    return res.json();
}

export const api = {
    login: (username, password) =>
        request('/token/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
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
    getProfile: () => request('/me/'),
    updateProfile: (data) => request('/me/', { method: 'PATCH', body: JSON.stringify(data) }),
    getDailySummary: () => request('/tasks/daily_summary/'),
    getFlatTasks: (sortBy) => request(`/tasks/flat_sorted/?sort_by=${sortBy}`),
};
