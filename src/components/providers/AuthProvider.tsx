'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';
import { useStore } from '@/store/useStore';

function SessionHydrator() {
  const { data: session, status } = useSession();
  const setUser = useStore((s) => s.setUser);
  const clearUser = useStore((s) => s.clearUser);
  const setPointsBalance = useStore((s) => s.setPointsBalance);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser({
        userId: session.user.id,
        tenantId: session.user.tenantId,
        role: session.user.role as 'admin_rh' | 'employee',
        name: session.user.name ?? '',
      });
      // Fetch real balance from DB (avoids stale JWT data)
      fetch('/api/users/me')
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.pointsBalance === 'number') {
            setPointsBalance(data.pointsBalance);
          }
        })
        .catch(() => {});
    } else if (status === 'unauthenticated') {
      clearUser();
    }
  }, [session, status, setUser, clearUser, setPointsBalance]);

  return null;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionHydrator />
      {children}
    </SessionProvider>
  );
}
