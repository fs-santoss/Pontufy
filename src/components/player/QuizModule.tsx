'use client';

import { useState } from 'react';

interface QuizQuestion {
  question: string;
  options: { text: string }[];
  correctIndex: number;
}

interface QuizModuleProps {
  module: string;
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
}

export default function QuizModule({ module, questions, onComplete }: QuizModuleProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[currentIdx];

  const handleConfirm = () => {
    if (selected === null) return;
    setConfirmed(true);
    if (selected === q.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
      onComplete(score, questions.length);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setConfirmed(false);
  };

  if (finished) {
    const finalScore = score;
    const passed = finalScore >= Math.ceil(questions.length * 0.6);
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <h3 className="text-xl font-bold text-brand-slate mb-2">Quiz: {module}</h3>
        <p className={`text-3xl font-black ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
          {finalScore}/{questions.length}
        </p>
        <p className="mt-2 text-brand-text">
          {passed ? 'Parabéns! Você passou no quiz.' : 'Tente novamente após revisar o conteúdo.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-brand-slate">Quiz: {module}</h3>
        <span className="text-sm text-brand-text">{currentIdx + 1}/{questions.length}</span>
      </div>

      <p className="text-brand-slate font-medium mb-4">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let style = 'border-gray-200 hover:border-emerald-300';
          if (confirmed) {
            if (idx === q.correctIndex) style = 'border-emerald-500 bg-emerald-50';
            else if (idx === selected) style = 'border-rose-400 bg-rose-50';
          } else if (idx === selected) {
            style = 'border-emerald-500 bg-emerald-50/50';
          }

          return (
            <button
              key={idx}
              onClick={() => !confirmed && setSelected(idx)}
              disabled={confirmed}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${style} ${confirmed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="font-medium text-brand-text mr-2">{String.fromCharCode(65 + idx)}.</span>
              <span className="text-brand-slate">{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selected === null}
            className="px-5 py-2 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {currentIdx + 1 >= questions.length ? 'Finalizar Quiz' : 'Próxima'}
          </button>
        )}
      </div>
    </div>
  );
}
