import type { NextAuthConfig } from 'next-auth';

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  // Fail closed: the fallback below is a fixed, publicly-readable string. Silently
  // signing production JWTs with it would let anyone who reads this source forge a
  // session (including super_admin) — crash loudly instead of degrading silently.
  throw new Error(
    '[SECURITY] AUTH_SECRET não está definido em produção. Configure a variável de ' +
      'ambiente antes de iniciar a aplicação.',
  );
}

const authSecret = process.env.AUTH_SECRET || 'pontufy-dev-insecure-replace-in-production';

export const authConfig = {
  secret: authSecret,
  trustHost: true,
  providers: [],
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
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-authjs.session-token'
        : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
} satisfies NextAuthConfig;
