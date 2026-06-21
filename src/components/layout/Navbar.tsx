'use client';
import { Search, Bell, User, Coins } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

export default function Navbar() {
  const user = useStore((s) => s.currentUser);
  const pointsBalance = useStore((s) => s.currentPointsBalance);

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="text-2xl font-black tracking-tighter text-brand-slate cursor-pointer">
          Pontufy <span className="text-sm font-medium text-brand-text ml-2 border-l border-gray-300 pl-2">{user.company}</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-brand-text">
          <a href="#" className="text-brand-slate transition-colors hover:text-emerald-500">Dashboard</a>
          <a href="#" className="transition-colors hover:text-emerald-500">Meus Cursos</a>
          <a href="#" className="transition-colors hover:text-emerald-500">Trilhas</a>
          <a href="#" className="transition-colors hover:text-emerald-500">Clube de Benefícios</a>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/wallet" className="flex items-center gap-2 bg-gradient-pontufy px-4 py-1.5 rounded-full shadow-sm shadow-emerald-100 cursor-pointer hover:shadow-md transition-shadow">
          <Coins size={18} className="text-emerald-700" />
          <span className="font-bold text-emerald-800">{pointsBalance} pts</span>
        </Link>
        <div className="flex items-center gap-4 text-brand-text">
          <Search size={20} className="cursor-pointer hover:text-brand-slate transition-colors" />
          <Bell size={20} className="cursor-pointer hover:text-brand-slate transition-colors" />
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer">
            <User size={18} className="text-brand-slate" />
          </div>
        </div>
      </div>
    </nav>
  );
}
