import { NextResponse } from 'next/server';
import { getTenantPrisma } from '@/backend/db';
import { GoogleGenAI } from '@google/genai';
import { courseGenerationSchema, CourseGeneration } from '@/lib/validations/ai-schemas';

export const maxDuration = 60; // Configura Vercel para permitir execução longa em background

export async function POST(request: Request) {
  try {
    // 1. Validação do Header de Segurança do QStash
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { tenantId, vertical, prompt } = payload;

    if (!tenantId || !prompt) {
      // Falha irreparável. Retorna 200 para remover da fila (evitar retries)
      console.error('[QSTASH] Payload inválido descartado.');
      return NextResponse.json({ success: false, reason: 'Payload inválido' }, { status: 200 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[QSTASH] GEMINI_API_KEY ausente. Operação cancelada.');
      return NextResponse.json({ success: false, reason: 'Chave de API ausente' }, { status: 200 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 2. Chamada ao LLM
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Vertical: ${vertical}. Prompt do RH: ${prompt}`,
      config: {
        systemInstruction: 'Gere um curso seguindo estritamente a tipagem solicitada. Não saia do formato JSON.',
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text) throw new Error('Resposta vazia da IA.');

    // 3. Validação Estrita (O ponto de ruptura apontado na auditoria)
    let courseData: CourseGeneration;
    try {
      const parsedJson = JSON.parse(text);
      courseData = courseGenerationSchema.parse(parsedJson);
    } catch (validationError) {
      console.error('[QSTASH] Falha crítica de parse/Zod. LLM Alucinou estrutura.', validationError);
      
      // CRÍTICO: Retornar 200 OK para sinalizar ao QStash que processamos, mas a tarefa falhou logica.
      // Se retornarmos 500, o QStash tentará infinitamente (DLQ Flooding).
      
      // Em um ambiente real, poderíamos notificar o RH via WebSockets/Email que a geração falhou.
      return NextResponse.json({ success: false, reason: 'AI Schema Mismatch' }, { status: 200 });
    }

    // 4. Persistência de Dados
    const db = getTenantPrisma(tenantId);
    
    const lessonsToCreate: { title: string; type: 'text' | 'video'; pointsAssigned: number }[] = [];
    courseData.modules.forEach(mod => {
      mod.lessons.forEach(lesson => {
        lessonsToCreate.push({
          title: `[${mod.moduleTitle}] ${lesson.title}`,
          type: lesson.type,
          pointsAssigned: lesson.points,
        });
      });
    });

    await db.$transaction(async (tx: any) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { aiCredits: { decrement: 1 } }, // Debita o crédito apenas após o sucesso
      });

      await tx.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          aiCreditsSpent: 1,
          status: 'published',
          lessons: { create: lessonsToCreate },
        }
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error('[QSTASH] Erro fatal na geração assíncrona:', error);
    // Retornar 500 AQUI apenas se for falha de rede/banco transiente, para permitir retries da fila.
    return NextResponse.json({ error: 'Falha interna transitória.' }, { status: 500 });
  }
}
