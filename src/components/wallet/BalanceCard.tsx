import { Coins, TrendingUp } from 'lucide-react';

interface BalanceCardProps {
  data: {
    pointsBalance: number;
    currentLevel: string;
    nextLevel: string;
    levelProgress: number;
  };
}

export default function BalanceCard({ data }: BalanceCardProps) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] p-6 sm:p-8 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      {/* Balance Info */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          <Coins size={13} className="text-amber-400" />
          Seu Saldo
        </div>
        <div className="flex items-end gap-3">
          <span className="text-5xl md:text-6xl font-black text-white tracking-tighter">
            {data.pointsBalance.toLocaleString('pt-BR')}
          </span>
          <span className="text-lg text-emerald-400 font-bold mb-1">pts</span>
        </div>
      </div>

      {/* Level Progress */}
      <div className="w-full md:w-1/2">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Nível Atual</div>
            <div className="text-base font-black text-white flex items-center gap-1.5">
              <TrendingUp size={15} className="text-emerald-400" />
              {data.currentLevel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">
              Próximo
            </div>
            <div className="text-sm font-bold text-emerald-400">{data.nextLevel}</div>
          </div>
        </div>

        <div className="w-full h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${data.levelProgress}%`,
              background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
            }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-gray-600 mt-1.5">
          <span>{data.levelProgress}% concluído</span>
          <span>{100 - data.levelProgress}% para {data.nextLevel}</span>
        </div>
      </div>
    </div>
  );
}
