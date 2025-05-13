import axios from './axios';
import { setAccessToken } from './axios';

/**
 * Выполняет вход и сохраняет accessToken
 */
export async function signIn(email: string, password: string) {
  const res = await axios.post('/authentication/sign-in', { email, password });
  const { accessToken, user } = res.data;
  setAccessToken(accessToken);
  return { accessToken, user };
}

/**
 * Пробует обновить accessToken из refreshToken в cookie
 */
export async function tryRefresh() {
  try {
    const res = await axios.post('/authentication/refresh-tokens', {}, { withCredentials: true });
    const token = res.data.accessToken;
    setAccessToken(token);
    return token;
  } catch (err) {
    console.error(err);
    setAccessToken(null);
    return null;
  }
}

/**
 * Логаут: очищает токен и редиректит
 */
export function logout() {
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    window.location.href = '/sign-in';
  }
}