'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import AIWizard from '@/components/admin/AIWizard';
import { LayoutDashboard, LogOut, Sparkles, ArrowLeft, Users, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function WizardPage() {
  const [tenantName, setTenantName] = useState('');
  const [aiCredits, setAiCredits] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/tenant/branding')
      .then((r) => r.json())
      .then((data) => setTenantName(data.name || 'Empresa'))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-brand-gray md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-brand-slate text-white px-4 py-3 shadow-md">
        <div className="text-xl font-black tracking-tighter">
          Pontufy <span className="text-emerald-400">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {navOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`w-64 bg-brand-slate text-white flex flex-col fixed h-full z-50 transition-transform duration-200 md:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-gray-700 flex items-start justify-between">
          <div>
            <div className="text-2xl font-black tracking-tighter text-white">
              Pontufy <span className="text-emerald-400">Admin</span>
            </div>
            <div className="text-xs font-medium text-gray-400 mt-2 uppercase tracking-widest">{tenantName}</div>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-white/10 transition-colors -mr-1"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link
            href="/admin"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
          >
            <LayoutDashboard size={20} /> Visão Geral
          </Link>
          <Link
            href="/admin/wizard"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30"
          >
            <Sparkles size={20} /> IA Cursos
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
          >
            <Users size={20} /> Visão do Colaborador
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-5 sm:p-8 md:p-12">
        <header className="mb-8 md:mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-full hover:bg-gray-200 transition-colors text-brand-text hover:text-brand-slate flex-shrink-0"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-slate mb-1">Gerador de Treinamentos</h1>
              <p className="text-brand-text font-medium text-sm sm:text-base">Automatize a criação de conteúdo corporativo com IA.</p>
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
