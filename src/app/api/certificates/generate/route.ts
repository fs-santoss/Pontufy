import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb, prisma } from '@/backend/db';
import { jsPDF } from 'jspdf';

export async function POST(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: 'courseId é obrigatório.' }, { status: 400 });
    }

    const db = getTenantDb(tenantId);

    const course = await db.course.findFirst({
      where: { id: courseId, status: 'published' },
      include: { lessons: { select: { id: true } } },
    });

    if (!course) {
      return NextResponse.json({ error: 'Curso não encontrado.' }, { status: 404 });
    }

    const lessonIds = course.lessons.map((l: any) => l.id);

    const completions = await prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: lessonIds } },
      select: { lessonId: true, createdAt: true },
    });

    if (completions.length < lessonIds.length) {
      return NextResponse.json({
        error: `Curso não concluído. ${completions.length}/${lessonIds.length} aulas completas.`,
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, customLogoUrl: true },
    });

    if (!user || !tenant) {
      return NextResponse.json({ error: 'Dados não encontrados.' }, { status: 404 });
    }

    const lastCompletion = completions.reduce((latest, c) =>
      c.createdAt > latest.createdAt ? c : latest,
    );
    const completionDate = lastCompletion.createdAt.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Border
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 269, 182);

    // Header
    doc.setFontSize(14);
    doc.setTextColor(107, 114, 128);
    doc.text(tenant.name.toUpperCase(), 148.5, 35, { align: 'center' });

    // Title
    doc.setFontSize(36);
    doc.setTextColor(16, 185, 129);
    doc.text('CERTIFICADO', 148.5, 60, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(107, 114, 128);
    doc.text('DE CONCLUSÃO', 148.5, 70, { align: 'center' });

    // Divider
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(80, 78, 217, 78);

    // Body
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text('Certificamos que', 148.5, 92, { align: 'center' });

    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    doc.text(user.name, 148.5, 106, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99);
    doc.text('concluiu com sucesso o curso', 148.5, 118, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text(course.title, 148.5, 132, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text(`${lessonIds.length} aulas completadas`, 148.5, 142, { align: 'center' });

    // Date
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`Concluído em ${completionDate}`, 148.5, 158, { align: 'center' });

    // Footer
    doc.setDrawColor(16, 185, 129);
    doc.line(60, 172, 140, 172);
    doc.line(157, 172, 237, 172);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(tenant.name, 100, 180, { align: 'center' });
    doc.text('Pontufy Platform', 197, 180, { align: 'center' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    await prisma.issuedCertificate.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { issuedAt: new Date(), courseName: course.title },
      create: { userId, tenantId, courseId, courseName: course.title },
    });

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificado-${course.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('POST /api/certificates/generate:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar certificado.' }, { status: 500 });
  }
}
