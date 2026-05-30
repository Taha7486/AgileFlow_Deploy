import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const extractErrorMessage = (data: unknown) => {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si on reçoit 401 et que ce n'est pas déjà un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si la requête échouée PENDANT un login ou refresh -> on déconnecte de suite
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/login')) {
        useAuthStore.getState().logout();
        window.location.href = '/';
        return Promise.reject(error);
      }

      // Si c'est en cours de rafraîchissement ailleurs, on met la requête en attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
         useAuthStore.getState().logout();
         window.location.href = '/';
         return Promise.reject(error);
      }

      // Try refresh
      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}` }, // Backend attend le refreshToken en Header
        });

        // Mise à jour locale
        useAuthStore.getState().setAuth(data.accessToken, {
          id: data.userId,
          email: data.email,
          role: data.role,
          firstName: data.prenom,
          lastName: data.nom,
          avatarUrl: data.avatarUrl ?? useAuthStore.getState().user?.avatarUrl ?? null,
        }, data.refreshToken);

        // Relancer les requêtes en attente
        processQueue(null, data.accessToken);
        
        // Relancer celle en cours
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);

      } catch (err) {
        processQueue(err as Error, null);
        useAuthStore.getState().logout();
        window.location.href = '/';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
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

export default axiosInstance;
