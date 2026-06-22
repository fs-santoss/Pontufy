import type { NextAuthConfig } from 'next-auth';
import { createHash } from 'crypto';

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
