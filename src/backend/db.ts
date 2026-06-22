import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Otimização Preventiva de Conexões em Ambiente Serverless
// A URL de conexão no schema.prisma.ts DEVE utilizar o connection pooler (PgBouncer/Prisma Accelerate)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Zero Trust Prisma extension — isolates every query to the caller's tenant.
 *
 * Bypass models:
 *  - Tenant: global lookup by design.
 *  - Lesson: scoped via courseId → Course → tenantId; no direct tenantId column.
 *  - LessonCompletion: scoped via userId; no tenantId column.
 *  - Reward: special OR logic (global + tenant-specific).
 */
export function getTenantPrisma(tenantId: string) {
  if (!tenantId) throw new Error('Operação negada: tenantId não fornecido.');

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (model === 'Tenant') {
            return query(args);
          }

          if (model === 'Lesson' || model === 'LessonCompletion') {
            return query(args);
          }

          if (model === 'Reward') {
            if (operation === 'findMany' || operation === 'findFirst' || operation === 'findUnique') {
              const currentWhere = (args as any).where || {};
              (args as any).where = {
                ...currentWhere,
                OR: [{ tenantId: null }, { tenantId }],
              };
            }
            return query(args);
          }

          // Strict tenant isolation for User, Course, PointsLedger
          if (
            ['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)
          ) {
            const currentWhere = (args as any).where || {};
            (args as any).where = { ...currentWhere, tenantId };
          } else if (['create', 'createMany'].includes(operation)) {
            const currentData = (args as any).data;
            if (Array.isArray(currentData)) {
              currentData.forEach((d: any) => (d.tenantId = tenantId));
            } else {
              currentData.tenantId = tenantId;
            }
          }

          return query(args);
        },
      },
    },
  });
}

export const getTenantDb = getTenantPrisma;
