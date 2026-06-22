import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

// POST /api/admin/seed
// Protected by Authorization: Bearer <CRON_SECRET>
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    const log: string[] = [];

    const tenant = await prisma.tenant.upsert({
      where: { id: 'tenant-alpha-001' },
      update: {},
      create: {
        id: 'tenant-alpha-001',
        name: 'Empresa Alpha',
        sector: 'tech',
        contractStatus: 'active',
        aiCredits: 1000,
      },
    });
    log.push(`Tenant: ${tenant.name}`);

    const users = [
      { id: 'user-admin-001', email: 'admin@empresaalpha.com', name: 'Maria Silva (RH)', role: 'admin_rh', pointsBalance: 500 },
      { id: 'user-admin-002', email: 'admin@alpha.com', name: 'Admin Alpha', role: 'admin_rh', pointsBalance: 0 },
      { id: 'user-emp-002', email: 'joao@empresaalpha.com', name: 'João Souza', role: 'employee', pointsBalance: 1250 },
      { id: 'user-emp-003', email: 'user@alpha.com', name: 'Employee Alpha', role: 'employee', pointsBalance: 200 },
      { id: 'user-guest-001', email: 'guest@alpha.com', name: 'Guest Alpha', role: 'guest', pointsBalance: 0 },
    ];

    for (const u of users) {
      const hash = await hashPassword('123456');
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: hash },
        create: { ...u, tenantId: tenant.id, passwordHash: hash },
      });
      log.push(`User: ${u.email}`);
    }

    const courses = [
      { id: 'course-001', title: 'Liderança na Era da IA', description: 'Desenvolva habilidades essenciais para liderar equipes multidisciplinares com suporte de Inteligência Artificial.', status: 'published' },
      { id: 'course-002', title: 'Comunicação Não Violenta', description: 'Aprenda técnicas de CNV para melhorar o ambiente corporativo e a colaboração entre equipes.', status: 'published' },
      { id: 'course-003', title: 'Gestão Ágil de Projetos', description: 'Domine frameworks ágeis como Scrum e Kanban para entregar projetos com mais velocidade e qualidade.', status: 'published' },
    ];

    const lessonsMap: Record<string, Array<{ id: string; title: string; type: string; pointsAssigned: number }>> = {
      'course-001': [
        { id: 'lesson-001', title: 'O que é IA Generativa?', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-002', title: 'Aplicações B2B da IA', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-003', title: 'Preparando a Equipe para IA', type: 'video', pointsAssigned: 75 },
        { id: 'lesson-004', title: 'Gestão de Riscos com IA', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-005', title: 'Case Studies: IA no RH', type: 'text', pointsAssigned: 75 },
      ],
      'course-002': [
        { id: 'lesson-006', title: 'Fundamentos da CNV', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-007', title: 'Escuta Ativa e Empatia', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-008', title: 'Expressando Necessidades', type: 'video', pointsAssigned: 75 },
        { id: 'lesson-009', title: 'Resolvendo Conflitos', type: 'text', pointsAssigned: 75 },
      ],
      'course-003': [
        { id: 'lesson-010', title: 'Manifesto Ágil', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-011', title: 'Scrum na Prática', type: 'video', pointsAssigned: 75 },
        { id: 'lesson-012', title: 'Kanban para Times', type: 'video', pointsAssigned: 50 },
        { id: 'lesson-013', title: 'Métricas Ágeis', type: 'text', pointsAssigned: 75 },
      ],
    };

    for (const c of courses) {
      await prisma.course.upsert({
        where: { id: c.id },
        update: {},
        create: { ...c, tenantId: tenant.id },
      });
      for (const l of lessonsMap[c.id]) {
        await prisma.lesson.upsert({
          where: { id: l.id },
          update: {},
          create: { ...l, courseId: c.id },
        });
      }
      log.push(`Course: ${c.title}`);
    }

    const rewards = [
      { id: 'reward-001', tenantId: tenant.id, partnerStore: 'amazon', title: 'Vale-Presente Amazon R$ 50', affiliateLink: 'https://amazon.com.br/vale50', pricePoints: 500, imageUrl: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&q=80&w=600', category: 'coupons', isActive: true },
      { id: 'reward-002', tenantId: tenant.id, partnerStore: 'magalu', title: 'Cupom Magalu R$ 100', affiliateLink: 'https://magazineluiza.com.br/cupom100', pricePoints: 1000, imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600', category: 'coupons', isActive: true },
      { id: 'reward-003', tenantId: null, partnerStore: 'amazon', title: 'Fone de Ouvido Bluetooth Premium', affiliateLink: 'https://amazon.com.br/fone-bt', pricePoints: 1200, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600', category: 'tech', isActive: true },
      { id: 'reward-004', tenantId: null, partnerStore: 'shopee', title: 'Kit Exercícios Casa', affiliateLink: 'https://shopee.com.br/kit-exercicio', pricePoints: 1500, imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600', category: 'health', isActive: true },
      { id: 'reward-005', tenantId: null, partnerStore: 'mercadolivre', title: 'Cadeira de Escritório Ergonômica', affiliateLink: 'https://mercadolivre.com.br/cadeira-ergo', pricePoints: 3500, imageUrl: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600', category: 'home', isActive: true },
      { id: 'reward-006', tenantId: null, partnerStore: 'amazon', title: 'Smartwatch Fitness', affiliateLink: 'https://amazon.com.br/smartwatch', pricePoints: 2100, imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600', category: 'tech', isActive: true },
    ];

    for (const r of rewards) {
      await prisma.reward.upsert({ where: { id: r.id }, update: {}, create: r });
    }
    log.push(`${rewards.length} rewards`);

    return NextResponse.json({ ok: true, seeded: log });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
