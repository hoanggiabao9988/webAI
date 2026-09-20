import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const apiKey = req.cookies.get('baodevai_key')?.value;

  const isProtected = pathname.startsWith('/chat');
  const isLogin = pathname === '/login';

  if (isProtected && !apiKey) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isLogin && apiKey) {
    return NextResponse.redirect(new URL('/chat', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/login'],
};
