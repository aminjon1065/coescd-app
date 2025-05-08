import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const refreshToken = request.cookies.get('refreshToken')?.value

  // Разрешить доступ к публичным маршрутам
  const publicPaths = ['/sign-in', '/api/authentication']
  if (publicPaths.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // Если нет токена, редирект на /sign-in
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return NextResponse.next()
}