'use server';

/**
 * Gerador de Treinamentos — Server Action (backend puro, sem UI).
 *
 * Pipeline:
 *  1. Zero Trust  → valida a sessão NextAuth v5 e extrai o tenantId (e o papel).
 *  2. Schema Zod  → `generateObject` (Vercel AI SDK) tipa rigidamente o retorno.
 *  3. Fallback    → OpenAI → Anthropic → Google, em sequência, com try/catch.
 *  4. Persistência → Course + Lessons numa única transação Prisma, com o
 *                    tenantId injetado pela extensão Zero-Trust (getTenantDb).
 */

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

import { auth } from '@/auth';
import { getTenantDb } from '@/backend/db';

// ─────────────────────────────────────────────────────────────────────────────
// 2. Schema estrito (Zod) — contrato exigido da IA via generateObject.
// ─────────────────────────────────────────────────────────────────────────────
const lessonSchema = z.object({
  title: z.string().min(3).describe('Título objetivo e prático da aula.'),
  contentSummary: z
    .string()
    .min(20)
    .describe('Resumo do conteúdo da aula em 2 a 4 frases, sem markdown.'),
  pointsAwarded: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Pontos inteiros concedidos pela conclusão da aula.'),
});

const courseSchema = z.object({
  courseTitle: z.string().min(3),
  courseDescription: z.string().min(20),
  lessons: z.array(lessonSchema).min(3).max(8),
});

export type GeneratedCourse = z.infer<typeof courseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cadeia de provedores (fallback sequencial).
//    Só entram na fila os provedores cuja API key está configurada; ainda assim
//    cada chamada é protegida por try/catch para tolerar timeout/erro de API.
// ─────────────────────────────────────────────────────────────────────────────
type ProviderAttempt = { name: string; build: () => LanguageModel };

function buildProviderChain(): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_COURSE_MODEL || 'gpt-4o-mini';
    chain.push({ name: `openai:${model}`, build: () => openai(model) });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_COURSE_MODEL || 'claude-haiku-4-5';
    chain.push({ name: `anthropic:${model}`, build: () => anthropic(model) });
  }

  // O projeto usa GEMINI_API_KEY; o SDK aceita GOOGLE_GENERATIVE_AI_API_KEY.
  const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const model = process.env.GOOGLE_COURSE_MODEL || 'gemini-1.5-flash';
    chain.push({ name: `google:${model}`, build: () => google(model) });
  }

  return chain;
}

const SYSTEM_PROMPT = `Você é o motor de IA da Pontufy, uma plataforma B2B de educação corporativa gamificada.
Gere um curso de treinamento completo, prático e adaptado ao setor/vertical informado.

Regras:
- Adapte títulos, exemplos e vocabulário ao setor (ex.: tecnologia, saúde, varejo, indústria). Nada de conteúdo genérico.
- Entregue de 3 a 8 aulas, em ordem didática (do fundamental ao avançado).
- "contentSummary" deve descrever o que a aula ensina em 2 a 4 frases objetivas, sem markdown.
- "pointsAwarded" é um inteiro: aulas introdutórias valem menos, avançadas valem mais.
- Responda exclusivamente no schema estruturado solicitado.`;

