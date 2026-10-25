/**
 * API Service Wrapper with JWT Authorization and Error Handling
 */

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('affinity_token') || localStorage.getItem('nexus_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),

  // Users & Search
  searchUsers: (query = '') => request(`/users/search?q=${encodeURIComponent(query)}`),
  getUserProfile: (id) => request(`/users/${id}`),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Friends & Requests
  getFriends: () => request('/friends'),
  getRequests: () => request('/friends/requests'),
  sendFriendRequest: (targetId) => request(`/friends/request/${targetId}`, { method: 'POST' }),
  acceptFriendRequest: (requestId) => request(`/friends/request/${requestId}/accept`, { method: 'POST' }),
  rejectFriendRequest: (requestId) => request(`/friends/request/${requestId}/reject`, { method: 'POST' }),
  cancelFriendRequest: (requestId) => request(`/friends/request/${requestId}/cancel`, { method: 'DELETE' }),
  removeFriend: (friendId) => request(`/friends/${friendId}`, { method: 'DELETE' }),

  // Recommendations
  getRecommendations: () => request('/recommendations'),

  // Messages
  getConversations: () => request('/messages/conversations'),
  getMessages: (friendId) => request(`/messages/${friendId}`),
  sendMessage: (friendId, content) => request(`/messages/${friendId}`, { method: 'POST', body: JSON.stringify({ content }) }),

  // DSA Lab
  getFriendshipGraph: (rootId) => request(`/dsa/friendship-graph${rootId ? `?rootId=${rootId}` : ''}`),
  getKruskalMST: () => request('/dsa/mst'),
  runCustomKruskalMST: (payload) => request('/dsa/mst', { method: 'POST', body: JSON.stringify(payload) }),
  getTopologicalSort: (type = 'workflow') => request(`/dsa/topological-sort?type=${type}`),
  runCustomTopologicalSort: (payload) => request('/dsa/topological-sort', { method: 'POST', body: JSON.stringify(payload) }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  updateUserStatus: (id, isActive) => request(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ is_active: isActive }) }),
  getAdminMLMonitoring: () => request('/admin/ml-monitoring'),
  getAdminAnalytics: () => request('/admin/analytics')
};

