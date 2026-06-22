import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

export default async function SuperAdminPage() {
  const session = await auth();

  if (
    !session?.user ||
    session.user.role !== 'super_admin' ||
    !session.user.email?.endsWith('@pontufy.com')
  ) {
    redirect('/superadmin/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
      <ShieldCheck className="text-emerald-400" size={48} />
      <h1 className="text-2xl font-black">Pontufy Platform Console</h1>
      <p className="text-slate-400 text-sm">
        Bem-vindo, <strong className="text-white">{session.user.email}</strong>
      </p>
    </div>
  );
}
