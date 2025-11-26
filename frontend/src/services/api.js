import axios from 'axios';

// プロキシを使う場合は相対パス、直接アクセスの場合は絶対パス
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 顧客API
export const customerAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  search: (params) => api.get('/customers/search', { params }),
};

// 架電履歴API
export const callHistoryAPI = {
  getAll: () => api.get('/call-histories'),
  getByCustomer: (customerId) => api.get(`/call-histories/customer/${customerId}`),
  create: (data) => api.post('/call-histories', data),
  update: (id, data) => api.put(`/call-histories/${id}`, data),
  delete: (id) => api.delete(`/call-histories/${id}`),
};

// ステータスAPI
export const statusAPI = {
  getAll: () => api.get('/statuses'),
  getSummary: () => api.get('/statuses/summary'),
  getByCustomer: (customerId) => api.get(`/statuses/customer/${customerId}`),
  update: (customerId, data) => api.put(`/statuses/customer/${customerId}`, data),
};

export default api;
