'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Bell, User, Coins, LogOut, Menu, X, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const pointsBalance = useStore((s) => s.currentPointsBalance);
  const setSearchQuery = useStore((s) => s.setSearchQuery);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as any)?.role;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
    },
    [setSearchQuery],
  );

  const navLinks = [
    { href: '/dashboard', label: 'Página Inicial' },
    { href: '/cursos', label: 'Meus Cursos' },
    { href: '/loja', label: 'Benefícios' },
    { href: '/wallet', label: 'Carteira' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Desktop links */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-2xl font-black tracking-tighter text-brand-slate"
            >
              Pontufy
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-brand-text hover:text-brand-slate hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {role === 'admin_rh' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors ml-1"
                >
                  <LayoutDashboard size={15} />
                  Painel RH
                </Link>
              )}
              {role === 'super_admin' && (
                <Link
                  href="/superadmin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors ml-1"
                >
                  <ShieldCheck size={15} />
                  Console
                </Link>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Points badge */}
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 bg-gradient-pontufy px-3 py-1.5 rounded-full shadow-sm shadow-emerald-100 hover:shadow-md transition-shadow text-sm"
            >
              <Coins size={16} className="text-emerald-700" />
              <span className="font-bold text-emerald-800">{pointsBalance}</span>
            </Link>

            {/* Search (desktop) */}
            <div className="hidden md:flex relative items-center">
              {isSearchOpen && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="absolute right-8 w-56 px-3 py-1.5 rounded-full shadow-sm border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-brand-text hover:text-brand-slate transition-colors"
              >
                <Search size={18} />
              </button>
            </div>

            {/* User menu (desktop) */}
            {status === 'authenticated' && (
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors"
                >
                  <User size={18} className="text-brand-slate" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-brand-slate truncate">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                    >
                      <LogOut size={16} />
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile: hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-brand-text"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-[57px] left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
            {/* Mobile search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Buscar cursos..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                />
              </div>
            </div>

            {/* Mobile nav links */}
            <div className="px-2 py-2 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-brand-slate hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {role === 'admin_rh' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-emerald-700 bg-emerald-50 mt-1"
                >
                  <LayoutDashboard size={16} />
                  Painel RH
                </Link>
              )}
              {role === 'super_admin' && (
                <Link
                  href="/superadmin"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-violet-700 bg-violet-50 mt-1"
                >
                  <ShieldCheck size={16} />
                  Console
                </Link>
              )}
            </div>

            {/* Mobile user info + logout */}
            {status === 'authenticated' && (
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-brand-slate" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-slate truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <LogOut size={16} />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
