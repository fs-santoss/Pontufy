'use client';
import { useState } from 'react';
import { Gift } from 'lucide-react';

export default function RewardToggleRow({ catalog }: { catalog: any[] }) {
  const [items, setItems] = useState(catalog);

  const handleToggle = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const newActive = !item.active;
    setItems(items.map((i) => (i.id === id ? { ...i, active: newActive } : i)));

    try {
      const res = await fetch(`/api/rewards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: id, isActive: newActive }),
      });
      if (!res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, active: !newActive } : i)));
      }
    } catch {
      setItems(items.map((i) => (i.id === id ? { ...i, active: !newActive } : i)));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-12">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="text-brand-slate" size={20} />
          <h2 className="text-lg font-bold text-brand-slate">Controle do Catálogo de Recompensas</h2>
        </div>
        <p className="text-sm text-brand-text">
          Gerencie quais prêmios estarão visíveis no Clube de Benefícios da sua empresa.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white text-brand-text text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="px-6 py-4 font-semibold">Produto / Parceiro</th>
              <th className="px-6 py-4 font-semibold text-center">Valor (Pontos)</th>
              <th className="px-6 py-4 font-semibold text-right">Disponível no App</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className={`transition-colors ${item.active ? 'hover:bg-gray-50/50' : 'bg-gray-50 opacity-60'}`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-brand-slate">{item.title}</div>
                  <div className="text-xs font-semibold text-brand-text mt-1 uppercase tracking-wide">
                    Fornecedor: {item.partner}
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-emerald-600">{item.points} pts</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        item.active ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          item.active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
