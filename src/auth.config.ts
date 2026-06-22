import type { NextAuthConfig } from 'next-auth';
import { createHash } from 'crypto';

// In production AUTH_SECRET is mandatory: a missing secret would silently fall
// back to a publicly-derivable value, letting anyone forge session JWTs and
// impersonate any user/role/tenant. Fail closed instead of booting insecurely.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'AUTH_SECRET is required in production. Generate one with `openssl rand -base64 32` and set it as an environment variable.',
  );
}

const authSecret =
  process.env.AUTH_SECRET ||
  createHash('sha256').update('pontufy-dev-secret-replace-in-production').digest('base64');

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
    strategy: 'jwt'
  }
} satisfies NextAuthConfig;
