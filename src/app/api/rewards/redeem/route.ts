import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { createAffiliateLink, buildTrackedUrl } from '@/lib/lomadee';
import { logAudit, extractRequestMeta } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const body = await request.json();
    const { rewardId, productUrl } = body;

    if (!rewardId && !productUrl) {
      return NextResponse.json({ error: 'rewardId ou productUrl é obrigatório.' }, { status: 400 });
    }

    const db = getTenantDb(tenantId);

    if (rewardId) {
      const reward = await db.reward.findFirst({ where: { id: rewardId } });

      if (!reward || !reward.isActive) {
        return NextResponse.json({ error: 'Recompensa indisponível ou inativa.' }, { status: 404 });
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      if (user.pointsBalance < reward.pricePoints) {
        return NextResponse.json({
          error: 'Saldo insuficiente.',
          missing: reward.pricePoints - user.pointsBalance,
        }, { status: 400 });
      }

      const result = await db.$transaction(async (tx: any) => {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { pointsBalance: { decrement: reward.pricePoints } },
        });

        await tx.pointsLedger.create({
          data: {
            userId,
            tenantId,
            type: 'loss',
            pointsAmount: reward.pricePoints,
            description: `Resgate: ${reward.title}`,
          },
        });

        return updatedUser;
      });

      let affiliateUrl: string;
      try {
        affiliateUrl = await createAffiliateLink(reward.affiliateLink, userId);
      } catch {
        affiliateUrl = buildTrackedUrl(reward.affiliateLink, userId);
      }

      const meta = extractRequestMeta(request);
      await logAudit({
        tenantId,
        userId,
        action: 'REWARD_REDEEMED',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        previousValues: { pointsBalance: user.pointsBalance },
        newValues: { pointsBalance: result.pointsBalance, rewardId, rewardTitle: reward.title },
      });

      return NextResponse.json({
        success: true,
        message: 'Resgate concluído com sucesso!',
        newBalance: result.pointsBalance,
        affiliateUrl,
      });
    }

    // Lomadee direct product URL redemption (from search results)
    if (productUrl) {
      const pointsCost = body.pointsCost || 0;

      if (pointsCost > 0) {
        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
        }

        if (user.pointsBalance < pointsCost) {
          return NextResponse.json({
            error: 'Saldo insuficiente.',
            missing: pointsCost - user.pointsBalance,
          }, { status: 400 });
        }

        const result = await db.$transaction(async (tx: any) => {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { pointsBalance: { decrement: pointsCost } },
          });

          await tx.pointsLedger.create({
            data: {
              userId,
              tenantId,
              type: 'loss',
              pointsAmount: pointsCost,
              description: `Resgate Lomadee: ${body.productTitle || productUrl}`,
            },
          });

          return updatedUser;
        });

        let affiliateUrl: string;
        try {
          affiliateUrl = await createAffiliateLink(productUrl, userId);
        } catch {
          affiliateUrl = buildTrackedUrl(productUrl, userId);
        }

        return NextResponse.json({
          success: true,
          message: 'Resgate concluído!',
          newBalance: result.pointsBalance,
          affiliateUrl,
        });
      }

      // Zero-cost link generation (browsing only)
      try {
        const affiliateUrl = await createAffiliateLink(productUrl);
        return NextResponse.json({ success: true, affiliateUrl });
      } catch (error) {
        console.error('Lomadee link creation failed:', error);
        return NextResponse.json({ error: 'Falha ao gerar link de afiliado.' }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('POST /api/rewards/redeem:', error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
