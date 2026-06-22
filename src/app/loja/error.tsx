'use client';

export default function LojaError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold text-brand-slate">Erro ao carregar o Clube de Benefícios</h2>
      <p className="text-brand-text">Algo deu errado. Tente novamente.</p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
