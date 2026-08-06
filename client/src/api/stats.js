import api from './axios';

export const getStats = () => api.get('/stats').then((r) => r.data);
export const getMyStats = () => api.get('/stats/mine').then((r) => r.data);
