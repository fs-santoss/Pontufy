import NextAuth, { type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';
import { authConfig } from '@/auth.config';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    tenantId: string;
    role: string;
  }
}

const scryptAsync = promisify(scrypt);

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  try {
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
        };
      },
    }),
  ],
});
