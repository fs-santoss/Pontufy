'use client';
import { useState, useRef, useCallback } from 'react';
import { Search, Bell, User, Coins, LogOut, Settings } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pointsBalance = useStore((s) => s.currentPointsBalance);

  const setSearchQuery = useStore((s) => s.setSearchQuery);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, [setSearchQuery]);

  return (
    <nav className="fixed top-0 w-full z-50 transition-all duration-300 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="text-2xl font-black tracking-tighter text-brand-slate cursor-pointer">
          Pontufy
        </Link>
        <div className="hidden md:flex gap-6 text-sm font-medium text-brand-text">
          <Link href="/dashboard" className="text-brand-slate transition-colors hover:text-emerald-500">Página Inicial</Link>
          <Link href="/cursos" className="transition-colors hover:text-emerald-500">Meus Cursos/Trilhas</Link>
          <Link href="/loja" className="transition-colors hover:text-emerald-500">Clube de Benefícios</Link>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/wallet" className="flex items-center gap-2 bg-gradient-pontufy px-4 py-1.5 rounded-full shadow-sm shadow-emerald-100 cursor-pointer hover:shadow-md transition-shadow">
          <Coins size={18} className="text-emerald-700" />
          <span className="font-bold text-emerald-800">{pointsBalance} pts</span>
        </Link>
        <div className="flex items-center gap-4 text-brand-text">
          
          <div className="relative flex items-center">
             {isSearchOpen && (
               <input 
                 type="text"
                 autoFocus
                 placeholder="Buscar trilhas..."
                 value={localSearch}
                 onChange={(e) => handleSearchChange(e.target.value)}
                 className="absolute right-8 w-64 px-4 py-1.5 rounded-full shadow-sm border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
               />
             )}
             <Search 
               size={20} 
               onClick={() => setIsSearchOpen(!isSearchOpen)}
               className="cursor-pointer hover:text-brand-slate transition-colors" 
             />
          </div>

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
                    <p className="text-sm font-semibold text-brand-slate truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                  <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 text-sm text-brand-slate hover:bg-gray-50 transition-colors">
                    <Settings size={16} /> Meu Perfil
                  </Link>
                  <button 
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> Terminar Sessão
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => signIn()} className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors">
              <User size={18} className="text-brand-slate" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
