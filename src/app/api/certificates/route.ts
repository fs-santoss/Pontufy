import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

export async function GET() {
  try {
    const { userId } = await getSessionContext();

    const certificates = await prisma.issuedCertificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        courseId: true,
        courseName: true,
        issuedAt: true,
      },
    });

    return NextResponse.json(certificates);
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('GET /api/certificates:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
