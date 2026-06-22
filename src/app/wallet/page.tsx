'use client';

import { useStore } from '@/store/useStore';
import { usePointsHistory } from '@/hooks/useApi';
import BalanceCard from '@/components/wallet/BalanceCard';
import PointsHistory from '@/components/wallet/PointsHistory';
import BadgesGallery from '@/components/wallet/BadgesGallery';
import walletData from '@/data/wallet.json';

export default function WalletPage() {
  const currentUser = useStore((s) => s.currentUser);
  const pointsBalance = useStore((s) => s.currentPointsBalance);
  const { data: apiHistory } = usePointsHistory();

  const history = apiHistory?.length ? apiHistory : walletData.pointsHistory;
  const { badges } = walletData;

  const userData = {
    name: currentUser?.name || walletData.user.name,
    pointsBalance: pointsBalance || walletData.user.pointsBalance,
    currentLevel: walletData.user.currentLevel,
    nextLevel: walletData.user.nextLevel,
    levelProgress: walletData.user.levelProgress,
  };

  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Central de Conquistas</h1>
          <p className="text-brand-text mt-1">Acompanhe seu esforço e recompensas validadas pela IA.</p>
        </header>

        <BalanceCard data={userData} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-3">
            <PointsHistory history={history as { id: string; type: "gain" | "loss"; description: string; date: string; amount: number; }[]} />
          </div>
          <div className="lg:col-span-2">
            <BadgesGallery badges={badges} />
          </div>
        </div>
      </div>
    </main>
  );
}
