import { Request } from 'express';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export function getRequestMeta(request: Request): RequestMeta {
  const xForwardedFor = request.headers['x-forwarded-for'];
  const ip =
    typeof xForwardedFor === 'string' && xForwardedFor.length > 0
      ? xForwardedFor.split(',')[0].trim()
      : request.ip ?? null;

  return {
    ip,
    userAgent: request.headers['user-agent'] ?? null,
  };
}
