import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { prisma } from '@/backend/db';

export async function GET() {
  try {
    const { tenantId } = await getSessionContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, customLogoUrl: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { customLogoUrl } = await request.json();

    if (customLogoUrl !== null && typeof customLogoUrl !== 'string') {
      return NextResponse.json({ error: 'URL do logo inválida.' }, { status: 400 });
    }

    if (customLogoUrl && customLogoUrl.length > 500) {
      return NextResponse.json({ error: 'URL do logo muito longa.' }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { customLogoUrl: customLogoUrl || null },
      select: { name: true, customLogoUrl: true },
    });

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('PATCH /api/admin/tenant/branding:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
