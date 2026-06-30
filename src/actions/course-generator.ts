'use server';

import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

import { auth } from '@/auth';
import { getTenantDb } from '@/backend/db';

const lessonSchema = z.object({
  title: z.string().min(3).describe('Titulo claro e objetivo da aula.'),
  content: z
    .string()
    .min(200)
    .describe(
      'Conteudo educacional COMPLETO da aula em Markdown. ' +
      'Minimo 3 paragrafos substanciais (150+ palavras cada). ' +
      'Inclua: conceitos-chave com explicacoes claras, exemplos praticos do setor, ' +
      'boas praticas e dicas de aplicacao. ' +
      'Use ## para subtitulos, **negrito** para termos importantes, - para listas.',
    ),
  pointsAwarded: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Pontos inteiros concedidos pela conclusao da aula.'),
});

const quizQuestionSchema = z.object({
  question: z.string().min(10).describe('Pergunta clara sobre o conteudo do curso.'),
  options: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('Opcoes de resposta. Apenas uma e correta.'),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .describe('Indice (0-based) da opcao correta.'),
});

const courseSchema = z.object({
  courseTitle: z.string().min(3),
  courseDescription: z.string().min(20),
  lessons: z.array(lessonSchema).min(3).max(8),
  quiz: z.array(quizQuestionSchema).min(3).max(8),
});

export type GeneratedCourse = z.infer<typeof courseSchema>;

type ProviderAttempt = { name: string; build: () => LanguageModel };

function buildProviderChain(): ProviderAttempt[] {
  const chain: ProviderAttempt[] = [];

  const googleKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    // Use gemini-1.5-flash as the default stable model for courses
    const model = process.env.GOOGLE_COURSE_MODEL || 'gemini-1.5-flash';
    chain.push({ name: `google:${model}`, build: () => google(model) });
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_COURSE_MODEL || 'gpt-4o-mini';
    chain.push({ name: `openai:${model}`, build: () => openai(model) });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_COURSE_MODEL || 'claude-3-haiku-20240307';
    chain.push({ name: `anthropic:${model}`, build: () => anthropic(model) });
  }

  return chain;
}

const SYSTEM_PROMPT = `Voce e o motor de IA da Pontufy, uma plataforma B2B de educacao corporativa gamificada.
Gere um curso de treinamento COMPLETO, pratico e adaptado ao setor/vertical informado.

Regras OBRIGATORIAS:
1. FOCO SETORIAL — Adapte titulos, exemplos e vocabulario ao setor. Nada generico.
2. ESTRUTURA — Entregue de 3 a 8 aulas, em ordem didatica (do fundamental ao avancado).
3. CONTEUDO COMPLETO — Cada aula DEVE ter conteudo educacional rico e completo:
   - Minimo 3 paragrafos substanciais (150+ palavras cada).
   - Explique conceitos-chave de forma clara e detalhada.
   - Inclua exemplos praticos e reais do setor informado.
   - Adicione boas praticas, dicas e alertas importantes.
   - Use formatacao Markdown: ## para subtitulos, **negrito** para termos-chave, - para listas.
4. PONTUACAO — "pointsAwarded" e um inteiro: aulas introdutorias valem menos, avancadas valem mais.
5. QUIZ — Gere de 3 a 8 perguntas de multipla escolha cobrindo TODO o conteudo do curso:
   - Cada pergunta deve ter 4 opcoes, apenas uma correta.
   - Perguntas devem testar compreensao real, nao memorizacao superficial.
   - Varie a dificuldade: faceis, medias e dificeis.
6. Se material de referencia for fornecido, BASEIE o conteudo nele.
7. Responda exclusivamente no schema estruturado solicitado.`;

