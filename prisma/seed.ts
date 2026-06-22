import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

async function main() {
  console.log('Start seeding...');

  // 1. Tenant
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
  console.log(`Upserted Tenant: ${tenant.name}`);

  // 2. Users
  const adminHash = await hashPassword('123456');
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'admin@empresaalpha.com' },
    update: { passwordHash: adminHash },
    create: {
      id: 'user-admin-001',
      tenantId: tenant.id,
      name: 'Maria Silva (RH)',
      email: 'admin@empresaalpha.com',
      role: 'admin_rh',
      pointsBalance: 500,
      passwordHash: adminHash,
    },
  });
  console.log(`Upserted User (Admin): ${hrAdmin.name}`);

  const admin2Hash = await hashPassword('123456');
  const admin2 = await prisma.user.upsert({
    where: { email: 'admin@alpha.com' },
    update: { passwordHash: admin2Hash },
    create: {
      id: 'user-admin-002',
      tenantId: tenant.id,
      name: 'Admin Alpha',
      email: 'admin@alpha.com',
      role: 'admin_rh',
      pointsBalance: 0,
      passwordHash: admin2Hash,
    },
  });
  console.log(`Upserted User (Admin 2): ${admin2.name}`);

  const empHash = await hashPassword('123456');
  const employee = await prisma.user.upsert({
    where: { email: 'joao@empresaalpha.com' },
    update: { passwordHash: empHash },
    create: {
      id: 'user-emp-002',
      tenantId: tenant.id,
      name: 'João Souza',
      email: 'joao@empresaalpha.com',
      role: 'employee',
      pointsBalance: 1250,
      passwordHash: empHash,
    },
  });
  console.log(`Upserted User (Employee): ${employee.name}`);

  const emp2Hash = await hashPassword('123456');
  const employee2 = await prisma.user.upsert({
    where: { email: 'user@alpha.com' },
    update: { passwordHash: emp2Hash },
    create: {
      id: 'user-emp-003',
      tenantId: tenant.id,
      name: 'Employee Alpha',
      email: 'user@alpha.com',
      role: 'employee',
      pointsBalance: 200,
      passwordHash: emp2Hash,
    },
  });
  console.log(`Upserted User (Employee 2): ${employee2.name}`);

  const guestHash = await hashPassword('123456');
  const guest = await prisma.user.upsert({
    where: { email: 'guest@alpha.com' },
    update: { passwordHash: guestHash },
    create: {
      id: 'user-guest-001',
      tenantId: tenant.id,
      name: 'Guest Alpha',
      email: 'guest@alpha.com',
      role: 'guest',
      pointsBalance: 0,
      passwordHash: guestHash,
    },
  });
  console.log(`Upserted User (Guest): ${guest.name}`);

  // 3. Courses + Lessons
  const course1 = await prisma.course.upsert({
    where: { id: 'course-001' },
    update: {},
    create: {
      id: 'course-001',
      tenantId: tenant.id,
      title: 'Liderança na Era da IA',
      description: 'Desenvolva habilidades essenciais para liderar equipes multidisciplinares com suporte de Inteligência Artificial.',
      status: 'published',
    },
  });

  const course1Lessons = [
    { id: 'lesson-001', courseId: course1.id, title: 'O que é IA Generativa?', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-002', courseId: course1.id, title: 'Aplicações B2B da IA', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-003', courseId: course1.id, title: 'Preparando a Equipe para IA', type: 'video', pointsAssigned: 75 },
    { id: 'lesson-004', courseId: course1.id, title: 'Gestão de Riscos com IA', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-005', courseId: course1.id, title: 'Case Studies: IA no RH', type: 'text', pointsAssigned: 75 },
  ];

  for (const lesson of course1Lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }
  console.log(`Upserted Course: ${course1.title} (${course1Lessons.length} lessons)`);

  const course2 = await prisma.course.upsert({
    where: { id: 'course-002' },
    update: {},
    create: {
      id: 'course-002',
      tenantId: tenant.id,
      title: 'Comunicação Não Violenta',
      description: 'Aprenda técnicas de CNV para melhorar o ambiente corporativo e a colaboração entre equipes.',
      status: 'published',
    },
  });

  const course2Lessons = [
    { id: 'lesson-006', courseId: course2.id, title: 'Fundamentos da CNV', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-007', courseId: course2.id, title: 'Escuta Ativa e Empatia', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-008', courseId: course2.id, title: 'Expressando Necessidades', type: 'video', pointsAssigned: 75 },
    { id: 'lesson-009', courseId: course2.id, title: 'Resolvendo Conflitos', type: 'text', pointsAssigned: 75 },
  ];

  for (const lesson of course2Lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }
  console.log(`Upserted Course: ${course2.title} (${course2Lessons.length} lessons)`);

  const course3 = await prisma.course.upsert({
    where: { id: 'course-003' },
    update: {},
    create: {
      id: 'course-003',
      tenantId: tenant.id,
      title: 'Gestão Ágil de Projetos',
      description: 'Domine frameworks ágeis como Scrum e Kanban para entregar projetos com mais velocidade e qualidade.',
      status: 'published',
    },
  });

  const course3Lessons = [
    { id: 'lesson-010', courseId: course3.id, title: 'Manifesto Ágil', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-011', courseId: course3.id, title: 'Scrum na Prática', type: 'video', pointsAssigned: 75 },
    { id: 'lesson-012', courseId: course3.id, title: 'Kanban para Times', type: 'video', pointsAssigned: 50 },
    { id: 'lesson-013', courseId: course3.id, title: 'Métricas Ágeis', type: 'text', pointsAssigned: 75 },
  ];

  for (const lesson of course3Lessons) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }
  console.log(`Upserted Course: ${course3.title} (${course3Lessons.length} lessons)`);

  // 4. Rewards (enriched with imageUrl and category)
  const rewards = [
    {
      id: 'reward-001',
      tenantId: tenant.id,
      partnerStore: 'amazon',
      title: 'Vale-Presente Amazon R$ 50',
      affiliateLink: 'https://amazon.com.br/vale50',
      pricePoints: 500,
      imageUrl: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?auto=format&fit=crop&q=80&w=600',
      category: 'coupons',
      isActive: true,
    },
    {
      id: 'reward-002',
      tenantId: tenant.id,
      partnerStore: 'magalu',
      title: 'Cupom Magalu R$ 100',
      affiliateLink: 'https://magazineluiza.com.br/cupom100',
      pricePoints: 1000,
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600',
      category: 'coupons',
      isActive: true,
    },
    {
      id: 'reward-003',
      tenantId: null,
      partnerStore: 'amazon',
      title: 'Fone de Ouvido Bluetooth Premium',
      affiliateLink: 'https://amazon.com.br/fone-bt',
      pricePoints: 1200,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
      category: 'tech',
      isActive: true,
    },
    {
      id: 'reward-004',
      tenantId: null,
      partnerStore: 'shopee',
      title: 'Kit Exercícios Casa',
      affiliateLink: 'https://shopee.com.br/kit-exercicio',
      pricePoints: 1500,
      imageUrl: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&q=80&w=600',
      category: 'health',
      isActive: true,
    },
    {
      id: 'reward-005',
      tenantId: null,
      partnerStore: 'mercadolivre',
      title: 'Cadeira de Escritório Ergonômica',
      affiliateLink: 'https://mercadolivre.com.br/cadeira-ergo',
      pricePoints: 3500,
      imageUrl: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=600',
      category: 'home',
      isActive: true,
    },
    {
      id: 'reward-006',
      tenantId: null,
      partnerStore: 'amazon',
      title: 'Smartwatch Fitness',
      affiliateLink: 'https://amazon.com.br/smartwatch',
      pricePoints: 2100,
      imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=600',
      category: 'tech',
      isActive: true,
    },
  ];

  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: { id: reward.id },
      update: {},
      create: reward,
    });
  }
  console.log(`Upserted ${rewards.length} Rewards`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
