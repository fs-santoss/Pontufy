'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import MetricCard from '@/components/admin/MetricCard';
import AISelectionTable from '@/components/admin/AISelectionTable';
import RewardToggleRow from '@/components/admin/RewardToggleRow';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { LayoutDashboard, LogOut, Sparkles, Loader2, BarChart3, ArrowLeft, Menu, X } from 'lucide-react';

type AdminView = 'overview' | 'analytics';

export default function AdminDashboardClient() {
  const [tenant, setTenant] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>('overview');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/tenant/branding').then((r) => r.json()),
      fetch('/api/admin/analytics').then((r) => r.json()),
      fetch('/api/courses?limit=50').then((r) => r.json()),
      fetch('/api/rewards?limit=50').then((r) => r.json()),
    ])
      .then(([tenantData, analyticsData, coursesData, rewardsData]) => {
        setTenant(tenantData);
        setAnalytics(analyticsData);
        setCourses(
          (coursesData.data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            status: c.status === 'published' ? 'Publicado' : 'Rascunho',
            enrolled: c.enrollmentCount ?? 0,
            date: new Date(c.createdAt).toLocaleDateString('pt-BR'),
          })),
        );
        setRewards(
          (rewardsData.data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            partner: r.partnerStore || 'Parceiro',
            points: r.pricePoints,
            active: r.isActive,
          })),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const summary = analytics?.summary || {};
  const metrics = [
    {
      id: 'm1',
      title: 'Colaboradores Ativos',
      value: String(summary.totalUsers ?? 0),
      trend: `${summary.totalCompletions ?? 0} conclusões`,
    },
    {
      id: 'm2',
      title: 'Pontos Distribuídos',
      value: (summary.totalPointsAwarded ?? 0).toLocaleString('pt-BR'),
      trend: 'Total acumulado',
    },
    {
      id: 'm3',
      title: 'Pontos Resgatados',
      value: (summary.totalPointsRedeemed ?? 0).toLocaleString('pt-BR'),
      trend: `${rewards.filter((r) => r.active).length} recompensas ativas`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

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
            <div className="text-xs font-medium text-gray-400 mt-2 uppercase tracking-widest">
              {tenant?.name || 'Empresa'}
            </div>
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
          <button
            type="button"
            onClick={() => { setActiveView('overview'); setNavOpen(false); }}
            className={`flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg font-bold transition-colors ${
              activeView === 'overview'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <LayoutDashboard size={20} /> Visão Geral
          </button>
          <button
            type="button"
            onClick={() => { setActiveView('analytics'); setNavOpen(false); }}
            className={`flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg font-bold transition-colors ${
              activeView === 'analytics'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <BarChart3 size={20} /> Analytics
          </button>
          <Link
            href="/admin/wizard"
            onClick={() => setNavOpen(false)}
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold"
          >
            <Sparkles size={20} /> IA Cursos
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-700 flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-semibold"
          >
            <ArrowLeft size={20} /> Visão do Colaborador
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
        <header className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-slate mb-1">Painel do Gestor de RH</h1>
            <p className="text-brand-text font-medium">
              Bem-vindo ao centro de comando da {tenant?.name || 'empresa'}.
            </p>
          </div>
        </header>

        {activeView === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {metrics.map((m) => (
                <MetricCard key={m.id} title={m.title} value={m.value} trend={m.trend} />
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="flex flex-col">
                <AISelectionTable courses={courses} />
              </div>
              <div className="flex flex-col">
                <RewardToggleRow catalog={rewards} />
              </div>
            </div>
          </>
        )}

        {activeView === 'analytics' && <AnalyticsDashboard />}
      </main>
    </div>
  );
}
