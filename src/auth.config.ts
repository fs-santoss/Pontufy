import type { NextAuthConfig } from 'next-auth';

// In Next.js 15+ / Auth.js v5, we must ensure AUTH_SECRET is set.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.warn(
    '\n[SECURITY WARNING] AUTH_SECRET is not set in production. ' +
    'This is a critical security risk. Please set it immediately.\n'
  );
}

const authSecret = process.env.AUTH_SECRET || 'pontufy-dev-insecure-replace-in-production';

export const authConfig = {
  secret: authSecret,
  trustHost: true,
  providers: [], // Providers are added in auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith('/api');
      const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
      const isPublicRoute = ['/', '/privacidade', '/termos'].includes(nextUrl.pathname);

      if (isApiRoute || isPublicRoute || isAuthRoute) {
        return true;
      }

      return isLoggedIn;
    },
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  session: {
    strategy: 'jwt',
  },
} satisfies NextAuthConfig;
