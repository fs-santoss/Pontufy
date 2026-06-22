import { PrismaClient } from '@prisma/client';
import { resolve } from 'path';
import { existsSync, copyFileSync, mkdirSync } from 'fs';

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL;
  }

  const bundledDb = resolve(process.cwd(), 'prisma/dev.db');

  if (process.env.VERCEL) {
    const tmpDb = '/tmp/dev.db';
    if (!existsSync(tmpDb) && existsSync(bundledDb)) {
      copyFileSync(bundledDb, tmpDb);
    }
    return `file:${tmpDb}`;
  }

  return `file:${bundledDb}`;
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'file:./dev.db') {
  process.env.DATABASE_URL = resolveDatabaseUrl();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaRead: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

function createReadReplica(): PrismaClient {
  const readUrl = process.env.DATABASE_READ_URL;
  if (!readUrl) return prisma;

  if (!globalForPrisma.prismaRead) {
    globalForPrisma.prismaRead = new PrismaClient({
      datasourceUrl: readUrl,
    });
  }
  return globalForPrisma.prismaRead;
}

export const prismaRead = createReadReplica();

// Operation classification shared across model branches.
const READ_OPS = [
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
];
const WRITE_OPS = ['update', 'updateMany', 'delete', 'deleteMany'];
// Relation filters (e.g. `course: { is: {...} }`) are rejected by Prisma inside
// a findUnique `where`, so reads that must be relation-scoped use findFirst.
const RELATION_SAFE_READ_OPS = ['findFirst', 'findFirstOrThrow', 'findMany', 'count'];

/**
 * Zero Trust Prisma extension — isolates every query to the caller's tenant.
 *
 * Per-model scoping:
 *  - Tenant: global lookup by design (callers always pass the session tenantId).
 *  - User / Course / PointsLedger / AuditLog / Invitation / PasswordReset:
 *    strict `tenantId` equality injected into every read and write.
 *  - Reward: reads expose global (tenantId = null) + own tenant; writes are
 *    restricted to the caller's own rewards (global/foreign rewards are immutable).
 *  - Lesson: no tenantId column — reads are scoped through the parent Course
 *    relation (`course.tenantId`). findUnique cannot carry a relation filter, so
 *    tenant-sensitive lookups must use findFirst (enforced at call sites).
 *  - LessonCompletion: keyed by userId; callers always constrain by the session
 *    userId, so no tenant column is needed.
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) throw new Error('Operação negada: tenantId não fornecido.');

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (model === 'Tenant' || model === 'LessonCompletion') {
            return query(args);
          }

          // Reward: global rewards (tenantId null) are visible to every tenant
          // but mutable only by no tenant; own rewards are read+write.
          if (model === 'Reward') {
            if (READ_OPS.includes(operation)) {
              const currentWhere = (args as any).where || {};
              (args as any).where = {
                ...currentWhere,
                OR: [{ tenantId: null }, { tenantId }],
              };
            } else if (WRITE_OPS.includes(operation)) {
              const currentWhere = (args as any).where || {};
              (args as any).where = { ...currentWhere, tenantId };
            } else if (['create', 'createMany'].includes(operation)) {
              const currentData = (args as any).data;
              if (Array.isArray(currentData)) {
                currentData.forEach((d: any) => {
                  if (d.tenantId === undefined) d.tenantId = tenantId;
                });
              } else if (currentData && currentData.tenantId === undefined) {
                currentData.tenantId = tenantId;
              }
            }
            return query(args);
          }

          // Lesson: scope through the parent Course relation. Relation filters are
          // invalid inside findUnique, so only relation-safe reads get scoped here.
          if (model === 'Lesson') {
            if (RELATION_SAFE_READ_OPS.includes(operation)) {
              const currentWhere = (args as any).where || {};
              (args as any).where = {
                ...currentWhere,
                course: { is: { tenantId } },
              };
            }
            return query(args);
          }

          // Strict tenant isolation for all remaining tenant-owned models.
          if ([...READ_OPS, ...WRITE_OPS].includes(operation)) {
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
