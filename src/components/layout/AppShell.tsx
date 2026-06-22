'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const NO_SHELL_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/superadmin',
  '/admin',
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = NO_SHELL_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="pt-[72px] flex-1">{children}</div>
      <Footer />
    </>
  );
}
