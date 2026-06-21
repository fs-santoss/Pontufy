'use client';
import { useState } from 'react';
import { Search, Bell, User, Coins, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const user = useStore((s) => s.currentUser);
  const pointsBalance = useStore((s) => s.currentPointsBalance);
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-2xl font-black tracking-tighter text-brand-slate cursor-pointer">
          Pontufy <span className="text-sm font-medium text-brand-text ml-2 border-l border-gray-300 pl-2">{user.company}</span>
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium text-brand-text">
          <Link href="/dashboard" className="text-brand-slate transition-colors hover:text-emerald-500">Página Inicial</Link>
          <Link href="/dashboard/cursos" className="transition-colors hover:text-emerald-500">Meus Cursos/Trilhas</Link>
          <Link href="/loja" className="transition-colors hover:text-emerald-500">Clube de Benefícios</Link>
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
          {status === 'authenticated' ? (
            <div className="relative">
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors"
              >
                <User size={18} className="text-brand-slate" />
              </div>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-sm font-semibold text-brand-slate truncate">{session?.user?.name || user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                  <Link href="/perfil" className="flex items-center gap-2 px-4 py-2 text-sm text-brand-slate hover:bg-gray-50 transition-colors">
                    <Settings size={16} /> Meu Perfil
                  </Link>
                  <button 
                    onClick={() => signOut()}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors">
              <User size={18} className="text-brand-slate" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
