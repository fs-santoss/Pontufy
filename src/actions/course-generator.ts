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
import { rateLimitCheck } from '@/lib/redis';

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
      'Fundamentos e Introducao',
      'Conceitos Principais',
      'Desenvolvimento e Aplicacao',
      'Aprofundamento Pratico',
      'Estudos de Caso',
      'Avaliacao e Consolidacao',
    ];

    const lessons = Array.from({ length: lessonCount }, (_, i) => {
      const chunk = chunks[i] || [];
      const chunkText = chunk.length > 0
        ? chunk.join('\n\n')
        : `Conteudo sobre ${topic} aplicado ao setor de ${sectorName}.`;
      return {
        title: titles[i] || `Modulo ${i + 1}`,
        content: `## ${titles[i] || `Modulo ${i + 1}`}\n\n${chunkText}\n\n**Dica pratica:** Aplique estes conceitos no seu dia a dia no setor de ${sectorName} para obter melhores resultados.`,
        pointsAwarded: 10 + i * 10,
      };
    });

    return {
      courseTitle: `Treinamento: ${prompt.slice(0, 60)}`,
      courseDescription: `Curso baseado no material de referencia fornecido sobre "${prompt.slice(0, 100)}" para o setor de ${sectorName}.`,
      lessons,
      quiz: [
        { question: `Qual e o principal objetivo deste treinamento sobre ${topic}?`, options: ['Desenvolvimento de habilidades praticas', 'Apenas teoria sem aplicacao', 'Recreacao corporativa', 'Reducao de custos imediata'], correctIndex: 0 },
        { question: `Em qual setor este treinamento e mais aplicavel?`, options: ['Qualquer setor sem distincao', `Setor de ${sectorName}`, 'Apenas setor publico', 'Apenas startups'], correctIndex: 1 },
        { question: 'Qual a melhor forma de aplicar o conteudo aprendido?', options: ['Ignorar ate surgir necessidade', 'Aplicar imediatamente na rotina de trabalho', 'Esperar instrucoes do gestor', 'Estudar mais teoria antes de praticar'], correctIndex: 1 },
      ],
    };
  }

  return {
    courseTitle: `Treinamento: ${prompt.slice(0, 60)}`,
    courseDescription: `Curso sobre "${prompt.slice(0, 100)}" para o setor de ${sectorName}. Configure uma chave de IA (GEMINI_API_KEY) no Vercel para gerar conteudo personalizado e inteligente.`,
    lessons: [
      {
        title: 'Introducao e Contexto',
        content: `## Introducao ao Treinamento\n\nBem-vindo a este treinamento sobre **${topic}**, desenvolvido especificamente para profissionais do setor de **${sectorName}**. Nesta primeira aula, voce vai entender por que este tema e fundamental para o seu desenvolvimento profissional e como ele se aplica ao seu dia a dia.\n\n## Por que este tema e importante?\n\nO mercado atual exige profissionais cada vez mais preparados e atualizados. No setor de ${sectorName}, dominar **${topic}** pode ser o diferencial entre uma carreira estagnada e uma trajetoria de crescimento continuo. Empresas que investem no desenvolvimento de seus colaboradores nesta area observam melhorias significativas em produtividade e qualidade.\n\n## Objetivos do Treinamento\n\nAo longo deste curso, voce ira:\n\n- Compreender os **fundamentos essenciais** do tema\n- Conhecer as **melhores praticas** do mercado\n- Aplicar o conhecimento em **situacoes reais** do seu setor\n- Desenvolver habilidades praticas para o dia a dia\n\n**Dica:** Aproveite cada aula para refletir sobre como aplicar o conteudo na sua rotina de trabalho.`,
        pointsAwarded: 10,
      },
      {
        title: 'Conceitos Essenciais e Boas Praticas',
        content: `## Conceitos-Chave\n\nNesta aula, vamos aprofundar nos conceitos fundamentais de **${topic}** que todo profissional do setor de **${sectorName}** precisa dominar. Estes conceitos formam a base para todas as praticas avancadas que veremos adiante.\n\n## Principios Fundamentais\n\nExistem alguns principios que guiam as melhores praticas nesta area:\n\n- **Planejamento estrategico**: Antes de qualquer acao, e essencial ter um plano claro com objetivos mensuráveis\n- **Execucao disciplinada**: Seguir processos bem definidos garante consistencia nos resultados\n- **Melhoria continua**: Avaliar resultados regularmente e ajustar a abordagem conforme necessario\n- **Colaboracao**: Trabalhar em equipe potencializa os resultados individuais\n\n## Boas Praticas do Mercado\n\nProfissionais de destaque no setor de ${sectorName} seguem estas boas praticas:\n\n1. **Documentar processos** — Manter registros claros facilita a replicacao de sucessos\n2. **Buscar feedback** — Ouvir colegas e gestores acelera o aprendizado\n3. **Atualizar-se constantemente** — O mercado evolui e quem nao acompanha fica para tras\n4. **Compartilhar conhecimento** — Ensinar aos outros consolida o proprio aprendimento\n\n**Importante:** Aplique pelo menos uma destas praticas ja na proxima semana de trabalho.`,
        pointsAwarded: 20,
      },
      {
        title: 'Aplicacao Pratica e Estudos de Caso',
        content: `## Colocando em Pratica\n\nAgora que voce domina os conceitos fundamentais, e hora de ver como eles se aplicam em **situacoes reais** do setor de **${sectorName}**. A pratica e o que transforma conhecimento teorico em habilidade profissional.\n\n## Estudo de Caso: Aplicacao no Dia a Dia\n\nImagine a seguinte situacao no seu ambiente de trabalho: voce precisa aplicar os conceitos de **${topic}** para resolver um desafio comum do setor. O primeiro passo e **identificar o problema** com clareza, depois **mapear as opcoes** disponiveis e, por fim, **implementar a solucao** mais adequada ao contexto.\n\nProfissionais que seguem esta abordagem estruturada conseguem resultados ate **40% melhores** do que aqueles que agem por impulso.\n\n## Exercicio de Reflexao\n\nPense em uma situacao recente no seu trabalho onde voce poderia ter aplicado estes conceitos:\n\n- Qual era o **desafio** que voce enfrentava?\n- Quais **opcoes** voce tinha disponivel?\n- O que voce faria **diferente** agora com este conhecimento?\n\n## Proximos Passos\n\nDepois de concluir este treinamento:\n\n- **Semana 1**: Identifique uma oportunidade de aplicar o aprendizado\n- **Semana 2**: Implemente a acao e registre os resultados\n- **Semana 3**: Avalie o impacto e compartilhe com sua equipe\n\n**Parabens!** Voce esta no caminho certo para se destacar no setor de ${sectorName}.`,
        pointsAwarded: 30,
      },
      {
        title: 'Avaliacao e Proximos Passos',
        content: `## Revisao do Conteudo\n\nParabens por chegar a ultima aula deste treinamento sobre **${topic}**! Vamos revisar os principais pontos abordados e preparar voce para continuar se desenvolvendo.\n\n## O que Aprendemos\n\nAo longo deste curso, voce:\n\n- Compreendeu a **importancia** de ${topic} no setor de ${sectorName}\n- Dominou os **conceitos essenciais** e boas praticas do mercado\n- Viu **exemplos praticos** de aplicacao no dia a dia\n- Desenvolveu um **plano de acao** para implementar o aprendizado\n\n## Como Continuar Evoluindo\n\nO aprendizado nao termina aqui. Para continuar se desenvolvendo:\n\n- **Pratique regularmente** — A repeticao e a mae do aprendizado\n- **Busque mentoria** — Encontre alguem mais experiente para guia-lo\n- **Acompanhe tendencias** — O setor de ${sectorName} esta em constante evolucao\n- **Compartilhe** — Ensine o que aprendeu para colegas e equipe\n\n## Certificacao\n\nApos concluir todas as aulas e o quiz de avaliacao, voce podera baixar seu **certificado de conclusao**. Este certificado valida sua dedicacao ao desenvolvimento profissional e pode ser compartilhado com seu gestor.\n\n**Obrigado pela dedicacao!** Continue investindo no seu crescimento profissional.`,
        pointsAwarded: 40,
      },
    ],
    quiz: [
      {
        question: `Qual e o primeiro passo recomendado ao aplicar os conceitos de ${topic} no ambiente de trabalho?`,
        options: [
          'Agir por impulso para ganhar velocidade',
          'Identificar o problema com clareza antes de agir',
          'Esperar que o gestor tome a iniciativa',
          'Delegar a tarefa para outro colega',
        ],
        correctIndex: 1,
      },
      {
        question: 'Qual das seguintes e uma boa pratica recomendada neste treinamento?',
        options: [
          'Trabalhar isoladamente para maior foco',
          'Evitar documentar processos para economizar tempo',
          'Buscar feedback de colegas e gestores regularmente',
          'Aplicar o conhecimento apenas quando solicitado',
        ],
        correctIndex: 2,
      },
      {
        question: `Por que a melhoria continua e importante no setor de ${sectorName}?`,
        options: [
          'Apenas para cumprir exigencias da empresa',
          'O mercado evolui e profissionais precisam se atualizar',
          'E uma exigencia legal obrigatoria',
          'Nao e realmente importante',
        ],
        correctIndex: 1,
      },
      {
        question: 'Qual a recomendacao para a primeira semana apos concluir o treinamento?',
        options: [
          'Esquecer o conteudo e voltar a rotina normal',
          'Fazer outro treinamento imediatamente',
          'Identificar uma oportunidade de aplicar o aprendizado',
          'Aguardar instrucoes especificas do RH',
        ],
        correctIndex: 2,
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
    console.log('[course-generator] Nenhum provedor configurado, usando template local');
    return { data: generateLocalFallback(prompt, sector, referenceContent), provider: 'local:template' };
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

  console.warn('[course-generator] Todos os provedores falharam, usando template local:', errors.join(' | '));
  return { data: generateLocalFallback(prompt, sector, referenceContent), provider: 'local:fallback', errors };
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
    available.push('Google Gemini');
    diagnostics.gemini = `Configurado (${geminiKey.slice(0, 6)}...)`;
  } else {
    diagnostics.gemini = 'GEMINI_API_KEY nao encontrada no ambiente';
  }

  if (process.env.OPENAI_API_KEY) {
    available.push('OpenAI');
    diagnostics.openai = 'Configurado';
  } else {
    diagnostics.openai = 'Nao configurada';
  }

  if (process.env.ANTHROPIC_API_KEY) {
    available.push('Anthropic Claude');
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
  console.log('[course-generator] session:', JSON.stringify({
    hasUser: !!session?.user,
    tenantId: session?.user?.tenantId ?? 'MISSING',
    role: session?.user?.role ?? 'MISSING',
  }));

  if (!session?.user?.tenantId) {
    return { success: false, error: 'Nao autenticado.' };
  }
  if (session.user.role !== 'admin_rh') {
    return { success: false, error: `Acesso negado: seu papel e "${session.user.role}", apenas "admin_rh" pode gerar cursos.` };
  }
  const tenantId = session.user.tenantId;

  const MAX_GENERATIONS_PER_DAY = 10;
  const rateLimit = await rateLimitCheck(`ratelimit:generate:${tenantId}`, MAX_GENERATIONS_PER_DAY, 86400);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Limite de ${MAX_GENERATIONS_PER_DAY} gerações por dia atingido. Tente novamente em ${Math.ceil(rateLimit.resetIn / 3600)}h.`,
    };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Entrada invalida.' };
  }

  const db = getTenantDb(tenantId);

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  console.log('[course-generator] tenant:', JSON.stringify({
    found: !!tenant,
    aiCredits: tenant?.aiCredits ?? 'N/A',
  }));

  if (!tenant) {
    return { success: false, error: 'Tenant nao encontrado.' };
  }
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
      error: err instanceof Error ? err.message : 'Falha ao gerar o curso.',
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
      const debit = await tx.tenant.updateMany({
        where: { id: tenantId, aiCredits: { gte: 1 } },
        data: { aiCredits: { decrement: 1 } },
      });
      if (debit.count === 0) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      const course = await tx.course.create({
        data: {
          tenantId,
          title: generated.data.courseTitle,
          description: generated.data.courseDescription,
          status: 'published',
          aiCreditsSpent: 1,
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
    console.log('[course-generator] Curso persistido no DB:', courseId);
  } catch (err) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
      return { success: false, error: `Creditos de IA insuficientes (concorrencia).` };
    }
    console.error('[course-generator] Persistencia falhou, retornando dados gerados:', err);
    courseId = randomUUID();
    lessonRecords = lessonsToCreate.map((l) => ({ ...l, id: randomUUID() }));
    creditsRemaining = Math.max(0, (tenant.aiCredits ?? 1) - 1);
  }

  try {
    revalidatePath('/admin', 'page');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/cursos', 'page');
    revalidatePath('/api/courses', 'page');
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
