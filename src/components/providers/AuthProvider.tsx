'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function AuthProvider({ children }: { children: ReactNode }) {
  // O SessionProvider do next-auth/react roda inteiramente no cliente.
  // IMPORTANTE: Nunca importe `auth` ou `authConfig` aqui para não quebrar o Edge/Turbopack.
  return <SessionProvider>{children}</SessionProvider>;
}
