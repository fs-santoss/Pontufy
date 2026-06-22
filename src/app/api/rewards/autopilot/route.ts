import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma, getTenantDb } from '@/backend/db';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function POST(request: Request) {
  try {
    // Auth required — userId/tenantId come from the verified JWT, never the body
    const { userId, tenantId } = await getSessionContext();
    const db = getTenantDb(tenantId);

    const recentGains = await prisma.pointsLedger.findMany({
      where: { userId, type: 'gain' },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });

    const userContext =
      recentGains.length > 0
        ? recentGains.map(g => `- Ganhou ${g.pointsAmount} pts: ${g.description}`).join('\n')
        : 'Usuário novo ou sem atividades recentes.';

    const availableRewards = await db.reward.findMany({
      where: { isActive: true },
      take: 5,
    });

    if (availableRewards.length === 0) {
      return NextResponse.json({ error: 'No active rewards found' }, { status: 404 });
    }

    const rewardsContext = availableRewards
      .map(r => `ID: ${r.id} | Produto: ${r.title} | Preço: ${r.pricePoints} pts`)
      .join('\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = availableRewards[0];
      return NextResponse.json({
        recommendedRewardId: fallback.id,
        aiMessage: 'Notamos seu esforço! Que tal resgatar este prêmio com um desconto especial?',
        discountedPoints: Math.floor(fallback.pricePoints * 0.9),
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é o "Autopilot de Recompensas" de uma plataforma de RH gamificada chamada Pontufy.
Seu objetivo é analisar as conquistas recentes do colaborador e escolher a melhor recompensa do catálogo para oferecer de surpresa.

Conquistas Recentes do Colaborador:
${userContext}

Catálogo de Recompensas Disponíveis:
${rewardsContext}

Tarefa:
1. Escolha o prêmio que melhor se alinha com o histórico do colaborador.
2. Escreva uma curta mensagem em tom empolgante, amigável e corporativo leve (máx 2 frases), parabenizando o colaborador e oferecendo o item.
3. O desconto aplicado será fixo em 10% (calcule: preço original * 0.9, arredondado para baixo).

Responda ESTRITAMENTE usando o schema JSON fornecido.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        recommendedRewardId: {
          type: Type.STRING,
          description: 'O ID exato do prêmio escolhido do catálogo.',
        },
        aiMessage: {
          type: Type.STRING,
          description: 'A mensagem persuasiva e personalizada oferecendo o prêmio surpresa.',
        },
        discountedPoints: {
          type: Type.INTEGER,
          description: 'O valor do prêmio com 10% de desconto (arredondado para baixo).',
        },
      },
      required: ['recommendedRewardId', 'aiMessage', 'discountedPoints'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.7,
      },
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error('Empty response from AI');

    return NextResponse.json(JSON.parse(textOutput));
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('Autopilot API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
