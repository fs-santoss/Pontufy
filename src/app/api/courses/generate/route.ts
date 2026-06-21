import { NextResponse } from 'next/server';
import { getSessionContext, getTenantDb } from '@/backend/db';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// ── Zod Schema: Tipagem rígida do output da IA ──────────────────────────────
const LessonSchema = z.object({
  title: z.string().min(3),
  type: z.enum(['text', 'video']),
  points: z.number().int().positive(),
});

const ModuleSchema = z.object({
  title: z.string().min(3),
  lessons: z.array(LessonSchema).min(1),
});

const CourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  modules: z.array(ModuleSchema).min(1),
});

type CourseGenerated = z.infer<typeof CourseSchema>;

// ── Gemini SDK Response Schema (Structured Outputs nativo) ──────────────────
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT' as const,
  properties: {
    title: { type: 'STRING' as const },
    description: { type: 'STRING' as const },
    modules: {
      type: 'ARRAY' as const,
      items: {
        type: 'OBJECT' as const,
        properties: {
          title: { type: 'STRING' as const },
          lessons: {
            type: 'ARRAY' as const,
            items: {
              type: 'OBJECT' as const,
              properties: {
                title: { type: 'STRING' as const },
                type: { type: 'STRING' as const, enum: ['text', 'video'] },
                points: { type: 'INTEGER' as const },
              },
              required: ['title', 'type', 'points'],
            },
          },
        },
        required: ['title', 'lessons'],
      },
    },
  },
  required: ['title', 'description', 'modules'],
};

// ── System Prompt: Engenharia de Prompt Interna ─────────────────────────────
const SYSTEM_PROMPT = `Você é o motor de IA da Pontufy — uma plataforma B2B de educação corporativa gamificada.

Missão: Gerar um curso completo (módulos + aulas) adaptado ao setor vertical da empresa.

Regras Invioláveis:
1. FOCO SETORIAL — Adapte títulos, exemplos e vocabulário rigorosamente à vertical informada (Saúde, Tecnologia, Varejo ou Indústria). Não produza conteúdo genérico.
2. LIMITE DE PONTOS — A soma total de pontos de TODAS as aulas do curso NÃO pode exceder 200 pts. Distribua proporcionalmente: aulas avançadas = mais pontos, introdutórias = menos.
3. ESTRUTURA — Gere entre 2 e 4 módulos, cada um com 2 a 4 aulas. Alterne tipos (text/video) para variar a experiência.
4. FORMATO — Responda exclusivamente no schema JSON fornecido. Zero markdown, zero texto fora do JSON.`;

// ── Fallback: Cursos estáticos por setor (Zero Downtime) ────────────────────
const FALLBACK_CATALOG: Record<string, CourseGenerated> = {
  health: {
    title: 'Compliance e Segurança em Saúde',
    description: 'Protocolos clínicos, LGPD hospitalar e ética no atendimento.',
    modules: [
      { title: 'Protocolos Clínicos', lessons: [
        { title: 'Higienização e Prevenção de Infecções', type: 'text', points: 35 },
        { title: 'Gestão de Riscos Hospitalares', type: 'video', points: 45 },
      ]},
      { title: 'Segurança de Dados e Ética', lessons: [
        { title: 'Privacidade do Paciente e LGPD', type: 'text', points: 40 },
        { title: 'Estudo de Caso: Ética no Atendimento', type: 'video', points: 30 },
      ]},
    ],
  },
  retail: {
    title: 'Excelência em Vendas e Atendimento',
    description: 'Técnicas de venda consultiva, objeções e fidelização.',
    modules: [
      { title: 'Abordagem ao Cliente', lessons: [
        { title: 'Escuta Ativa e Rapport', type: 'text', points: 30 },
        { title: 'Contorno de Objeções no PDV', type: 'video', points: 50 },
      ]},
      { title: 'Fechamento e Pós-Venda', lessons: [
        { title: 'Fidelização de Longo Prazo', type: 'text', points: 40 },
        { title: 'Indicadores de Conversão', type: 'video', points: 30 },
      ]},
    ],
  },
  industry: {
    title: 'Segurança Industrial e NR-12',
    description: 'Prevenção de acidentes, EPIs e manutenção preventiva.',
    modules: [
      { title: 'Segurança Operacional', lessons: [
        { title: 'NR-12 e Proteção de Máquinas', type: 'text', points: 40 },
        { title: 'Uso Correto de EPIs', type: 'video', points: 40 },
      ]},
      { title: 'Eficiência e Manutenção', lessons: [
        { title: 'Manutenção Preventiva Básica', type: 'text', points: 35 },
        { title: 'Otimização de Linha de Produção', type: 'video', points: 35 },
      ]},
    ],
  },
  tech: {
    title: 'Segurança da Informação e LGPD',
    description: 'Cibersegurança, engenharia social e tratamento de dados.',
    modules: [
      { title: 'Fundamentos de Segurança', lessons: [
        { title: 'Engenharia Social e Phishing', type: 'text', points: 30 },
        { title: 'Gestão de Senhas e Acessos', type: 'video', points: 50 },
      ]},
      { title: 'LGPD na Prática', lessons: [
        { title: 'Tratamento de Dados e Consentimento', type: 'text', points: 40 },
        { title: 'Ciclo de Vida do Dado', type: 'video', points: 30 },
      ]},
    ],
  },
};

