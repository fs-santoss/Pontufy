'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Search, User, Coins, LogOut, Menu, X, LayoutDashboard, ShieldCheck, Award } from 'lucide-react';
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
  const [isScrolled, setIsScrolled] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as any)?.role;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    { href: '/dashboard', label: 'Início' },
    { href: '/cursos', label: 'Meus Cursos' },
    { href: '/loja', label: 'Benefícios' },
    { href: '/wallet', label: 'Carteira' },
    { href: '/certificados', label: 'Certificados' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 px-4 sm:px-8 py-3 transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? 'bg-[#141414]/96 backdrop-blur-sm shadow-lg shadow-black/50'
            : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Left: Logo + Desktop links */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-black tracking-tight text-white flex-shrink-0">
              <span className="text-emerald-400">Pontu</span>fy
            </Link>

            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                    isActive(link.href)
                      ? 'text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {role === 'admin_rh' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors ml-1"
                >
                  <LayoutDashboard size={14} />
                  Painel RH
                </Link>
              )}
              {role === 'super_admin' && (
                <Link
                  href="/superadmin"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors ml-1"
                >
                  <ShieldCheck size={14} />
                  Console
                </Link>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Points badge */}
            <Link
              href="/wallet"
              className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 px-3 py-1.5 rounded-full hover:bg-emerald-500/25 transition-colors text-sm"
            >
              <Coins size={14} className="text-emerald-400" />
              <span className="font-bold text-emerald-400">{pointsBalance}</span>
            </Link>

            {/* Search (desktop) */}
            <div className="hidden md:flex relative items-center">
              {isSearchOpen && (
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar cursos..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="absolute right-8 w-64 px-4 py-1.5 rounded-full text-sm bg-[#1f1f1f] border border-[#3a3a3a] text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                />
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
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
                  className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center hover:bg-emerald-500 transition-colors text-white font-black text-sm"
                >
                  {session?.user?.name?.[0]?.toUpperCase() ?? <User size={16} />}
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1f1f1f] rounded-xl shadow-2xl border border-[#2a2a2a] py-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#2a2a2a]">
                      <p className="text-sm font-semibold text-white truncate">
                        {session?.user?.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {session?.user?.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                    >
                      <LogOut size={15} />
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
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute top-[57px] left-0 right-0 bg-[#141414] border-b border-[#2a2a2a] shadow-2xl">
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar cursos..."
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#1f1f1f] border border-[#2a2a2a] text-white placeholder-gray-600 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="px-2 py-2 flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-white/10 text-white font-bold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {role === 'admin_rh' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-emerald-400 mt-1"
                >
                  <LayoutDashboard size={15} />
                  Painel RH
                </Link>
              )}
              {role === 'super_admin' && (
                <Link
                  href="/superadmin"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-violet-400 mt-1"
                >
                  <ShieldCheck size={15} />
                  Console
                </Link>
              )}
            </div>

            {status === 'authenticated' && (
              <div className="border-t border-[#2a2a2a] px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-md bg-emerald-600 flex items-center justify-center text-white font-black flex-shrink-0">
                    {session?.user?.name?.[0]?.toUpperCase() ?? <User size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  <LogOut size={15} />
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
