// ═══════════════════════════════════════════════════════════════════════
// Pontufy — Camada de Acesso a Dados com Segurança Zero Trust
// ═══════════════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Utilitário de Extensão do Prisma (Zero Trust Middleware).
 * 
 * Intercepta todas as consultas aos modelos contidos no escopo multitenant.
 * Injeta ou força a verificação do `tenantId` associado ao usuário atual,
 * prevenindo acessos cruzados (Cross-Tenant Data Leak) em rotas de API.
 */
export function getTenantDb(tenantId: string) {
  if (!tenantId) throw new Error("Operação negada: tenantId não fornecido.");

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Modelos que não possuem tenantId rígido (globais) ou requerem lógica especial
          if (model === 'Tenant') {
            return query(args);
          }
          
          if (model === 'Reward') {
            // Recompensas podem ser globais (tenantId = null) ou exclusivas da empresa.
            // Em operações de leitura, queremos ver as globais E as da empresa.
            if (operation === 'findMany' || operation === 'findFirst') {
              const currentWhere = (args as any).where || {};
              (args as any).where = {
                ...currentWhere,
                OR: [
                  { tenantId: null },
                  { tenantId: tenantId }
                ]
              };
            }
            return query(args);
          }

          // Para todos os outros modelos restritos (User, Course, Lesson, PointsLedger),
          // forçamos o isolamento lógico injetando o tenantId na cláusula WHERE.
          if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany'].includes(operation)) {
            const currentWhere = (args as any).where || {};
            (args as any).where = { ...currentWhere, tenantId };
          } else if (['create', 'createMany'].includes(operation)) {
            const currentData = (args as any).data;
            if (Array.isArray(currentData)) {
              currentData.forEach(d => d.tenantId = tenantId);
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

// Extrai de forma segura o tenantId e userId do token JWT verificado (Auth.js)
export async function getSessionContext(request?: Request) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Não autenticado.');
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role
  };
}
