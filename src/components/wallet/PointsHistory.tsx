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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-12 animate-[fadeIn_0.4s_ease-out]">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-lg font-bold text-brand-slate">Extrato Digital</h2>
        <p className="text-sm text-brand-text">Histórico cronológico de movimentações de pontos.</p>
      </div>

      <div className="divide-y divide-gray-100">
        {history.map((tx) => (
          <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              {/* Icon Based on Gain/Loss */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                tx.type === 'gain' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-100 text-brand-slate'
              }`}>
                {tx.type === 'gain' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              </div>
              
              <div>
                <div className="font-bold text-brand-slate text-sm">{tx.description}</div>
                <div className="text-xs font-semibold text-brand-text mt-0.5">{tx.date}</div>
              </div>
            </div>

            {/* Amount */}
            <div className={`font-black text-lg ${
              tx.type === 'gain' ? 'text-emerald-500' : 'text-brand-slate'
            }`}>
              {tx.type === 'gain' ? '+' : '-'}{tx.amount} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
