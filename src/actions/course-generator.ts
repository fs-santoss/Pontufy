'use server';

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { getTenantDb } from '@/backend/db';

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

type ProviderAttempt = { name: string; build: () => LanguageModel };

function buildProviderChain(): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const model = process.env.GOOGLE_COURSE_MODEL || 'gemini-2.0-flash';
    chain.push({ name: `google:${model}`, build: () => google(model) });
  }

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

function generateLocalFallback(prompt: string, sector: string): GeneratedCourse {
  const sectorName = sector || 'geral';
  return {
    courseTitle: `Treinamento: ${prompt.slice(0, 60)}`,
    courseDescription: `Curso gerado automaticamente sobre "${prompt.slice(0, 100)}" para o setor de ${sectorName}. Este conteúdo foi criado como modelo inicial e pode ser editado pelo gestor de RH.`,
    lessons: [
      {
        title: 'Introdução e Contexto',
        contentSummary: `Nesta aula introdutória, o colaborador conhecerá os fundamentos do tema "${prompt.slice(0, 50)}" aplicados ao setor de ${sectorName}. Serão apresentados os objetivos do treinamento e a importância do tema no dia a dia profissional.`,
        pointsAwarded: 10,
      },
      {
        title: 'Conceitos Essenciais e Boas Práticas',
        contentSummary: `Aprofundamento nos conceitos-chave e nas melhores práticas do mercado. O colaborador aprenderá técnicas aplicáveis imediatamente à sua rotina de trabalho no setor de ${sectorName}.`,
        pointsAwarded: 20,
      },
      {
        title: 'Casos Práticos e Exercícios',
        contentSummary: `Estudo de casos reais e exercícios práticos para fixação do conteúdo. O colaborador será desafiado a aplicar o conhecimento adquirido em cenários simulados do setor de ${sectorName}.`,
        pointsAwarded: 30,
      },
      {
        title: 'Avaliação e Próximos Passos',
        contentSummary: `Revisão geral do conteúdo com avaliação de conhecimento. O colaborador receberá orientações sobre como continuar se desenvolvendo no tema e aplicar o aprendizado no cotidiano.`,
        pointsAwarded: 40,
      },
    ],
  };
}

async function generateCourseWithFallback(
  prompt: string,
  sector: string,
): Promise<{ data: GeneratedCourse; provider: string }> {
  const chain = buildProviderChain();

  if (chain.length === 0) {
    console.log('[course-generator] Nenhum provedor configurado, usando template local');
    return { data: generateLocalFallback(prompt, sector), provider: 'local:template' };
  }

  const userPrompt = `Setor/Vertical: ${sector || 'geral'}.
Objetivo do treinamento solicitado pelo RH: ${prompt}`;

  const errors: string[] = [];
  for (const attempt of chain) {
    try {
      console.log(`[course-generator] Tentando provedor: ${attempt.name}`);
      const { object } = await generateObject({
        model: attempt.build(),
        schema: courseSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.6,
        maxRetries: 1,
      });
      console.log(`[course-generator] Sucesso com ${attempt.name}`);
      return { data: object, provider: attempt.name };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[course-generator] Falha em ${attempt.name}:`, msg);
      errors.push(`${attempt.name}: ${msg}`);
    }
  }

  console.warn('[course-generator] Todos os provedores falharam, usando template local:', errors.join(' | '));
  return { data: generateLocalFallback(prompt, sector), provider: 'local:fallback' };
}

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
  const session = await auth();
  console.log('[course-generator] session:', JSON.stringify({
    hasUser: !!session?.user,
    tenantId: session?.user?.tenantId ?? 'MISSING',
    role: session?.user?.role ?? 'MISSING',
  }));

  if (!session?.user?.tenantId) {
    return { success: false, error: 'Não autenticado.' };
  }
  if (session.user.role !== 'admin_rh') {
    return { success: false, error: `Acesso negado: seu papel é "${session.user.role}", apenas "admin_rh" pode gerar cursos.` };
  }
  const tenantId = session.user.tenantId;

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Entrada inválida.' };
  }

  const db = getTenantDb(tenantId);

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  console.log('[course-generator] tenant:', JSON.stringify({
    found: !!tenant,
    aiCredits: tenant?.aiCredits ?? 'N/A',
  }));

  if (!tenant) {
    return { success: false, error: 'Tenant não encontrado. Execute o seed primeiro: POST /api/admin/seed' };
  }
  if (tenant.aiCredits < 1) {
    return { success: false, error: `Créditos de IA insuficientes (saldo: ${tenant.aiCredits}). Execute o seed para repor os créditos.` };
  }

  let generated: { data: GeneratedCourse; provider: string };
  try {
    generated = await generateCourseWithFallback(parsed.data.prompt, parsed.data.sector ?? '');
  } catch (err) {
    console.error('[course-generator] geração falhou:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao gerar o curso.',
    };
  }

  const lessonsToCreate = generated.data.lessons.map((lesson) => ({
    title: lesson.title,
    type: 'text' as const,
    pointsAssigned: Math.max(1, Math.round(lesson.pointsAwarded)),
    contentUrl: lesson.contentSummary,
  }));

  try {
    const result = await db.$transaction(async (tx: any) => {
      const debit = await tx.tenant.updateMany({
        where: { id: tenantId, aiCredits: { gte: 1 } },
        data: { aiCredits: { decrement: 1 } },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

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

    console.log('[course-generator] Curso criado com sucesso:', result.courseId);

    revalidatePath('/admin', 'page');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/cursos', 'page');
    revalidatePath('/api/courses', 'page');

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
      return { success: false, error: `Créditos de IA insuficientes (concorrência). Tente novamente.` };
    }
    console.error('[course-generator] persistência falhou:', err);
    return { success: false, error: `Falha ao salvar o curso: ${err instanceof Error ? err.message : String(err)}` };
  }
}