function generateLocalFallback(prompt: string, sector: string, referenceContent?: string): GeneratedCourse {
  const sectorName = sector || 'geral';
  const topic = prompt.slice(0, 80);

  // If we have reference content, try to use it to generate a more relevant mock
  if (referenceContent && referenceContent.length > 50) {
    const paragraphs = referenceContent
      .split(/\n{2,}|\r\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 30);

    const chunks: string[][] = [];
    const chunkSize = Math.max(1, Math.ceil(paragraphs.length / 5));
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      chunks.push(paragraphs.slice(i, i + chunkSize));
    }

    const lessonCount = Math.min(Math.max(3, chunks.length), 6);
    const titles = [
      'Fundamentos e Introducao ao Material',
      'Analise Detalhada de Conceitos',
      'Aplicacao Estrategica no Setor',
      'Desafios e Solucoes Praticas',
      'Consolidacao do Conhecimento',
    ];

    const lessons = Array.from({ length: lessonCount }, (_, i) => {
      const chunk = chunks[i] || [];
      const chunkText = chunk.length > 0
        ? chunk.join('\n\n')
        : `Conteudo baseado na referencia sobre ${topic} aplicado ao setor de ${sectorName}.`;

      return {
        title: titles[i] || `Modulo ${i + 1}: ${topic}`,
        content: `## ${titles[i] || `Modulo ${i + 1}`}\n\n${chunkText}\n\n**Aprofundamento:** Este modulo extrai os pontos vitais da documentação fornecida para garantir que voce tenha a base necessaria no setor de ${sectorName}.`,
        pointsAwarded: 20 + i * 15,
      };
    });

    return {
      courseTitle: `Treinamento Especializado: ${topic}`,
      courseDescription: `Curso aprofundado gerado via Motor Gratuito com base no material de referencia para o setor de ${sectorName}.`,
      lessons,
      quiz: [
        { question: `Qual o foco principal abordado nesta seção sobre ${topic}?`, options: ['Teoria basica', 'Aplicacao pratica no setor', 'Historico do tema', 'Nenhuma das anteriores'], correctIndex: 1 },
        { question: `Segundo o material, qual a importancia de dominar este tema em ${sectorName}?`, options: ['Melhoria de processos', 'Diferencial competitivo', 'Seguranca operacional', 'Todas as anteriores'], correctIndex: 3 },
        { question: 'Como deve ser feita a aplicacao inicial dos conceitos aprendidos?', options: ['De forma imediata e monitorada', 'Aguardando planejamento trimestral', 'Apenas em novos projetos', 'Somente sob supervisao direta'], correctIndex: 0 },
      ],
    };
  }

  // General high-quality fallback for common corporate topics
  return {
    courseTitle: `Treinamento: ${topic}`,
    courseDescription: `Capacitacao completa sobre "${topic}" otimizada para a vertical de ${sectorName}. (Gerado pelo Motor de Backup)`,
    lessons: [
      {
        title: 'Introdução Estratégica e Contexto de Mercado',
        content: `## Visão Geral do Tema\n\nNesta aula introdutória, exploramos a relevância de **${topic}** dentro do cenário atual do setor de **${sectorName}**. Compreender este contexto é o primeiro passo para transformar teoria em valor real para a organização.\n\n## Desafios do Setor ${sectorName}\n\nAtualmente, empresas nesta vertical enfrentam pressões crescentes por eficiência e inovação. A adoção de práticas sólidas em **${topic}** permite mitigar riscos comuns e acelerar a curva de aprendizado da equipe. Ignorar estes fundamentos pode resultar em obsolescência competitiva.\n\n## Objetivos de Aprendizagem\n\nAo final desta jornada, você será capaz de:\n\n- Identificar oportunidades de melhoria relacionadas a **${topic}**.\n- Implementar fluxos de trabalho mais ágeis e seguros.\n- Colaborar de forma mais eficaz com as partes interessadas do setor.\n\n**Dica:** Anote como os exemplos citados se conectam com suas tarefas diárias.`,
        pointsAwarded: 15,
      },
      {
        title: 'Princípios Fundamentais e Arquitetura de Processos',
        content: `## Pilares do Sucesso\n\nO sucesso em **${topic}** no setor de **${sectorName}** repousa sobre quatro pilares fundamentais:\n\n1. **Qualidade de Dados**: Informação precisa é a base de toda decisão.\n2. **Consistência Operacional**: Processos repetíveis geram resultados previsíveis.\n3. **Segurança e Conformidade**: Especialmente vital em ${sectorName}, onde a regulamentação é rigorosa.\n4. **Foco no Cliente**: Todo processo deve, em última análise, gerar valor para o usuário final.\n\n## Metodologia de Implementação\n\nPara aplicar estes princípios, recomendamos a adoção de ciclos curtos de execução (Sprints). Comece definindo o escopo, valide as premissas com a equipe técnica e execute a implementação em fases, permitindo ajustes rápidos baseados em feedback real.\n\n**Exemplo Prático:** No dia a dia da ${sectorName}, a aplicação do pilar de consistência operacional reduz erros em até 30% nas fases críticas do projeto.`,
        pointsAwarded: 35,
      },
      {
        title: 'Execução Avançada e Resolução de Problemas',
        content: `## Indo Além do Básico\n\nDominar os fundamentos é apenas o começo. Nesta aula, focamos em cenários complexos onde a aplicação de **${topic}** exige pensamento crítico e adaptabilidade técnica.\n\n## Gerenciamento de Exceções\n\nNem tudo segue o roteiro ideal. Em situações de alta pressão no setor de **${sectorName}**, é crucial saber priorizar ações que mantenham a integridade do sistema ou do processo. Use a técnica de "Análise de Causa Raiz" para entender por que um desvio ocorreu e como prevenir sua recorrência.\n\n## Ferramentas e Frameworks\n\nUtilize ferramentas de monitoramento em tempo real para acompanhar a saúde das suas iniciativas em **${topic}**. No setor de ${sectorName}, a visibilidade é a sua melhor aliada contra a incerteza.\n\n**Boas Práticas:**\n- Mantenha uma base de conhecimento atualizada.\n- Realize revisões por pares (Peer Reviews).\n- Teste hipóteses em ambientes controlados antes do rollout total.`,
        pointsAwarded: 50,
      },
    ],
    quiz: [
      {
        question: `Qual dos pilares abaixo é considerado fundamental para o sucesso em ${topic}?`,
        options: [
          'Redução drástica de custos a qualquer preço',
          'Qualidade de dados e consistência operacional',
          'Aumento de horas extras da equipe',
          'Manutenção de processos legados',
        ],
        correctIndex: 1,
      },
      {
        question: `No contexto de ${sectorName}, qual a vantagem de utilizar ciclos curtos de execução?`,
        options: [
          'Evitar reuniões de equipe',
          'Permitir ajustes rápidos baseados em feedback real',
          'Eliminar a necessidade de documentação',
          'Nenhuma das alternativas acima',
        ],
        correctIndex: 1,
      },
      {
        question: 'O que a técnica de "Análise de Causa Raiz" busca resolver?',
        options: [
          'Identificar culpados por erros',
          'Entender a origem de desvios para prevenir recorrências',
          'Apenas documentar falhas passadas',
          'Acelerar a entrega sem testar',
        ],
        correctIndex: 1,
      },
    ],
  };
}

