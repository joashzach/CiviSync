import api from './axios';

export const createComplaint = (data) =>
  api.post('/complaints', data).then((r) => r.data);

export const getComplaints = (params) =>
  api.get('/complaints', { params }).then((r) => r.data);

export const getNearbyComplaints = (lat, lng, radius = 5) =>
  api.get('/complaints/nearby', { params: { lat, lng, radius } }).then((r) => r.data);

export const getMyComplaints = (params) =>
  api.get('/complaints/mine', { params }).then((r) => r.data);

export const getAllForMap = (params) =>
  api.get('/complaints/all-map', { params }).then((r) => r.data);

export const getComplaint = (id) =>
  api.get(`/complaints/${id}`).then((r) => r.data);

export const updateComplaintStatus = (id, status) =>
  api.patch(`/complaints/${id}/status`, { status }).then((r) => r.data);

export const toggleSupport = (id) =>
  api.post(`/complaints/${id}/support`).then((r) => r.data);

export const checkDuplicates = (category, latitude, longitude) =>
  api.post('/complaints/check-duplicates', { category, latitude, longitude }).then((r) => r.data);

export const deleteComplaint = (id) =>
  api.delete(`/complaints/${id}`).then((r) => r.data);

export const loginUser = () =>
  api.post('/auth/login').then((r) => r.data);
