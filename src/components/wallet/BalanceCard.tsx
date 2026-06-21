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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 animate-[fadeIn_0.3s_ease-out]">
      {/* Balance Info */}
      <div>
        <h2 className="text-sm font-bold text-brand-text uppercase tracking-widest mb-1">Seu Saldo</h2>
        <div className="text-5xl md:text-6xl font-black text-brand-slate tracking-tighter">
          {data.pointsBalance} <span className="text-2xl text-emerald-500 font-bold tracking-normal">PONTOS</span>
        </div>
      </div>

      {/* Level Progress */}
      <div className="w-full md:w-1/2">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-xs font-bold text-brand-text uppercase tracking-wider">Nível Atual</div>
            <div className="text-lg font-bold text-brand-slate">{data.currentLevel}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-brand-text uppercase tracking-wider">Próximo: {data.nextLevel}</div>
            <div className="text-sm font-bold text-emerald-600">{data.levelProgress}%</div>
          </div>
        </div>
        
        {/* Progress Bar with Thin Gradient */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-pontufy rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${data.levelProgress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
