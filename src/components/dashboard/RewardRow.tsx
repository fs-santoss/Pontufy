import { Gift, Lock } from 'lucide-react';

export default function RewardRow({ title, rewards }: { title: string, rewards: any[] }) {
  return (
    <div className="relative px-8 md:px-16 mb-12 py-8 bg-gradient-to-r from-gray-50 to-white border-y border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <Gift className="text-emerald-500" size={24} />
        <h2 className="text-2xl font-black text-brand-slate tracking-tight">{title}</h2>
      </div>
      
      <div className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
        {rewards.map((reward) => (
          <div 
            key={reward.id} 
            className="flex-none w-[320px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
          >
            <div className="flex h-32">
              <div className="w-1/3 bg-gray-100 relative">
                <img 
                  src={reward.thumbnail} 
                  alt={reward.title} 
                  className="w-full h-full object-cover mix-blend-multiply"
                />
              </div>
              <div className="w-2/3 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{reward.brand}</span>
                  <h3 className="font-bold text-brand-slate text-sm leading-tight mt-1">{reward.title}</h3>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="text-emerald-600 font-bold text-sm">
                    {reward.pointsRequired} pts
                  </div>
                  <div className="text-gray-300">
                    <Lock size={16} />
                  </div>
                </div>
              </div>
            </div>
            {/* Fake progress bar to show they are "almost there" */}
            <div className="w-full h-1.5 bg-gray-100">
              <div className="h-full bg-gradient-pontufy w-[85%] rounded-r-full"></div>
            </div>
            <div className="px-4 py-2 bg-gray-50 text-[10px] text-center text-gray-500 font-medium">
              Faltam apenas {reward.pointsRequired - 1250} pontos!
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
