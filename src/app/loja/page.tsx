'use client';
import { useState } from 'react';

import PromoBanner from '@/components/marketplace/PromoBanner';
import CategoryFilter from '@/components/marketplace/CategoryFilter';
import ProductGrid from '@/components/marketplace/ProductGrid';
import CheckoutDrawer from '@/components/marketplace/CheckoutDrawer';
import { useStore } from '@/store/useStore';
import { useRewards } from '@/lib/hooks/useRewards';

// Static banners — no banners API exists
const staticBanners = [
  {
    id: 'b1',
    imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=900',
    title: 'Semana de Descontos',
    subtitle: 'Até 40% menos pontos em produtos selecionados',
  },
  {
    id: 'b2',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=900',
    title: 'Novos Parceiros',
    subtitle: 'Amazon, Magazine Luiza e mais entraram no catálogo',
  },
];

export default function MarketplacePage() {
  const userPoints = useStore((s) => s.currentPointsBalance);
  const { rewards, isLoading } = useRewards();

  // Derive categories from actual reward data
  const categories = [
    { id: 'all', name: 'Todos' },
    ...Array.from(new Set(rewards.map((r) => r.partnerStore)))
      .sort()
      .map((store) => ({ id: store, name: store.charAt(0).toUpperCase() + store.slice(1) })),
  ];

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter products
  const filteredProducts =
    activeCategory === 'all'
      ? rewards
      : rewards.filter((p) => p.partnerStore === activeCategory);

  const handleRedeem = (product: any) => {
    if (userPoints >= product.pointsRequired) {
      setSelectedProduct(product);
      setIsCheckoutOpen(true);
    }
  };

  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="px-8 md:px-16 mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Clube de Benefícios</h1>
          <p className="text-brand-text mt-2">Troque seu esforço por recompensas reais.</p>
        </div>

        <PromoBanner banners={staticBanners} />

        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {isLoading ? (
          <div className="px-8 md:px-16 py-12 flex justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-brand-text font-medium">Carregando recompensas...</p>
            </div>
          </div>
        ) : (
          <ProductGrid
            products={filteredProducts}
            userPoints={userPoints}
            onRedeem={handleRedeem}
          />
        )}
      </div>

      <CheckoutDrawer
        reward={selectedProduct}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        userBalance={userPoints}
      />
    </main>
  );
}
