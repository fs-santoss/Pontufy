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

/**
 * Standard password verification using timingSafeEqual to prevent timing attacks.
 */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes(':')) return false;

  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  try {
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
  } catch (err) {
    console.error('[auth] Password verification error:', err);
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

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.passwordHash) {
            console.log(`[auth] User not found or no password set: ${credentials.email}`);
            return null;
          }

          const isValid = await verifyPassword(
            credentials.password as string,
            user.passwordHash,
          );

          if (!isValid) {
            console.log(`[auth] Invalid password for: ${credentials.email}`);
            return null;
          }

          // Special domain check for super_admin role
          if (user.role === 'super_admin' && !user.email.endsWith('@pontufy.com')) {
            console.warn(`[auth] Unauthorized super_admin attempt: ${user.email}`);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            role: user.role,
          };
        } catch (err) {
          console.error('[auth] Authorize error:', err);
          return null;
        }
      },
    }),
  ],
});
