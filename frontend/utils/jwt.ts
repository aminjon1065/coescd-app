export interface JwtPayload {
  email: string;
  name: string;
  role: string;
  permissions: string[];

  [key: string]: any;
}

export function parseJwt(token: string): JwtPayload {
  if (!token) return null as any;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null as any;
  }
}