import { NextResponse } from 'next/server';
import { getTenantDb } from '@/backend/db';
import { GoogleGenAI } from '@google/genai';
import { courseGenerationSchema, CourseGeneration } from '@/lib/validations/ai-schemas';

export const maxDuration = 60; // Configura Vercel para permitir execuÃ§Ã£o longa em background

export async function POST(request: Request) {
  try {
    // 1. ValidaÃ§Ã£o do Header de SeguranÃ§a do QStash
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { tenantId, vertical, prompt } = payload;

    if (!tenantId || !prompt) {
      // Falha irreparÃ¡vel. Retorna 200 para remover da fila (evitar retries)
      console.error('[QSTASH] Payload invÃ¡lido descartado.');
      return NextResponse.json({ success: false, reason: 'Payload invÃ¡lido' }, { status: 200 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[QSTASH] GEMINI_API_KEY ausente. OperaÃ§Ã£o cancelada.');
      return NextResponse.json({ success: false, reason: 'Chave de API ausente' }, { status: 200 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 2. Chamada ao LLM com ProteÃ§Ã£o Rigorosa de Timeout (45s)
    const aiPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Vertical: ${vertical}. Prompt do RH: ${prompt}`,
      config: {
        systemInstruction: 'Gere um curso seguindo estritamente a tipagem solicitada. NÃ£o saia do formato JSON.',
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), 45000)
    );

    let response: any;
    try {
      response = await Promise.race([aiPromise, timeoutPromise]);
    } catch (aiError: any) {
      if (aiError.message === 'LLM_TIMEOUT') {
        console.error('[QSTASH] LLM Timeout aos 45s. Abortando silenciosamente para prevenir DLQ Flooding.');
        return NextResponse.json({ success: false, reason: 'LLM Response Timeout' }, { status: 200 });
      }
      throw aiError; // Deixa o catch global pegar
    }

    const text = response.text;
    if (!text) throw new Error('Resposta vazia da IA.');

    // 3. ValidaÃ§Ã£o Estrita (O ponto de ruptura apontado na auditoria)
    let courseData: CourseGeneration;
    try {
      const parsedJson = JSON.parse(text);
      courseData = courseGenerationSchema.parse(parsedJson);
    } catch (validationError) {
      console.error('[QSTASH] Falha crÃ­tica de parse/Zod. LLM Alucinou estrutura.', validationError);
      
      // CRÃTICO: Retornar 200 OK para sinalizar ao QStash que processamos, mas a tarefa falhou logica.
      // Se retornarmos 500, o QStash tentarÃ¡ infinitamente (DLQ Flooding).
      
      // Em um ambiente real, poderÃ­amos notificar o RH via WebSockets/Email que a geraÃ§Ã£o falhou.
      return NextResponse.json({ success: false, reason: 'AI Schema Mismatch' }, { status: 200 });
    }

    // 4. PersistÃªncia de Dados
    const db = getTenantDb(tenantId);
    
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
        data: { aiCredits: { decrement: 1 } }, // Debita o crÃ©dito apenas apÃ³s o sucesso
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
    console.error('[QSTASH] Erro fatal na geraÃ§Ã£o assÃ­ncrona:', error);
    // Retornar 500 AQUI apenas se for falha de rede/banco transiente, para permitir retries da fila.
    return NextResponse.json({ error: 'Falha interna transitÃ³ria.' }, { status: 500 });
  }
}
