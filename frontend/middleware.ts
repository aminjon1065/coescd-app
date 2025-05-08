import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/sign-in', '/api/authentication']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((publicPath) => pathname.startsWith(publicPath))) {
    return NextResponse.next()
  }

  const refreshToken = request.cookies.get('refreshToken')?.value

  if (!refreshToken) {
    const loginUrl = new URL('/sign-in', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|favicon.ico|sign-in|api/authentication|.*\\..*).*)',
  ],
}