import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export const proxy = auth((req: any) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const role: string = req.auth?.user?.role ?? '';
  const email: string = req.auth?.user?.email ?? '';

  if (pathname.startsWith('/api/auth')) return;

  // ── Super-admin login page ──────────────────────────────────────────────
  if (pathname.startsWith('/superadmin/login')) {
    if (isLoggedIn && role === 'super_admin' && email.endsWith('@pontufy.com')) {
      return NextResponse.redirect(new URL('/superadmin', req.nextUrl));
    }
    return;
  }

  // ── Super-admin protected zone (/superadmin/*) ──────────────────────────
  // Requires: authenticated + super_admin role + @pontufy.com email.
  // Returns 403 (not a redirect) to avoid leaking route existence to tenants.
  if (pathname.startsWith('/superadmin')) {
    const authorized =
      isLoggedIn &&
      role === 'super_admin' &&
      email.endsWith('@pontufy.com');

    if (!authorized) {
      return new NextResponse(null, { status: 403 });
    }
    return;
  }

  // ── Corporate auth pages ────────────────────────────────────────────────
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/register')
  ) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    return;
  }

  // ── Unauthenticated users → corporate login ─────────────────────────────
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // ── Tenant HR-admin zone (/admin/*) ────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin_rh') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
