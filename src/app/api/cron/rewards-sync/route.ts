import { NextResponse } from 'next/server';
import { prisma } from '@/backend/db';

export const dynamic = 'force-dynamic'; // Prevent static caching for cron endpoints

/**
 * Automatic Stock Synchronizer & Catalog Controller
 * Vercel Cron target: /api/cron/rewards-sync
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate Cron Request (ensure it's from Vercel or an internal trigger)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch all active rewards across the platform
    const activeRewards = await prisma.reward.findMany({
      where: {
        isActive: true
      }
    });

    let syncStats = {
      checked: activeRewards.length,
      deactivated: 0,
      errors: 0
    };

    // 3. Loop and simulate affiliate stock/link check
    for (const reward of activeRewards) {
      try {
        // Simulated: checkAffiliateStock(reward.affiliateLink)
        const isOutOfStockOrBroken = await simulateAffiliateCheck(reward.affiliateLink);

        if (isOutOfStockOrBroken) {
          // Transactional toggle to avoid fulfilling dead redemptions
          await prisma.$transaction(async (tx: any) => {
            await tx.reward.update({
              where: { id: reward.id },
              data: { isActive: false }
            });
          });
          syncStats.deactivated++;
          console.warn(`[CATALOG SYNC] Recompensa desativada: ${reward.id} - ${reward.title} (Esgotada/Quebrada)`);
        }
      } catch (error) {
         console.error(`[CATALOG SYNC] Erro ao sincronizar recompensa ${reward.id}:`, error);
         syncStats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronização de catálogo concluída.',
      stats: syncStats
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CRON JOB] Erro fatal no rewards-sync:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * Mock function to simulate affiliate network API response
 * E.g., calling Lomadee/Amazon to verify 404 or out-of-stock XML tag.
 */
async function simulateAffiliateCheck(affiliateLink: string): Promise<boolean> {
  // Simulating network latency
  await new Promise((resolve) => setTimeout(resolve, 50));
  
  // In a real scenario:
  // const res = await fetch(affiliateLink, { method: 'HEAD' });
  // if (res.status === 404) return true;
  
  // Return false (assumes it's always in stock for the MVP simulator)
  return false;
}
