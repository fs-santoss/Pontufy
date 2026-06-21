'use client';
import { X, Gift } from 'lucide-react';

interface Product {
  pointsRequired: number;
  title: string;
  partner?: string;
}

interface RedemptionModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RedemptionModal({ product, isOpen, onClose }: RedemptionModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-slate/40 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-pontufy p-6 flex flex-col items-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 rounded-full p-1 transition-colors text-emerald-900"
          >
            <X size={20} />
          </button>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-3 text-emerald-500">
            <Gift size={32} />
          </div>
          <h2 className="text-xl font-black text-emerald-900 text-center">Resgate Concluído!</h2>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <p className="text-brand-slate font-medium mb-4">
            Você trocou <strong className="text-emerald-600">{product.pointsRequired} pontos</strong> com sucesso pelo item:
          </p>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-brand-slate">{product.title}</h3>
            <p className="text-sm text-brand-text mt-1">Parceiro: {product.partner}</p>
          </div>
          <p className="text-sm text-brand-text mb-6">
            As instruções de uso e o voucher foram enviados para o seu e-mail corporativo.
          </p>

          <button 
            onClick={onClose}
            className="w-full bg-brand-slate hover:bg-brand-slate/90 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Voltar para o Clube
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
