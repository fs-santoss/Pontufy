import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { getTenantDb } from '@/backend/db';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { broadcastToTenant } from '@/app/api/notifications/stream/route';
import { logAudit } from '@/lib/audit';

/**
 * Verifies that the request genuinely originates from QStash.
 */
async function verifyQStashSignature(req: NextRequest, body: string): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = req.headers.get('upstash-signature');

  if (!currentSigningKey || !nextSigningKey || !signature) return false;

  const receiver = new Receiver({ currentSigningKey, nextSigningKey });
  try {
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}

const QuizOptionSchema = z.object({ text: z.string().min(1) });
const QuizQuestionSchema = z.object({
  question: z.string().min(5),
  options: z.array(QuizOptionSchema).min(2).max(5),
  correctIndex: z.number().int().min(0),
});
const LessonSchema = z.object({
  title: z.string().min(3),
  type: z.enum(['text', 'video']),
  points: z.number().int().positive(),
});
const ModuleSchema = z.object({
  title: z.string().min(3),
  lessons: z.array(LessonSchema).min(1),
  quiz: z.array(QuizQuestionSchema).min(1).max(5).optional(),
});
const CourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  modules: z.array(ModuleSchema).min(1),
});

type CourseGenerated = z.infer<typeof CourseSchema>;

const SYSTEM_PROMPT = `Você é o motor de IA da Pontufy — uma plataforma B2B de educação corporativa gamificada.

Missão: Gerar um curso completo (módulos + aulas) adaptado ao setor vertical da empresa.

Regras Invioláveis:
1. FOCO SETORIAL — Adapte títulos, exemplos e vocabulário rigorosamente à vertical informada.
2. LIMITE DE PONTOS — A soma total de pontos de TODAS as aulas do curso NÃO pode exceder 200 pts.
3. ESTRUTURA — Gere entre 2 e 4 módulos, cada um com 2 a 4 aulas.
4. QUIZ — Inclua um array "quiz" com 2 a 3 perguntas de múltipla escolha ao final de cada módulo.
5. FORMATO — Responda exclusivamente no schema JSON fornecido.`;

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
          quiz: {
            type: 'ARRAY' as const,
            items: {
              type: 'OBJECT' as const,
              properties: {
                question: { type: 'STRING' as const },
                options: {
                  type: 'ARRAY' as const,
                  items: {
                    type: 'OBJECT' as const,
                    properties: { text: { type: 'STRING' as const } },
                    required: ['text'],
                  },
                },
                correctIndex: { type: 'INTEGER' as const },
              },
              required: ['question', 'options', 'correctIndex'],
            },
          },
        },
        required: ['title', 'lessons'],
      },
    },
  },
  required: ['title', 'description', 'modules'],
};

const FALLBACK_CATALOG: Record<string, CourseGenerated> = {
  tech: {
    title: 'Fundamentos de Cibersegurança',
    description: 'Proteção de dados, LGPD e boas práticas digitais.',
    modules: [
      { title: 'Introdução à Segurança', lessons: [
        { title: 'Phishing e Engenharia Social', type: 'text', points: 40 },
        { title: 'Gestão de Credenciais', type: 'video', points: 60 },
      ]},
    ],
  },
};

function normalizePoints(lessons: any[]) {
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
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const isValid = await verifyQStashSignature(request, rawBody);
  if (!isValid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const { tenantId, prompt, vertical } = JSON.parse(rawBody);

    if (!tenantId || !prompt) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const db = getTenantDb(tenantId);
    let courseData: CourseGenerated;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      courseData = FALLBACK_CATALOG[vertical] || FALLBACK_CATALOG.tech;
    } else {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const model = ai.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: SYSTEM_PROMPT,
        });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `Vertical: ${vertical || 'tech'}. Prompt: ${prompt}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
          },
        });

        const text = result.response.text();
        if (!text) throw new Error('Empty AI response');
        courseData = CourseSchema.parse(JSON.parse(text));
      } catch (err) {
        console.error('[queue-worker] AI Generation failed, using fallback:', err);
        courseData = FALLBACK_CATALOG[vertical] || FALLBACK_CATALOG.tech;
      }
    }

    const lessonsToCreate: any[] = [];
    for (const mod of courseData.modules) {
      for (const lesson of mod.lessons) {
        lessonsToCreate.push({
          title: `[${mod.title}] ${lesson.title}`,
          type: lesson.type,
          pointsAssigned: lesson.points || 10,
        });
      }
    }
    normalizePoints(lessonsToCreate);

    const quizData = courseData.modules
      .filter((m) => m.quiz && m.quiz.length > 0)
      .map((m) => ({ module: m.title, questions: m.quiz }));

    const newCourse = await db.$transaction(async (tx: any) => {
      const debit = await tx.tenant.updateMany({
        where: { id: tenantId, aiCredits: { gte: 1 } },
        data: { aiCredits: { decrement: 1 } },
      });
      if (debit.count === 0) throw new Error('INSUFFICIENT_CREDITS');

      return tx.course.create({
        data: {
          tenantId,
          title: courseData.title,
          description: courseData.description,
          status: 'published',
          aiCreditsSpent: 1,
          quizJson: quizData.length > 0 ? JSON.stringify(quizData) : null,
          lessons: { create: lessonsToCreate },
        },
        include: { lessons: true },
      });
    });

    logAudit({
      tenantId,
      action: 'COURSE_GENERATED_ASYNC',
      newValues: { courseId: newCourse.id, title: newCourse.title },
    }).catch(() => {});

    broadcastToTenant(tenantId, 'course_created', {
      courseId: newCourse.id,
      title: newCourse.title,
      lessonsCount: newCourse.lessons.length,
    });

    return NextResponse.json({ success: true, courseId: newCourse.id });
  } catch (error) {
    console.error('POST /api/webhooks/queue-worker:', error);
    return NextResponse.json({ error: 'WORKER_ERROR' }, { status: 500 });
  }
}
