import { NextResponse } from 'next/server';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';
import { sendWelcomeEmail } from '@/lib/email';

const scryptAsync = promisify(scrypt);

/**
 * Standard password hashing logic, synchronized with verification in auth.ts
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function POST(request: Request) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, nome e senha são obrigatórios.' },
        { status: 400 },
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres.' },
        { status: 400 },
      );
    }

    // Atomic lookup and validation of the invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Convite inválido.' }, { status: 404 });
    }

    if (invitation.usedAt) {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado.' },
        { status: 410 },
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este convite expirou. Solicite um novo ao seu gestor.' },
        { status: 410 },
      );
    }

    // Check for email collision
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe uma conta com este email.' },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user and mark invitation as used in a single transaction
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          name: name.trim(),
          passwordHash,
          role: invitation.role,
          tenantId: invitation.tenantId,
          pointsBalance: 0,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Async email sending (non-blocking)
    sendWelcomeEmail(invitation.email, name.trim()).catch((err) => {
      console.error('[register] Failed to send welcome email:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/auth/register:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta.' },
      { status: 500 },
    );
  }
}
