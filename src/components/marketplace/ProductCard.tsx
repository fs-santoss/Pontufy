import { Coins, CheckCircle2 } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    imageUrl?: string;
    partner?: string;
    pointsRequired: number;
  };
  userPoints: number;
  onRedeem: (product: any) => void;
}

export default function ProductCard({ product, userPoints, onRedeem }: ProductCardProps) {
  const canRedeem = userPoints >= product.pointsRequired;
  const progress = Math.min((userPoints / product.pointsRequired) * 100, 100);
  const pointsMissing = product.pointsRequired - userPoints;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-50 flex items-center justify-center p-4">
        <img 
          src={product.imageUrl} 
          alt={product.title} 
          className="max-h-full max-w-full object-contain mix-blend-multiply"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-brand-slate uppercase tracking-wider shadow-sm">
          No {product.partner}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-brand-slate text-base leading-tight mb-3 flex-1">
          {product.title}
        </h3>
        
        <div className="flex items-center gap-1.5 text-emerald-600 font-black text-lg mb-4">
          <Coins size={20} />
          {product.pointsRequired} pts
        </div>

        {/* Action Area */}
        {canRedeem ? (
          <button 
            onClick={() => onRedeem(product)}
            className="w-full bg-gradient-pontufy text-emerald-900 font-bold py-2.5 rounded-lg shadow-sm shadow-emerald-100 hover:shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            Resgatar <CheckCircle2 size={18} />
          </button>
        ) : (
          <div className="w-full flex flex-col gap-2">
            <button 
              disabled
              className="w-full bg-gray-100 text-gray-400 font-bold py-2.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
            >
              Resgatar
            </button>
            <div className="flex flex-col gap-1">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-300 rounded-full" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-[10px] text-brand-text font-semibold text-center">
                Faltam {pointsMissing} pts
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