async function generateCourseWithFallback(
  prompt: string,
  sector: string,
  referenceContent?: string,
): Promise<{ data: GeneratedCourse; provider: string; errors?: string[] }> {
  const chain = buildProviderChain();

  if (chain.length === 0) {
    console.log('[course-generator] Nenhum provedor configurado ou chaves ausentes. Usando Motor Local Gratuito.');
    return { data: generateLocalFallback(prompt, sector, referenceContent), provider: 'local:free-motor' };
  }

  let userPrompt = `Setor/Vertical: ${sector || 'geral'}.
Objetivo do treinamento solicitado pelo RH: ${prompt}`;

  if (referenceContent) {
    userPrompt += `\n\n--- MATERIAL DE REFERENCIA FORNECIDO ---\n${referenceContent.slice(0, 30000)}\n--- FIM DO MATERIAL ---\n\nIMPORTANTE: Baseie o conteudo do curso no material acima. Extraia os topicos principais, organize-os didaticamente e gere as aulas com base real no conteudo fornecido.`;
  }

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

  console.warn('[course-generator] Todos os provedores de IA falharam. Ativando Motor Local Gratuito:', errors.join(' | '));
  return { data: generateLocalFallback(prompt, sector, referenceContent), provider: 'local:fallback-free', errors };
}

export async function checkAIProviders(): Promise<{
  available: string[];
  configured: boolean;
  diagnostics?: Record<string, string>;
}> {
  const available: string[] = [];
  const diagnostics: Record<string, string> = {};

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    available.push('Google Gemini (1.5 Flash)');
    diagnostics.gemini = `Configurado (${geminiKey.slice(0, 6)}...)`;
  } else {
    diagnostics.gemini = 'GEMINI_API_KEY nao encontrada no ambiente';
  }

  if (process.env.OPENAI_API_KEY) {
    available.push('OpenAI (GPT-4o-mini)');
    diagnostics.openai = 'Configurado';
  } else {
    diagnostics.openai = 'Nao configurada';
  }

  if (process.env.ANTHROPIC_API_KEY) {
    available.push('Anthropic Claude (Haiku)');
    diagnostics.anthropic = 'Configurado';
  } else {
    diagnostics.anthropic = 'Nao configurada';
  }

  return { available, configured: available.length > 0, diagnostics };
}

const inputSchema = z.object({
  prompt: z
    .string()
    .min(10, 'Descreva o objetivo do treinamento (minimo de 10 caracteres).')
    .max(2000),
  sector: z.string().max(60).optional(),
  referenceContent: z.string().max(60000).optional(),
});

export type GenerateTrainingInput = z.infer<typeof inputSchema>;

export interface CoursePayload {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  quizJson: string | null;
  lessons: Array<{
    id: string;
    title: string;
    type: string;
    pointsAssigned: number;
    contentUrl: string | null;
  }>;
}

