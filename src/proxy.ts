import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  
  // Public routes that don't need protection
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (isLoggedIn && pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
    return null;
  }
  
  // Require authentication for all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }
  
  // Role-Based Access Control (RBAC)
  if (pathname.startsWith('/admin')) {
    const role = req.auth?.user?.role;
    if (role !== 'admin_rh') {
      // Employees are blocked from /admin
      return NextResponse.redirect(new URL('/', req.nextUrl));
    }
  }
  
  return null;
});

export const config = {
  // Matches all routes except api, _next/static, _next/image, and favicon
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
