'use client';
import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

export default function PointsCelebration({ points, isVisible, onComplete }: any) {
  const [show, setShow] = useState(false);
  const [lastVisible, setLastVisible] = useState(false);

  if (isVisible !== lastVisible) {
    setLastVisible(isVisible);
    setShow(isVisible);
  }

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setShow(false);
        if (onComplete) onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Background overlay flash */}
      <div className="absolute inset-0 bg-emerald-500/10 animate-[pulse_1s_ease-out]"></div>
      
      {/* Celebration Card */}
      <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl border border-emerald-100 flex flex-col items-center gap-3 animate-[bounce-in_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)] transform scale-110">
        <div className="bg-emerald-100 p-4 rounded-full">
          <Coins size={48} className="text-emerald-500 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-brand-slate">Incrível!</h2>
        <p className="text-brand-text">Você acaba de ganhar</p>
        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
          +{points} Pontos
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
