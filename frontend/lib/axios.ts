import axios from 'axios';
import { isBrowser } from '@/utils/isBrowser';

let accessToken: string | null = null;

const getCookie = (name: string): string | null => {
  if (!isBrowser()) {
    return null;
  }
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
};
// функция для обновления токена
const refreshToken = async () => {
  try {
    const response = await api.post('/authentication/refresh-tokens', {}, { withCredentials: true });
    accessToken = response.data.accessToken;
    return accessToken;
  } catch (err) {
    accessToken = null;
    throw err;
  }
};

// функция для инициализации accessToken из AuthProvider
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api',
  withCredentials: true,
});

// Интерцептор запроса: добавляет accessToken в заголовки
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (config.headers && config.url) {
      const needsCsrf =
        config.url.includes('/authentication/refresh-tokens') ||
        config.url.includes('/authentication/logout');
      if (needsCsrf) {
        const csrfToken = getCookie('csrfToken');
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Интерцептор ответа: обновляет токен при 401 и повторяет запрос
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isSignInPage = isBrowser() && window.location.pathname === '/sign-in';
    const is401 = error.response?.status === 401;
    if (is401 && !originalRequest._retry && accessToken && !isSignInPage) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        if (isBrowser()) {
          window.location.href = '/sign-in';
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
