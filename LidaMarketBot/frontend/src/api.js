/**
 * HTTP API client for backend communication
 */
import { telegram } from './telegram.js';

const BASE_URL = '';  // Same origin (via Vite proxy or Railway)

async function request(url, options = {}) {
  const headers = {
    'X-Init-Data': telegram.initData,
    ...options.headers,
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // --- Catalog ---
  getCategories: () => request('/api/categories'),
  getProducts: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== null && val !== undefined && val !== '') searchParams.set(key, val);
    });
    return request(`/api/products?${searchParams}`);
  },
  getPopularProducts: (limit = 10) => request(`/api/products/popular?limit=${limit}`),
  getNewProducts: (limit = 10) => request(`/api/products/new?limit=${limit}`),
  getProduct: (id) => request(`/api/products/${id}`),

  // --- User ---
  getProfile: () => request('/api/user/profile'),
  getReferralInfo: () => request('/api/user/referral'),

  // --- Favorites ---
  getFavorites: () => request('/api/favorites'),
  addFavorite: (productId) => request(`/api/favorites/${productId}`, { method: 'POST' }),
  removeFavorite: (productId) => request(`/api/favorites/${productId}`, { method: 'DELETE' }),
  checkFavorite: (productId) => request(`/api/favorites/check/${productId}`),

  // --- History ---
  getHistory: () => request('/api/history'),
  clearHistory: () => request('/api/history', { method: 'DELETE' }),

  // --- Orders ---
  createOrder: (data) => request('/api/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => request('/api/orders'),
  getOrder: (id) => request(`/api/orders/${id}`),

  // --- Dropship ---
  registerDropship: () => request('/api/dropship/register', { method: 'POST' }),
  getDropshipStatus: () => request('/api/dropship/status'),
  getDropshipProducts: () => request('/api/dropship/products'),
  createDropshipOrder: (data) => request('/api/dropship/orders', { method: 'POST', body: JSON.stringify(data) }),
  getDropshipOrders: () => request('/api/dropship/orders'),

  // --- Admin ---
  getAdminStats: () => request('/api/admin/stats'),
  createCategory: (data) => request('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  createProduct: (formData) => request('/api/admin/products', { method: 'POST', body: formData }),
  updateProduct: (id, formData) => request(`/api/admin/products/${id}`, { method: 'PUT', body: formData }),
  deleteProduct: (id) => request(`/api/admin/products/${id}`, { method: 'DELETE' }),

  getAdminOrders: (status) => request(`/api/admin/orders${status ? `?status=${status}` : ''}`),
  updateOrderStatus: (id, status) => request(`/api/admin/orders/${id}/status?status=${status}`, { method: 'PUT' }),

  getAdminUsers: () => request('/api/admin/users'),
  getPendingDropshippers: () => request('/api/admin/dropship/pending'),
  approveDropshipper: (userId) => request(`/api/admin/dropship/approve/${userId}`, { method: 'POST' }),

  getAdminDropshipOrders: () => request('/api/admin/dropship/orders'),
  updateDropshipOrderStatus: (id, status) => request(`/api/admin/dropship/orders/${id}/status?status=${status}`, { method: 'PUT' }),
};

export default api;
