
import BalanceCard from '@/components/wallet/BalanceCard';
import PointsHistory from '@/components/wallet/PointsHistory';
import BadgesGallery from '@/components/wallet/BadgesGallery';
import walletData from '@/data/wallet.json';

export default function WalletPage() {
  const { user, pointsHistory, badges } = walletData;

  return (
    <main className="pb-20 pt-8">

      
      <div className="max-w-[1000px] mx-auto px-6 md:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Central de Conquistas</h1>
          <p className="text-brand-text mt-1">Acompanhe seu esforço e recompensas validadas pela IA.</p>
        </header>

        {/* Balance & Progress */}
        <BalanceCard data={user} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left Column: Transaction History */}
          <div className="lg:col-span-3">
            <PointsHistory history={pointsHistory as { id: string; type: "gain" | "loss"; description: string; date: string; amount: number; }[]} />
          </div>

          {/* Right Column: Badges */}
          <div className="lg:col-span-2">
            <BadgesGallery badges={badges} />
          </div>
        </div>
      </div>
    </main>
  );
}
