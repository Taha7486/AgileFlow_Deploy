import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const extractErrorMessage = (data: unknown) => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Injecter le token d'accès dans chaque requête ──
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur de réponse : refresh automatique sur 401 ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const refreshUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/auth/refresh`;
          const res = await axios.post(refreshUrl, null, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });

          const { accessToken, refreshToken: newRefresh, userId, email, role, avatarUrl } = res.data;
          const currentUser = useAuthStore.getState().user;

          // Met à jour le store avec le nouveau token
          useAuthStore.getState().setAuth(
            accessToken,
            { id: userId, email, role, firstName: currentUser?.firstName ?? '', lastName: currentUser?.lastName ?? '', avatarUrl: avatarUrl ?? currentUser?.avatarUrl ?? null },
            newRefresh
          );

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/';
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/';
      }
    }

    const method = String(error.config?.method ?? 'get').toLowerCase();
    const isUserAction = ['post', 'put', 'patch', 'delete'].includes(method);

    if (error.response?.status === 403 && isUserAction) {
      const message = extractErrorMessage(error.response.data)
        ?? "Vous n'avez pas les droits suffisants pour effectuer cette action.";

      window.dispatchEvent(new CustomEvent('agileflow:toast', {
        detail: { message, severity: 'error' },
      }));
    }

    return Promise.reject(error);
  }
);
