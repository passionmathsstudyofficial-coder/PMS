import { presentApiError } from './apiErrorLanguage.js';
import { uiText } from './uiLanguage.js';
import { getUiLanguage } from './uiLanguage.js';
import axios from 'axios';
import { API_BASE } from './config';

let csrfToken = null;
let unauthorizedHandler = null;

export const setCsrfToken = (token) => {
  csrfToken = token || null;
};
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 60_000 });

api.interceptors.request.use((config) => {
  if (String(config.url || '').startsWith('/public/') && (config.method || 'get').toLowerCase() === 'get') config.params = { ...config.params, lang: config.params?.lang || getUiLanguage() };
  const method = (config.method || 'get').toLowerCase();
  if (csrfToken && !config.headers?.has?.('X-CSRF-Token') && !config.headers?.['X-CSRF-Token'] && !['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (['post', 'put', 'patch', 'delete'].includes(response.config?.method) && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pms-content-updated'));
      try { localStorage.setItem('pms-content-revision', `${Date.now()}:${Math.random()}`); } catch {}
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    error.status = status;
    const payload = error.response?.data?.error;
    error.details = payload?.details;
    const detailText =
      payload?.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
        ? Object.entries(payload.details)
            .filter(([, v]) => typeof v === 'string')
            .slice(0, 3)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')
        : '';
    error.userMessage =
      (payload?.message ? `${payload.message}${detailText ? ` — ${detailText}` : ''}` : null) ||
      (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : null) ||
      (!error.response ? 'Network error — check your internet connection.' : error.message);
    if (status === 401 && unauthorizedHandler && !error.config?.skipAuthRedirect) unauthorizedHandler(error);
    return Promise.reject(error);
  },
);

export const errorMessage = (error, fallback = 'Something went wrong') => presentApiError(error, fallback);

export const get = (url, params, config) => api.get(url, { params, ...config }).then((r) => r.data);
export const post = (url, data, config) => api.post(url, data, config).then((r) => r.data);
export const put = (url, data, config) => api.put(url, data, config).then((r) => r.data);
export const patch = (url, data, config) => api.patch(url, data, config).then((r) => r.data);
export const del = (url, config) => api.delete(url, config).then((r) => r.data);
