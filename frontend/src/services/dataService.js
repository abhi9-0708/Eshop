import api from './api';

export const retailerService = {
  getAll: (params) => api.get('/retailers', { params }),
  getById: (id) => api.get(`/retailers/${id}`),
  create: (data) => api.post('/retailers', data),
  update: (id, data) => api.put(`/retailers/${id}`, data),
  delete: (id) => api.delete(`/retailers/${id}`)
};

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  updateStock: (id, data) => api.put(`/products/${id}/stock`, data)
};

export const orderService = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  updatePayment: (id, data) => api.put(`/orders/${id}/payment`, data)
};

export const userService = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getDistributors: () => api.get('/users/distributors'),
  getSalesReps: () => api.get('/users/sales-reps')
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats')
};

export const reportService = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getPerformance: (params) => api.get('/reports/performance', { params })
};
