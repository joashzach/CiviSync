import api from './axios';

export const analyzeImage = (image_url) =>
  api.post('/ai/analyze', { image_url }).then((r) => r.data);
