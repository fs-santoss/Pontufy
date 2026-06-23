"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type AutopilotResponse = {
  recommendedRewardId: string;
  aiMessage: string;
  discountedPoints: number;
};

export default function SurpriseRewardToast() {
  const [data, setData] = useState<AutopilotResponse | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Gatilho mock para testar a funcionalidade
  const triggerAutopilot = async () => {
    setIsLoading(true);
    try {
      // userId is derived server-side from the JWT — no client-supplied data needed
      const res = await fetch("/api/rewards/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setIsVisible(true);
      }
    } catch (err) {
      console.error("Failed to trigger autopilot:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante para forçar o Autopilot (Apenas no MVP para Review) */}
      <button
        type="button"
        onClick={triggerAutopilot}
        disabled={isLoading}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-brand-slate text-white px-3 sm:px-4 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 text-sm"
      >
        {isLoading ? (
          <span className="animate-pulse">Analisando Perfil...</span>
        ) : (
          <>
            <span>✨</span>
            <span>Testar Autopilot</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {isVisible && data && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-32 sm:bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* Header / Brand Gradient Bar */}
            <div className="h-2 bg-gradient-brand w-full"></div>
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-brand-slate text-lg">Oferta Relâmpago ⚡</h3>
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-brand-slate/80 leading-relaxed mb-4">
                "{data.aiMessage}"
              </p>

              <div className="bg-brand-gray rounded-xl p-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 block">Desconto IA:</span>
                  <span className="font-bold text-lg text-brand-slate">{data.discountedPoints} pts</span>
                </div>
                <div className="h-8 w-8 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-xs">
                  -10%
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/rewards/redeem', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rewardId: data.recommendedRewardId }),
                    });
                    const result = await res.json();
                    if (result.success && result.affiliateUrl) {
                      window.open(result.affiliateUrl, '_blank');
                    }
                  } catch (err) {
                    console.error('Autopilot redeem failed:', err);
                  }
                  setIsVisible(false);
                }}
                className="w-full bg-brand-slate text-white py-2.5 rounded-lg font-medium hover:bg-black transition-colors"
              >
                Resgatar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