function resolveFallback(vertical: string): CourseGenerated {
  const key = (vertical || 'tech').toLowerCase();
  const aliases: Record<string, string> = {
    saude: 'health', 'saúde': 'health',
    varejo: 'retail',
    'indústria': 'industry', industria: 'industry',
    tecnologia: 'tech',
  };
  return FALLBACK_CATALOG[aliases[key] || key] || FALLBACK_CATALOG.tech;
}

// ── Normalização de Pontos: Garante ≤ 200 pts via escalonamento proporcional ─
function normalizePoints(
  lessons: { title: string; type: 'text' | 'video'; pointsAssigned: number }[]
): void {
  const total = lessons.reduce((s, l) => s + l.pointsAssigned, 0);
  if (total <= 200) return;

  let runningSum = 0;
  for (let i = 0; i < lessons.length; i++) {
    if (i === lessons.length - 1) {
      lessons[i].pointsAssigned = Math.max(1, 200 - runningSum);
    } else {
      lessons[i].pointsAssigned = Math.max(1, Math.round((lessons[i].pointsAssigned / total) * 200));
      runningSum += lessons[i].pointsAssigned;
    }
  }

  // Greedy trim: se arredondamento ultrapassou, decrementa do maior
  let sum = lessons.reduce((s, l) => s + l.pointsAssigned, 0);
  while (sum > 200) {
    const target = lessons.filter(l => l.pointsAssigned > 1).sort((a, b) => b.pointsAssigned - a.pointsAssigned)[0];
    if (!target) break;
    target.pointsAssigned--;
    sum--;
  }
}

// ── Handler Principal ───────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext(request);
    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso Negado: Apenas Gestores de RH.' }, { status: 403 });
    }

    const { prompt, vertical } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'O campo prompt é obrigatório.' }, { status: 400 });
    }

    const db = getTenantDb(tenantId);
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.aiCredits < 1) {
      return NextResponse.json({ error: 'Créditos de IA insuficientes.' }, { status: 402 });
    }

    // ── Geração via LLM ou Fallback ──
    let courseData: CourseGenerated;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      courseData = resolveFallback(vertical);
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Vertical: ${vertical || 'tech'}. Prompt do RH: ${prompt}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            temperature: 0.6,
          },
        });

        const text = response.text;
        if (!text) throw new Error('Resposta vazia da IA.');
        courseData = CourseSchema.parse(JSON.parse(text));
      } catch {
        courseData = resolveFallback(vertical);
      }
    }

    // ── Flatten Modules → Lessons para o schema Prisma ──
    const lessonsToCreate: { title: string; type: 'text' | 'video'; pointsAssigned: number }[] = [];
    for (const mod of courseData.modules) {
      for (const lesson of mod.lessons) {
        lessonsToCreate.push({
          title: `[${mod.title}] ${lesson.title}`,
          type: lesson.type,
          pointsAssigned: typeof lesson.points === 'number' ? lesson.points : 10,
        });
      }
    }

    normalizePoints(lessonsToCreate);

    // ── Transação Atômica: Debita crédito + Persiste curso ──
    const newCourse = await db.$transaction(async (tx: any) => {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { aiCredits: { decrement: 1 } },
      });

      return tx.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          aiCreditsSpent: 1,
          status: 'published',
          lessons: { create: lessonsToCreate },
        },
        include: { lessons: true },
      });
    });

    return NextResponse.json({ success: true, course: newCourse });
  } catch (error: any) {
    console.error('POST /api/courses/generate:', error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}
