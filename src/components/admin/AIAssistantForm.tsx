'use client';

import { useState, useTransition } from 'react';
import { generateTrainingCourse } from '@/actions/course-generator';

export default function AIAssistantForm() {
  const [prompt, setPrompt] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = () => {
    if (!prompt.trim() || isPending) return;
    setFeedback(null);

    startTransition(async () => {
      const result = await generateTrainingCourse({ prompt });

      if (result.success) {
        setFeedback({
          type: 'success',
          text: `Curso "${result.course.title}" criado com ${result.lessonsCount} aulas. Créditos restantes: ${result.creditsRemaining}.`,
        });
        setPrompt('');
      } else {
        setFeedback({ type: 'error', text: result.error });
      }
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 max-w-2xl">
      <h2 className="text-lg font-bold text-brand-slate mb-4">Assistente IA — Gerar Treinamento</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isPending}
        placeholder="Descreva o objetivo do treinamento que deseja criar (mín. 10 caracteres)..."
        className="w-full h-32 bg-gray-50 border border-gray-200 rounded-lg p-3 text-brand-slate text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 resize-none disabled:opacity-50 transition-all"
      />

      {feedback && (
        <p className={`mt-3 text-sm font-medium ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {feedback.text}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending || prompt.trim().length < 10}
        className="mt-4 w-full sm:w-auto bg-brand-slate text-white font-bold px-6 py-2.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-colors"
      >
        {isPending ? 'Processando com IA (pode levar 1 minuto)...' : 'Gerar Treinamento'}
      </button>
    </div>
  );
}
