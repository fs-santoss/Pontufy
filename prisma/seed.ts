import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create Tenant (Empresa Alpha)
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

  // 2. Create Users
  const hrAdmin = await prisma.user.upsert({
    where: { email: 'admin@empresaalpha.com' },
    update: {},
    create: {
      id: 'user-admin-001',
      tenantId: tenant.id,
      name: 'Maria Silva (RH)',
      email: 'admin@empresaalpha.com',
      role: 'admin_rh',
      pointsBalance: 500,
    },
  });
  console.log(`Upserted User (Admin): ${hrAdmin.name}`);

  const employee = await prisma.user.upsert({
    where: { email: 'joao@empresaalpha.com' },
    update: {},
    create: {
      id: 'user-emp-002',
      tenantId: tenant.id,
      name: 'João Souza',
      email: 'joao@empresaalpha.com',
      role: 'employee',
      pointsBalance: 1250,
    },
  });
  console.log(`Upserted User (Employee): ${employee.name}`);

  // 3. Create Rewards (Catalog)
  const reward1 = await prisma.reward.create({
    data: {
      tenantId: tenant.id, // Or null for global rewards
      partnerStore: 'amazon',
      title: 'Vale-Presente Amazon R$ 50',
      affiliateLink: 'https://amazon.com.br/vale50',
      pricePoints: 500,
      isActive: true,
    },
  });

  const reward2 = await prisma.reward.create({
    data: {
      tenantId: tenant.id,
      partnerStore: 'magalu',
      title: 'Cupom Magalu R$ 100',
      affiliateLink: 'https://magazineluiza.com.br/cupom100',
      pricePoints: 1000,
      isActive: true,
    },
  });
  console.log(`Created Rewards: ${reward1.title}, ${reward2.title}`);

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
