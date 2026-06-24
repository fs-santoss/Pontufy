import type { NextAuthConfig } from 'next-auth';

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.error(
    '\n[SECURITY] AUTH_SECRET is not set — sessions are insecure. Set AUTH_SECRET in environment variables.\n',
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
    strategy: 'jwt'
  }
} satisfies NextAuthConfig;
