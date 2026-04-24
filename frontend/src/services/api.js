import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Products
export const getProducts = (params) => api.get('/products', { params });
export const getProduct = (plu) => api.get(`/products/${plu}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (plu, data) => api.put(`/products/${plu}`, data);
export const deleteProduct = (plu) => api.delete(`/products/${plu}`);
export const importCSV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const exportCSV = () =>
  api.get('/products/export', { responseType: 'blob' });
export const bulkUpdate = (data) => api.post('/products/bulk-update', data);

// Scales
export const getScales = () => api.get('/scales');
export const getScale = (id) => api.get(`/scales/${id}`);
export const createScale = (data) => api.post('/scales', data);
export const updateScale = (id, data) => api.put(`/scales/${id}`, data);
export const deleteScale = (id) => api.delete(`/scales/${id}`);
export const syncScale = (id) => api.post(`/scales/${id}/sync`);
export const getScaleStatus = (id) => api.get(`/scales/${id}/status`);
export const syncAll = () => api.post('/sync/all');

// Price History
export const getPriceHistory = (plu) => api.get(`/price-history/${plu}`);

// Sync Logs
export const getSyncLogs = () => api.get('/sync/logs');
export const getScaleSyncLogs = (scaleId) => api.get(`/sync/logs/${scaleId}`);

export default api;
