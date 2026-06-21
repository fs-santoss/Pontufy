import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/backend/db';
import { authConfig } from '@/auth.config';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    tenantId: string;
    role: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // Note: For this MVP and seeded data, we are simulating password validation
        // In production, you would compare bcrypt hashes here
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });
        
        if (!user) return null;
        
        // Inject essential data for the multitenant token
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role
        };
      }
    })
  ]
});
