'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react';

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
      const finalScore = confirmed && selected === q.correctIndex ? score : score;
      setFinished(true);
      onComplete(finalScore, questions.length);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setConfirmed(false);
  };

  if (finished) {
    const passed = score >= Math.ceil(questions.length * 0.6);
    return (
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 text-center">
        <Trophy size={40} className={`mx-auto mb-4 ${passed ? 'text-amber-400' : 'text-gray-600'}`} />
        <h3 className="text-lg font-bold text-white mb-1">{module}</h3>
        <p className={`text-4xl font-black mb-2 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {score}/{questions.length}
        </p>
        <p className={`text-sm ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
          {passed ? 'Parabéns! Você passou no quiz.' : 'Revise o conteúdo e tente novamente.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-white">{module}</h3>
        <span className="text-xs text-gray-600 font-medium">{currentIdx + 1}/{questions.length}</span>
      </div>

      {/* Progress */}
      <div className="h-0.5 bg-[#2a2a2a] rounded-full mb-5">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-white font-medium text-sm mb-5 leading-relaxed">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let cls = 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white';
          if (confirmed) {
            if (idx === q.correctIndex) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
            else if (idx === selected) cls = 'border-red-500 bg-red-500/10 text-red-400';
          } else if (idx === selected) {
            cls = 'border-emerald-500 bg-emerald-500/10 text-white';
          }

          return (
            <button
              key={idx}
              onClick={() => !confirmed && setSelected(idx)}
              disabled={confirmed}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all bg-[#141414] ${cls} ${
                confirmed ? 'cursor-default' : 'cursor-pointer'
              } flex items-center gap-3`}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-black">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{opt.text}</span>
              {confirmed && idx === q.correctIndex && (
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              )}
              {confirmed && idx === selected && idx !== q.correctIndex && (
                <XCircle size={16} className="text-red-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selected === null}
            className="px-6 py-2.5 rounded-lg font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-lg font-bold text-sm bg-white text-black hover:bg-gray-200 transition-colors"
          >
            {currentIdx + 1 >= questions.length ? 'Ver Resultado' : 'Próxima →'}
          </button>
        )}
      </div>
    </div>
  );
}
