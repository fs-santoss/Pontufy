'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import AIWizard from '@/components/admin/AIWizard';
import { LayoutDashboard, LogOut, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WizardPage() {
  const [tenantName, setTenantName] = useState('');
  const [aiCredits, setAiCredits] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/tenant/branding')
      .then((r) => r.json())
      .then((data) => setTenantName(data.name || 'Empresa'))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-brand-gray flex">
      <aside className="w-64 bg-brand-slate text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-700">
          <div className="text-2xl font-black tracking-tighter text-white">
            Pontufy <span className="text-emerald-400">Admin</span>
          </div>
          <div className="text-xs font-medium text-gray-400 mt-2 uppercase tracking-widest">{tenantName}</div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
          >
            <LayoutDashboard size={20} /> Visão Geral
          </Link>
          <Link
            href="/admin/wizard"
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
          >
            <Sparkles size={20} /> IA Cursos
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 md:p-12">
        <header className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-full hover:bg-gray-200 transition-colors text-brand-text hover:text-brand-slate"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold text-brand-slate mb-1">Gerador de Treinamentos</h1>
              <p className="text-brand-text font-medium">Automatize a criação de conteúdo corporativo com IA.</p>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <AIWizard />
        </div>
      </main>
    </div>
  );
}
