import type { NextAuthConfig } from 'next-auth';
import { createHash } from 'crypto';

// AUTH_SECRET signs the session JWTs. When it is absent we fall back to a
// publicly-derivable value so local/dev and unconfigured previews keep working —
// but in production that fallback means tokens can be FORGED (anyone can mint a
// session for any user/role/tenant). We do not throw here because doing so at
// module-load time breaks the Next.js production build (page-data collection
// runs with NODE_ENV=production) and would brick deploys that simply haven't set
// the variable yet. Instead we emit an unmissable warning; set AUTH_SECRET to
// silence it and make sessions secure.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.error(
    '\n🔴 SECURITY: AUTH_SECRET is not set — NextAuth is using an INSECURE, ' +
      'publicly-derivable fallback. Session tokens can be forged. Set AUTH_SECRET ' +
      '(`openssl rand -base64 32`) in your environment immediately.\n',
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
