'use client';

import { useWallet } from '@/lib/hooks/useWallet';
import { useStore } from '@/store/useStore';
import BalanceCard from '@/components/wallet/BalanceCard';
import PointsHistory from '@/components/wallet/PointsHistory';
import BadgesGallery from '@/components/wallet/BadgesGallery';

// Static badge data — no Badge model in Prisma yet
const staticBadges = [
  { id: 'b1', title: 'Primeiro Login', icon: '🚀', earned: true },
  { id: 'b2', title: 'Primeira Aula', icon: '📖', earned: true },
  { id: 'b3', title: '5 Aulas Completas', icon: '🔥', earned: false },
  { id: 'b4', title: 'Primeiro Resgate', icon: '🎁', earned: false },
  { id: 'b5', title: 'Streak de 7 Dias', icon: '⚡', earned: false },
  { id: 'b6', title: 'Top 10% do Ranking', icon: '🏆', earned: false },
];

export default function WalletPage() {
  const { user, history, isLoading } = useWallet();
  const storeBalance = useStore((s) => s.currentPointsBalance);

  // Prefer Zustand's optimistic balance, fall back to API data
  const pointsBalance = storeBalance > 0 ? storeBalance : (user?.pointsBalance ?? 0);

  const balanceData = {
    pointsBalance,
    currentLevel: pointsBalance >= 1000 ? 'Ouro' : pointsBalance >= 500 ? 'Prata' : 'Bronze',
    nextLevel: pointsBalance >= 1000 ? 'Diamante' : pointsBalance >= 500 ? 'Ouro' : 'Prata',
    levelProgress: Math.min(
      Math.round(
        (pointsBalance / (pointsBalance >= 1000 ? 2000 : pointsBalance >= 500 ? 1000 : 500)) * 100,
      ),
      100,
    ),
  };

  if (isLoading) {
    return (
      <main className="pb-20 pt-8">
        <div className="max-w-[1000px] mx-auto px-6 md:px-8 flex items-center justify-center h-[40vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-brand-text font-medium">Carregando carteira...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Central de Conquistas</h1>
          <p className="text-brand-text mt-1">Acompanhe seu esforço e recompensas validadas pela IA.</p>
        </header>

        <BalanceCard data={balanceData} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <PointsHistory
              history={
                history as {
                  id: string;
                  type: 'gain' | 'loss';
                  description: string;
                  date: string;
                  amount: number;
                }[]
              }
            />
          </div>

          <div className="lg:col-span-2">
            <BadgesGallery badges={staticBadges} />
          </div>
        </div>
      </div>
    </main>
  );
}