export type GenerateTrainingResult =
  | {
      success: true;
      courseId: string;
      lessonsCount: number;
      provider: string;
      creditsRemaining: number;
      persisted: boolean;
      course: CoursePayload;
      aiErrors?: string[];
    }
  | { success: false; error: string };

export async function generateTrainingCourse(
  input: GenerateTrainingInput,
): Promise<GenerateTrainingResult> {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return { success: false, error: 'Nao autenticado.' };
  }
  if (session.user.role !== 'admin_rh') {
    return { success: false, error: `Acesso negado: apenas "admin_rh" pode gerar cursos.` };
  }
  const tenantId = session.user.tenantId;

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Entrada invalida.' };
  }

  const db = getTenantDb(tenantId);

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { success: false, error: 'Tenant nao encontrado.' };
  }

  // Free fallback engine doesn't consume credits if all AI providers fail
  // But for the initial request, we check if they have at least 1 credit
  if (tenant.aiCredits < 1) {
    return { success: false, error: `Creditos de IA insuficientes (saldo: ${tenant.aiCredits}).` };
  }

  let generated: { data: GeneratedCourse; provider: string; errors?: string[] };
  try {
    generated = await generateCourseWithFallback(parsed.data.prompt, parsed.data.sector ?? '', parsed.data.referenceContent);
  } catch (err) {
    console.error('[course-generator] geracao falhou:', err);
    return {
      success: false,
      error: 'Falha crítica no motor de geração.',
    };
  }

  const now = new Date();
  const lessonsToCreate = generated.data.lessons.map((lesson) => ({
    title: lesson.title,
    type: 'text' as const,
    pointsAssigned: Math.max(1, Math.round(lesson.pointsAwarded)),
    contentUrl: lesson.content,
  }));

  const quizJson = generated.data.quiz && generated.data.quiz.length > 0
    ? JSON.stringify([{
        module: 'Avaliacao do Curso',
        questions: generated.data.quiz.map((q) => ({
          question: q.question,
          options: q.options.map((o) => ({ text: o })),
          correctIndex: q.correctIndex,
        })),
      }])
    : null;

  let courseId: string;
  let lessonRecords: Array<{ id: string; title: string; type: string; pointsAssigned: number; contentUrl: string | null }>;
  let creditsRemaining: number;
  let persisted = false;

  try {
    const result = await db.$transaction(async (tx: any) => {
      // Only debit credits if it was a real AI provider
      const isAI = !generated.provider.includes('local:');

      if (isAI) {
        const debit = await tx.tenant.updateMany({
          where: { id: tenantId, aiCredits: { gte: 1 } },
          data: { aiCredits: { decrement: 1 } },
        });
        if (debit.count === 0) {
          throw new Error('INSUFFICIENT_CREDITS');
        }
      }

      const course = await tx.course.create({
        data: {
          tenantId,
          title: generated.data.courseTitle,
          description: generated.data.courseDescription,
          status: 'published',
          aiCreditsSpent: isAI ? 1 : 0,
          quizJson,
          lessons: { create: lessonsToCreate },
        },
        include: {
          lessons: {
            select: { id: true, title: true, type: true, pointsAssigned: true, contentUrl: true },
          },
        },
      });

      const refreshed = await tx.tenant.findUnique({ where: { id: tenantId } });

      return {
        courseId: course.id as string,
        lessons: course.lessons as Array<{ id: string; title: string; type: string; pointsAssigned: number; contentUrl: string | null }>,
        creditsRemaining: (refreshed?.aiCredits ?? 0) as number,
      };
    });

    courseId = result.courseId;
    lessonRecords = result.lessons;
    creditsRemaining = result.creditsRemaining;
    persisted = true;
  } catch (err) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
      return { success: false, error: `Creditos de IA insuficientes.` };
    }
    console.error('[course-generator] Persistencia falhou, retornando dados temporarios:', err);
    courseId = randomUUID();
    lessonRecords = lessonsToCreate.map((l) => ({ ...l, id: randomUUID() }));
    creditsRemaining = tenant.aiCredits;
  }

  try {
    revalidatePath('/admin', 'page');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/cursos', 'page');
  } catch {}

  return {
    success: true,
    courseId,
    lessonsCount: lessonRecords.length,
    provider: generated.provider,
    creditsRemaining,
    persisted,
    aiErrors: generated.errors,
    course: {
      id: courseId,
      title: generated.data.courseTitle,
      description: generated.data.courseDescription,
      status: 'published',
      createdAt: now.toISOString(),
      quizJson,
      lessons: lessonRecords,
    },
  };
}
