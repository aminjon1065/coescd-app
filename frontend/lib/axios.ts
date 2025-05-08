import axios from 'axios';

let accessToken: string | null = null;
// функция для обновления токена
const refreshToken = async () => {
  try {
    const response = await axios.post('/api/authentication/refresh-tokens', {}, { withCredentials: true });
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

interface AuthUser {
  email: string;
  name: string;
  role: string;
  permissions: string[];
  department: object;
}

export const setUser = (userData: AuthUser | null) => {
  user = userData;
};


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true,
});

// Интерцептор запроса: добавляет accessToken в заголовки
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in';
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default api;