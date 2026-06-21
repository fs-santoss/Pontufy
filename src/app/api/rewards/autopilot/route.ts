import { NextResponse } from 'next/server';
import { prisma as db } from '@/backend/db';
import { GoogleGenAI, Type, Schema } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Usaremos o primeiro tenant disponível (no MVP mockado) para bypass do middleware de autenticação real.
    const tenant = await db.tenant.findFirst();
    if (!tenant) throw new Error("No tenant found");

    // 1. Coletar contexto do usuário: Últimas 3 conquistas
    const recentGains = await db.pointsLedger.findMany({
      where: { userId: userId, type: 'gain' },
      orderBy: { timestamp: 'desc' },
      take: 3,
    });

    const userContext = recentGains.length > 0 
      ? recentGains.map(g => `- Ganhou ${g.pointsAmount} pts: ${g.description}`).join('\n')
      : "Usuário novo ou sem atividades recentes.";

    // 2. Coletar itens do catálogo de recompensas (pegaremos todos ou alguns ativos)
    const availableRewards = await db.reward.findMany({
      where: { isActive: true },
      take: 5,
    });

    if (availableRewards.length === 0) {
      return NextResponse.json({ error: 'No active rewards found' }, { status: 404 });
    }

    const rewardsContext = availableRewards.map(r => `ID: ${r.id} | Produto: ${r.title} | Preço: ${r.pricePoints} pts`).join('\n');

    // 3. Integração com Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback estático caso não haja API Key configurada
      const fallbackReward = availableRewards[0];
      return NextResponse.json({
        recommendedRewardId: fallbackReward.id,
        aiMessage: "Notamos seu esforço! Que tal resgatar este prêmio com um desconto especial?",
        discountedPoints: Math.floor(fallbackReward.pricePoints * 0.9)
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
1. Escolha o prêmio que melhor se alinha (ou serve como incentivo divertido) com base no histórico.
2. Escreva uma curta mensagem em tom empolgante, amigável e corporativo leve (máx 2 frases), parabenizando o colaborador e oferecendo o item.
3. O desconto aplicado será fixo em 10% (calcule: preço original * 0.9, arredondado para baixo).

Responda ESTRITAMENTE usando o schema JSON fornecido.`;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        recommendedRewardId: {
          type: Type.STRING,
          description: "O ID exato do prêmio escolhido do catálogo.",
        },
        aiMessage: {
          type: Type.STRING,
          description: "A mensagem persuasiva e personalizada oferecendo o prêmio surpresa.",
        },
        discountedPoints: {
          type: Type.INTEGER,
          description: "O valor do prêmio com 10% de desconto (arredondado para baixo).",
        },
      },
      required: ["recommendedRewardId", "aiMessage", "discountedPoints"],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Empty response from AI");

    const parsedData = JSON.parse(textOutput);

    // Retorna o resultado para o frontend
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error("Autopilot API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
