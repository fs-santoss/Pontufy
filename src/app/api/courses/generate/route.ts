import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';
import { Client } from '@upstash/qstash';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'mock_token_for_dev',
});

export async function POST(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();
    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso Negado: Apenas Gestores de RH.' }, { status: 403 });
    }

    const { prompt, vertical } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: 'O campo prompt é obrigatório.' }, { status: 400 });
    }

    const db = getTenantDb(tenantId);
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.aiCredits < 1) {
      return NextResponse.json({ error: 'Créditos de IA insuficientes.' }, { status: 402 });
    }

    // Publish to QStash to process the generation asynchronously
    await qstashClient.publishJSON({
      url: `https://${request.headers.get('host')}/api/webhooks/generate-course`,
      body: {
        tenantId,
        vertical: vertical || 'tech',
        prompt,
      },
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`,
      }
    });

    // Return 202 Accepted immediately to prevent UI hanging
    return NextResponse.json({ 
      success: true, 
      message: 'A geração do curso foi iniciada em segundo plano. Você será notificado quando estiver pronto.' 
    }, { status: 202 });
  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('POST /api/courses/generate:', error);
    return NextResponse.json({ error: 'Falha interna no servidor.' }, { status: 500 });
  }
}

