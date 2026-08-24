import axios from 'axios';
import { auth } from '../lib/firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Inject Firebase ID token on every request.
// forceRefresh=true ensures we always have a non-expired token (Firebase refreshes
// automatically but the local cache can lag by a few seconds after sign-in).
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken(/* forceRefresh= */ false);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.warn('Failed to get Firebase token:', err);
    }
  }
  return config;
});

// Handle 401 responses: token may have expired mid-session.
// Do not auto-signout during initial /auth/login calls.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      try {
        // Force a fresh token and retry once before giving up
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(/* forceRefresh= */ true);
          const originalRequest = error.config;
          // Avoid infinite retry loop
          if (!originalRequest._retried) {
            originalRequest._retried = true;
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // Token refresh failed — sign out only if not already on auth page
        if (!window.location.pathname.startsWith('/auth')) {
          await auth.signOut().catch(() => {});
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
