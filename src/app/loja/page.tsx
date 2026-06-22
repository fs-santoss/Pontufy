'use client';
import { useState } from 'react';

import PromoBanner from '@/components/marketplace/PromoBanner';
import CategoryFilter from '@/components/marketplace/CategoryFilter';
import ProductGrid from '@/components/marketplace/ProductGrid';
import CheckoutDrawer from '@/components/marketplace/CheckoutDrawer';
import marketplaceData from '@/data/marketplace.json';
import { useStore } from '@/store/useStore';
import { useRewards } from '@/hooks/useApi';

export default function MarketplacePage() {
  const { banners, categories, products: mockProducts } = marketplaceData;
  const userPoints = useStore((s) => s.currentPointsBalance);
  const { data: rewardsResponse } = useRewards();
  const apiProducts = rewardsResponse?.data || [];

  const products = apiProducts.length ? apiProducts : mockProducts;

  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const filteredProducts = activeCategory === 'all'
    ? products
    : products?.filter((p: any) => (p.category ?? p.partnerStore) === activeCategory) || [];

  const handleRedeem = (product: any) => {
    const price = product.pricePoints ?? product.pointsRequired ?? 0;
    if (userPoints >= price) {
      setSelectedProduct(product);
      setIsCheckoutOpen(true);
    }
  };

  return (
    <main className="pb-20 pt-8">
      {/* Navbar uses global state, updating dynamically */}
      
      <div className="max-w-[1600px] mx-auto">
        <div className="px-8 md:px-16 mb-8">
          <h1 className="text-3xl font-extrabold text-brand-slate">Clube de Benefícios</h1>
          <p className="text-brand-text mt-2">Troque seu esforço por recompensas reais.</p>
        </div>

        <PromoBanner banners={banners} />
        
        <CategoryFilter 
          categories={categories} 
          activeCategory={activeCategory} 
          onSelect={setActiveCategory} 
        />
        
        <ProductGrid 
          products={filteredProducts} 
          userPoints={userPoints} 
          onRedeem={handleRedeem}
        />
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
