import { NextResponse } from 'next/server';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-setup-secret');
  const secret = process.env.AUTH_SECRET;

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  try {
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

    const users = [
      { id: 'user-admin-001', email: 'admin@empresaalpha.com', name: 'Maria Silva (RH)', role: 'admin_rh', points: 500 },
      { id: 'user-admin-002', email: 'admin@alpha.com', name: 'Admin Alpha', role: 'admin_rh', points: 0 },
      { id: 'user-emp-002', email: 'joao@empresaalpha.com', name: 'João Souza', role: 'employee', points: 1250 },
      { id: 'user-emp-003', email: 'user@alpha.com', name: 'Employee Alpha', role: 'employee', points: 200 },
      { id: 'user-guest-001', email: 'guest@alpha.com', name: 'Guest Alpha', role: 'guest', points: 0 },
    ];

    const seededUsers: string[] = [];
    for (const u of users) {
      const hash = await hashPassword('123456');
      await prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: hash },
        create: {
          id: u.id,
          tenantId: tenant.id,
          name: u.name,
          email: u.email,
          role: u.role,
          pointsBalance: u.points,
          passwordHash: hash,
        },
      });
      seededUsers.push(u.email);
    }

    const courses = [
      {
        id: 'course-001',
        title: 'Liderança na Era da IA',
        description: 'Desenvolva habilidades essenciais para liderar equipes multidisciplinares com suporte de Inteligência Artificial.',
        lessons: [
          { id: 'lesson-001', title: 'O que é IA Generativa?', type: 'video', points: 50 },
          { id: 'lesson-002', title: 'Aplicações B2B da IA', type: 'video', points: 50 },
          { id: 'lesson-003', title: 'Preparando a Equipe para IA', type: 'video', points: 75 },
          { id: 'lesson-004', title: 'Gestão de Riscos com IA', type: 'video', points: 50 },
          { id: 'lesson-005', title: 'Case Studies: IA no RH', type: 'text', points: 75 },
        ],
      },
      {
        id: 'course-002',
        title: 'Comunicação Não Violenta',
        description: 'Aprenda técnicas de CNV para melhorar o ambiente corporativo e a colaboração entre equipes.',
        lessons: [
          { id: 'lesson-006', title: 'Fundamentos da CNV', type: 'video', points: 50 },
          { id: 'lesson-007', title: 'Escuta Ativa e Empatia', type: 'video', points: 50 },
          { id: 'lesson-008', title: 'Expressando Necessidades', type: 'video', points: 75 },
          { id: 'lesson-009', title: 'Resolvendo Conflitos', type: 'text', points: 75 },
        ],
      },
      {
        id: 'course-003',
        title: 'Gestão Ágil de Projetos',
        description: 'Domine frameworks ágeis como Scrum e Kanban para entregar projetos com mais velocidade e qualidade.',
        lessons: [
          { id: 'lesson-010', title: 'Manifesto Ágil', type: 'video', points: 50 },
          { id: 'lesson-011', title: 'Scrum na Prática', type: 'video', points: 75 },
          { id: 'lesson-012', title: 'Kanban para Times', type: 'video', points: 50 },
          { id: 'lesson-013', title: 'Métricas Ágeis', type: 'text', points: 75 },
        ],
      },
    ];

    for (const c of courses) {
      await prisma.course.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          tenantId: tenant.id,
          title: c.title,
          description: c.description,
          status: 'published',
        },
      });
      for (const l of c.lessons) {
        await prisma.lesson.upsert({
          where: { id: l.id },
          update: {},
          create: {
            id: l.id,
            courseId: c.id,
            title: l.title,
            type: l.type,
            pointsAssigned: l.points,
          },
        });
      }
    }

    const rewards = [
      { id: 'reward-001', tenantId: tenant.id, store: 'amazon', title: 'Vale-Presente Amazon R$ 50', link: 'https://amazon.com.br/vale50', price: 500, image: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&q=80&w=600', category: 'coupons' },
      { id: 'reward-002', tenantId: tenant.id, store: 'magalu', title: 'Cupom Magalu R$ 100', link: 'https://magazineluiza.com.br/cupom100', price: 1000, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600', category: 'coupons' },
      { id: 'reward-003', tenantId: null, store: 'amazon', title: 'Fone de Ouvido Bluetooth Premium', link: 'https://amazon.com.br/fone-bt', price: 1200, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600', category: 'tech' },
      { id: 'reward-004', tenantId: null, store: 'shopee', title: 'Kit Exercícios Casa', link: 'https://shopee.com.br/kit-exercicio', price: 1500, image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600', category: 'health' },
      { id: 'reward-005', tenantId: null, store: 'mercadolivre', title: 'Cadeira de Escritório Ergonômica', link: 'https://mercadolivre.com.br/cadeira-ergo', price: 3500, image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600', category: 'home' },
      { id: 'reward-006', tenantId: null, store: 'amazon', title: 'Smartwatch Fitness', link: 'https://amazon.com.br/smartwatch', price: 2100, image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600', category: 'tech' },
    ];

    for (const r of rewards) {
      await prisma.reward.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          tenantId: r.tenantId,
          partnerStore: r.store,
          title: r.title,
          affiliateLink: r.link,
          pricePoints: r.price,
          imageUrl: r.image,
          category: r.category,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      tenant: tenant.name,
      users: seededUsers,
      courses: courses.length,
      rewards: rewards.length,
    });
  } catch (error) {
    console.error('POST /api/setup/seed:', error);
    return NextResponse.json({ error: 'Erro ao semear banco de dados.', details: String(error) }, { status: 500 });
  }
}
