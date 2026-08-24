import axios from 'axios';
import { auth } from '../lib/firebase';

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // If in browser and accessed via LAN IP or non-localhost hostname (e.g. mobile device on Wi-Fi)
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        // If envUrl is configured to localhost but mobile client is accessing via network IP,
        // rewrite the hostname to the mobile client's host server.
        if (!isLocalhost && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
          parsed.hostname = hostname;
          return parsed.toString().replace(/\/$/, '');
        }
      } catch (_) {}
      return envUrl;
    }

    if (!isLocalhost) {
      return `http://${hostname}:5000/api`;
    }
  }

  return envUrl || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
});

// Inject Firebase ID token on every request.
// forceRefresh=false uses cached token if valid, refreshing automatically when needed.
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(/* forceRefresh= */ false);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('[API] Failed to get Firebase token for request:', err);
    }
  }
  return config;
});

// Handle 401 responses: token may have expired during phone sleep or background state.
// Do not auto-signout during initial /auth/login calls.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isLoginEndpoint = originalRequest?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginEndpoint && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(/* forceRefresh= */ true);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('[API] Token refresh failed:', refreshErr);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          await auth.signOut().catch(() => {});
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

