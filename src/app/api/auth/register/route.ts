import { NextResponse } from 'next/server';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';

const scryptAsync = promisify(scrypt);

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

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 },
      );
    }

    const invitation = await prisma.invitation.findUnique({ where: { token } });

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

    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          name: name.trim(),
          passwordHash,
          role: invitation.role,
          tenantId: invitation.tenantId,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/auth/register:', error);
    return NextResponse.json(
      { error: 'Erro interno ao criar conta.' },
      { status: 500 },
    );
  }
}
