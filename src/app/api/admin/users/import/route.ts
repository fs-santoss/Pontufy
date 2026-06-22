import { NextResponse } from 'next/server';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';
import { logAudit, extractRequestMeta } from '@/lib/audit';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString('hex')}`;
}

function parseCSV(text: string): { name: string; email: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(/[,;\t]/);
  const nameIdx = cols.findIndex((c) => c.trim() === 'name' || c.trim() === 'nome');
  const emailIdx = cols.findIndex((c) => c.trim() === 'email' || c.trim() === 'e-mail');

  if (nameIdx === -1 || emailIdx === -1) return [];

  const rows: { name: string; email: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/);
    const name = parts[nameIdx]?.trim();
    const email = parts[emailIdx]?.trim().toLowerCase();
    if (name && email && email.includes('@')) {
      rows.push({ name, email });
    }
  }
  return rows;
}

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo CSV é obrigatório.' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Apenas arquivos .csv são aceitos.' }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vazio ou formato inválido. Colunas esperadas: Name/Nome, Email.' }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json({ error: 'Máximo de 500 usuários por importação.' }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: rows.map((r) => r.email) } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    const tempPassword = randomBytes(8).toString('hex');
    const passwordHash = await hashPassword(tempPassword);

    const toCreate = rows.filter((r) => !existingEmails.has(r.email));

    let created = 0;
    const skipped = rows.length - toCreate.length;

    for (const r of toCreate) {
      try {
        await prisma.user.create({
          data: {
            tenantId,
            name: r.name,
            email: r.email,
            role: 'employee',
            passwordHash,
            pointsBalance: 0,
          },
        });
        created++;
      } catch {
        // duplicate email race condition — skip
      }
    }

    const { userId } = await getSessionContext();
    const meta = extractRequestMeta(request);
    await logAudit({
      tenantId,
      userId,
      action: 'USER_IMPORT',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      newValues: { total: rows.length, created, skipped },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        created,
        skipped,
        tempPassword,
      },
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('POST /api/admin/users/import:', error);
    return NextResponse.json({ error: 'Erro interno ao importar usuários.' }, { status: 500 });
  }
}
