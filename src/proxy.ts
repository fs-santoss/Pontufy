import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes: login page and NextAuth internals
  if (pathname.startsWith('/api/auth')) return null;

  if (pathname.startsWith('/login')) {
    // Redirect already-authenticated users away from the login page
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    return null;
  }

  // All other routes require authentication
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // RBAC: only admin_rh may access /admin
  if (pathname.startsWith('/admin')) {
    const role = req.auth?.user?.role;
    if (role !== 'admin_rh') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
  }

  return null;
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
