'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar email.');
      }
    } catch {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)',
        }}
      />

      <Link href="/" className="mb-10 text-3xl font-black tracking-tight text-white">
        <span className="text-emerald-400">Pontu</span>fy
      </Link>

      <div className="w-full max-w-sm">
        {sent ? (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl shadow-black/50 text-center">
            <p className="text-white font-semibold mb-2">Email enviado!</p>
            <p className="text-sm text-gray-500 mb-6">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Voltar para login
            </Link>
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl shadow-black/50">
            <h1 className="text-xl font-bold text-white mb-1">Recuperar senha</h1>
            <p className="text-gray-500 text-sm mb-6">
              Informe seu email para receber o link de redefinição
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 text-sm transition-colors"
                  placeholder="voce@empresa.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#141414] disabled:opacity-50 disabled:cursor-not-allowed gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="animate-spin" size={18} /> Enviando...</>
                ) : (
                  'Enviar link de recuperação'
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/login"
                  className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Voltar para login
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
