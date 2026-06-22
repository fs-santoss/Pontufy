'use client';
import { useState } from 'react';

import CategoryFilter from '@/components/marketplace/CategoryFilter';
import ProductGrid from '@/components/marketplace/ProductGrid';
import CheckoutDrawer from '@/components/marketplace/CheckoutDrawer';
import { useStore } from '@/store/useStore';
import { useRewards } from '@/hooks/useApi';
import { Loader2 } from 'lucide-react';

const categories = [
  { id: 'all', name: 'Todos' },
  { id: 'tech', name: 'Tecnologia' },
  { id: 'health', name: 'Saúde' },
  { id: 'home', name: 'Utilidades' },
  { id: 'coupons', name: 'Cupons de Desconto' },
];

export default function MarketplacePage() {
  const userPoints = useStore((s) => s.currentPointsBalance);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const apiCategory = activeCategory === 'all' ? undefined : activeCategory;
  const { data: rewardsResponse, isLoading, mutate: refreshRewards } = useRewards(1, 50, apiCategory);
  const products = rewardsResponse?.data || [];

  const handleRedeem = (product: any) => {
    const price = product.pricePoints ?? product.pointsRequired ?? 0;
    if (userPoints >= price) {
      setSelectedProduct(product);
      setIsCheckoutOpen(true);
    }
  };

  const handleRedeemSuccess = (newBalance: number) => {
    useStore.getState().setPointsBalance(newBalance);
    refreshRewards();
  };

  return (
    <main className="pb-20 pt-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="px-8 md:px-16 mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Clube de Benefícios</h1>
          <p className="text-brand-text mt-2">Troque seu esforço por recompensas reais.</p>
        </div>

        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        ) : (
          <ProductGrid
            products={products}
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
        onSuccess={handleRedeemSuccess}
      />
    </main>
  );
}
