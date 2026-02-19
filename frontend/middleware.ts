import { NextRequest, NextResponse } from 'next/server';
import { resolveRoutePolicyKey } from '@/features/authz/route-path-policies';

const PUBLIC_PATHS = ['/sign-in', '/forgot-password', '/api/authentication'];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get('refreshToken')?.value;
  if (!refreshToken) {
    const loginUrl = new URL('/sign-in', request.url);
    const nextPath = `${pathname}${search}`;
    loginUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(loginUrl);
  }

  const policyKey = resolveRoutePolicyKey(pathname);
  if (!policyKey) {
    return NextResponse.next();
  }

  // Middleware has only refresh token, no role/permissions claims.
  // Effective role/permission checks are enforced in route guards and backend API.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-route-policy-key', policyKey);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|sign-in|forgot-password|api/authentication|.*\\..*).*)',
  ],
};
