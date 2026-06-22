import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

const VALID_ROLES = ['employee', 'guest'] as const;
const TOKEN_EXPIRY_HOURS = 72;

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role: inviteRole } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    if (!inviteRole || !VALID_ROLES.includes(inviteRole)) {
      return NextResponse.json(
        { error: `Role inválido. Valores aceitos: ${VALID_ROLES.join(', ')}` },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já cadastrado.' }, { status: 409 });
    }

    const pendingInvite = await prisma.invitation.findFirst({
      where: { email, tenantId, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      return NextResponse.json({ error: 'Convite pendente já existe para este email.' }, { status: 409 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: {
        tenantId,
        email,
        token,
        role: inviteRole,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        signupUrl: `/register?token=${token}`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('POST /api/admin/users/invite:', error);
    return NextResponse.json({ error: 'Erro interno ao criar convite.' }, { status: 500 });
  }
}
