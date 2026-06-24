import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface PointsHistoryProps {
  history: {
    id: string;
    type: 'gain' | 'loss';
    description: string;
    date: string;
    amount: number;
  }[];
}

export default function PointsHistory({ history }: PointsHistoryProps) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-[#2a2a2a] overflow-hidden mb-12">
      <div className="px-6 py-4 border-b border-[#2a2a2a]">
        <h2 className="text-base font-bold text-white">Extrato Digital</h2>
        <p className="text-xs text-gray-500 mt-0.5">Histórico cronológico de movimentações.</p>
      </div>

      <div className="divide-y divide-[#1f1f1f]">
        {history.map((tx) => (
          <div
            key={tx.id}
            className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'gain'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {tx.type === 'gain' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              </div>

              <div>
                <div className="font-semibold text-white text-sm">{tx.description}</div>
                <div className="text-xs text-gray-600 mt-0.5">{tx.date}</div>
              </div>
            </div>

            <div
              className={`font-black text-base tabular-nums ${
                tx.type === 'gain' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {tx.type === 'gain' ? '+' : '-'}
              {tx.amount} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
