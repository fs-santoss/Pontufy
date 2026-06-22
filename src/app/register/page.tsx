'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

function RegisterForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
        <p className="text-brand-slate font-semibold mb-2">Convite necessário</p>
        <p className="text-sm text-gray-500 mb-4">
          Para criar uma conta, você precisa de um convite do gestor da sua empresa.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-bold text-emerald-600 hover:text-emerald-500"
        >
          Já tenho uma conta
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100 text-center">
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
        <p className="text-brand-slate font-semibold mb-2">Conta criada com sucesso!</p>
        <p className="text-sm text-gray-500 mb-6">
          Agora você já pode acessar a plataforma.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-bold text-emerald-900 bg-gradient-pontufy hover:shadow-md transition-all"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Erro ao criar conta.');
      }
    } catch {
      setError('Erro ao conectar ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-rose-50 text-rose-500 text-sm p-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-brand-slate">
            Seu nome completo
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="mt-1 appearance-none block w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-brand-slate bg-gray-50/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-slate">Criar senha</label>
          <div className="mt-1 relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-brand-slate bg-gray-50/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-slate">
            Confirmar senha
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 appearance-none block w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-brand-slate bg-gray-50/50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-emerald-900 bg-gradient-pontufy hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Criar minha conta'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-500">
            Fazer login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-black text-brand-slate tracking-tight">
          Pontufy
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Crie sua conta para começar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={<div className="text-center text-gray-400">Carregando...</div>}
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
