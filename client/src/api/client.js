import axios from 'axios';

/**
 * Axios instance with:
 *  - access token injection from memory (set by AuthContext)
 *  - automatic refresh-on-401 (single-flight) using the httpOnly cookie
 */
let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (t) => {
  accessToken = t;
};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

/**
 * API base. Same-origin by default ('/api' — works with the dev proxy and a
 * reverse-proxied Docker deploy). For a split deploy (frontend and backend on
 * different origins, e.g. Vercel + Render) set VITE_API_URL=https://api.example.com/api.
 */
export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Try refresh exactly once per request, never for auth endpoints themselves
    if (status === 401 && !original._retried && !original.url.includes('/auth/')) {
      original._retried = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${API_BASE}/auth/refresh`, null, { withCredentials: true }).finally(() => {
            refreshing = null;
          });
        const { data } = await refreshing;
        accessToken = data.data.accessToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Normalised error message from any API failure. */
export const errMsg = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;