async function generateCourseWithFallback(
  prompt: string,
  sector: string,
): Promise<{ data: GeneratedCourse; provider: string }> {
  const chain = buildProviderChain();
  if (chain.length === 0) {
    throw new Error(
      'Nenhum provedor de IA configurado. Defina OPENAI_API_KEY, ANTHROPIC_API_KEY ou GEMINI_API_KEY.',
    );
  }

  const userPrompt = `Setor/Vertical: ${sector || 'geral'}.
Objetivo do treinamento solicitado pelo RH: ${prompt}`;

  const errors: string[] = [];
  for (const attempt of chain) {
    try {
      const { object } = await generateObject({
        model: attempt.build(),
        schema: courseSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.6,
        maxRetries: 1,
      });
      return { data: object, provider: attempt.name };
    } catch (err) {
      // Timeout/erro de API/validação → registra e tenta o próximo provedor.
      errors.push(`${attempt.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`Todos os provedores de IA falharam. Detalhes: ${errors.join(' | ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action pública.
// ─────────────────────────────────────────────────────────────────────────────
const inputSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Descreva o objetivo do treinamento (mínimo de 10 caracteres).')
    .max(2000),
  sector: z.string().max(60).optional(),
});

export type GenerateTrainingInput = z.infer<typeof inputSchema>;

export type GenerateTrainingResult =
  | {
      success: true;
      courseId: string;
      lessonsCount: number;
      provider: string;
      creditsRemaining: number;
      course: {
        title: string;
        description: string;
        lessons: { title: string; pointsAwarded: number }[];
      };
    }
  | { success: false; error: string };

export async function generateTrainingCourse(
  input: GenerateTrainingInput,
): Promise<GenerateTrainingResult> {
  // 1. Zero Trust — sessão válida + extração do tenantId e papel.
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { success: false, error: 'Não autenticado.' };
  }
  if (session.user.role !== 'admin_rh') {
    return { success: false, error: 'Acesso negado: apenas Gestores de RH podem gerar cursos.' };
  }
  const tenantId = session.user.tenantId;

  // Validação da entrada.
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Entrada inválida.' };
  }

  // Cliente Prisma já escopado ao tenant (injeta tenantId em leituras/escritas).
  const db = getTenantDb(tenantId);

  // Guarda de créditos antes de gastar uma chamada de IA.
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { success: false, error: 'Tenant não encontrado.' };
  }
  if (tenant.aiCredits < 1) {
    return { success: false, error: 'Créditos de IA insuficientes.' };
  }

  // 3. Geração com fallback OpenAI → Anthropic → Google.
  let generated: { data: GeneratedCourse; provider: string };
  try {
    generated = await generateCourseWithFallback(parsed.data.prompt, parsed.data.sector ?? '');
  } catch (err) {
    console.error('[generateTrainingCourse] geração falhou:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao gerar o curso.',
    };
  }

  // 4. Persistência atômica.
  // Lesson não possui coluna própria de resumo; o contentSummary é gravado no
  // campo textual `contentUrl` (nullable) para evitar uma migração de schema.
  const lessonsToCreate = generated.data.lessons.map((lesson) => ({
    title: lesson.title,
    type: 'text' as const,
    pointsAssigned: Math.max(1, Math.round(lesson.pointsAwarded)),
    contentUrl: lesson.contentSummary,
  }));

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Débito condicional: só decrementa se ainda houver crédito (evita gasto
      // duplo sob concorrência). updateMany retorna a contagem afetada.
      const debit = await tx.tenant.updateMany({
        where: { id: tenantId, aiCredits: { gte: 1 } },
        data: { aiCredits: { decrement: 1 } },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // O tenantId do Course é injetado pela extensão getTenantDb.
      // As Lessons herdam o tenant via relação (course.tenantId).
      const course = await tx.course.create({
        data: {
          title: generated.data.courseTitle,
          description: generated.data.courseDescription,
          status: 'published',
          aiCreditsSpent: 1,
          lessons: { create: lessonsToCreate },
        },
        include: { lessons: { select: { id: true } } },
      });

      const refreshed = await tx.tenant.findUnique({ where: { id: tenantId } });

      return {
        courseId: course.id as string,
        lessonsCount: course.lessons.length as number,
        creditsRemaining: (refreshed?.aiCredits ?? 0) as number,
      };
    });

    // Retorno: apenas o objeto de sucesso com o ID do curso criado.
    return {
      success: true,
      courseId: result.courseId,
      lessonsCount: result.lessonsCount,
      provider: generated.provider,
      creditsRemaining: result.creditsRemaining,
      course: {
        title: generated.data.courseTitle,
        description: generated.data.courseDescription,
        lessons: generated.data.lessons.map((l) => ({
          title: l.title,
          pointsAwarded: l.pointsAwarded,
        })),
      },
    };
  } catch (err) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
      return { success: false, error: 'Créditos de IA insuficientes.' };
    }
    console.error('[generateTrainingCourse] persistência falhou:', err);
    return { success: false, error: 'Falha ao salvar o curso gerado.' };
  }
}
