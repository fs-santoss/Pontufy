import { auth } from '@/auth';

export async function getSessionContext() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Não autenticado.');
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role,
  };
}
