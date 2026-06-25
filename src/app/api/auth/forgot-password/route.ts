import { NextResponse } from 'next/server';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { prisma } from '@/backend/db';
import { sendPasswordResetEmail } from '@/lib/email';

const scryptAsync = promisify(scrypt);
const TOKEN_EXPIRY_HOURS = 1;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { token, expiresAt, usedAt: null },
      create: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/auth/forgot-password:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const reset = await prisma.passwordReset.findUnique({ where: { token } });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado ou inválido.' }, { status: 400 });
    }

    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
    const passwordHash = `${salt}:${buf.toString('hex')}`;

    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/auth/forgot-password:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
