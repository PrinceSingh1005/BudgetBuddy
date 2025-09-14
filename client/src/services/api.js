import axios from 'axios'
import { is } from 'date-fns/locale';

// Create axios instance
const api = axios.create({
  baseURL: `${'https://budgetbuddy-qofr.onrender.com' || import.meta.env.BACKEND_URL || 'http://localhost:3001'}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post('/auth/refresh', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // Update tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update the authorization header
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Notify all queued requests
        onTokenRefreshed(accessToken);
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);


// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: (data) => api.post('/auth/logout', data),
  refresh: (data) => api.post('/auth/refresh', data),
  me: () => api.get('/auth/me'),
}

// Transactions API
export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
}

// Analytics API
export const analyticsAPI = {
  getExpensesByCategory: (params) => api.get('/analytics/expenses-by-category', { params }),
  getExpensesByDate: (params) => api.get('/analytics/expenses-by-date', { params }),
  getIncomeFlow: (params) => api.get('/analytics/income-daily-flow', { params }),
  getSummary: (params) => api.get('/analytics/summary', { params }),
  getTopMerchants: (params) => api.get('/analytics/top-merchants', { params }),
  getDailyFinancialSummary: (params) => api.get('/analytics/daily-financial-summary', { params }),
}

// Receipts API
export const receiptsAPI = {
  getAll: () => api.get('/receipts'),
  getById: (id) => api.get(`/receipts/${id}`),
  getStatus: (id) => api.get(`/receipts/${id}/status`),
  upload: (formData, config) => api.post('/receipts/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config
  }),
  download: (id) => api.get(`/receipts/${id}/download`, {
    responseType: 'blob',
  }),
  delete: (id) => api.delete(`/receipts/${id}`),
};

// Import API
export const importAPI = {
  upload: (formData, config) => api.post('/import/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    ...config
  }),
  getJobs: () => api.get('/import/jobs'),
  getJob: (id) => api.get(`/import/jobs/${id}`),
  deleteJob: (id) => api.delete(`/import/jobs/${id}`),
};

export const budgetsAPI = {
  getAll: (params) => api.get('/budgets', { params }),
  getById: (id) => api.get(`/budgets/${id}`),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

// Admin API
export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getStats: () => api.get('/admin/stats'),
}

export default api;
