'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Segment Error Caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
      <div className="w-16 h-16 mb-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Ops! Algo deu errado.</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        Ocorreu um erro ao carregar esta seção. Você pode tentar carregar novamente.
      </p>
      <button
        onClick={() => reset()}
        className="bg-brand-slate hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
