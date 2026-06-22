import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import MetricCard from '@/components/admin/MetricCard';
import AISelectionTable from '@/components/admin/AISelectionTable';
import RewardToggleRow from '@/components/admin/RewardToggleRow';
import adminData from '@/data/admin.json';
import { LayoutDashboard, LogOut, Settings, Sparkles } from 'lucide-react';

export default async function AdminDashboard() {
  const session = await auth();
  if (!session || session.user.role !== 'admin_rh') redirect('/dashboard');

  const { tenant, metrics, aiCourses, catalog } = adminData;

  return (
    <div className="min-h-screen bg-brand-gray flex">
      {/* Sidebar Admin (Simple mock) */}
      <aside className="w-64 bg-brand-slate text-white flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-700">
          <div className="text-2xl font-black tracking-tighter text-white">Pontufy <span className="text-emerald-400">Admin</span></div>
          <div className="text-xs font-medium text-gray-400 mt-2 uppercase tracking-widest">{tenant.companyName}</div>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <button type="button" className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
            <LayoutDashboard size={20} /> Visão Geral
          </button>
          <button type="button" className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold">
            <Sparkles size={20} /> IA Cursos
          </button>
          <button type="button" className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-semibold">
            <Settings size={20} /> Configurações
          </button>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button type="button" className="flex items-center gap-3 text-left w-full px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-semibold">
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 md:p-12">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-slate mb-1">Painel do Gestor de RH</h1>
            <p className="text-brand-text font-medium">Bem-vindo ao centro de comando da {tenant.companyName}.</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-brand-text uppercase tracking-wide mb-1">Setor Configurado</div>
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 border border-gray-200 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-brand-slate">{tenant.sector}</span>
            </div>
          </div>
        </header>

        {/* AI Credits Banner */}
        <div className="bg-gradient-pontufy rounded-xl p-6 mb-8 flex items-center justify-between shadow-sm border border-emerald-100">
          <div>
            <h3 className="font-black text-emerald-900 text-lg mb-1">Créditos de IA Disponíveis</h3>
            <p className="text-emerald-800 text-sm font-medium">Utilize para gerar novos treinamentos ultra-personalizados.</p>
          </div>
          <div className="text-4xl font-black text-emerald-700 flex items-center gap-2">
            <Sparkles size={32} /> {tenant.aiCredits}
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {metrics.map((m: any) => (
            <MetricCard key={m.id} title={m.title} value={m.value} trend={m.trend} />
          ))}
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="flex flex-col">
            <AISelectionTable courses={aiCourses} />
          </div>
          <div className="flex flex-col">
            <RewardToggleRow catalog={catalog} />
          </div>
        </div>
      </main>
    </div>
  );
}
