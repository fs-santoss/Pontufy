import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantPrisma } from '@/backend/db';

/**
 * Função utilitária para higienizar e prevenir Injeção de CSV (CSV Injection/DDE).
 * Remove '=' '+' '-' '@' no início dos campos textuais.
 */
function sanitizeCsvField(field: string | number): string {
  const strField = String(field);
  if (/^[=+\-@]/.test(strField)) {
    return `'${strField}`; // Adiciona apóstrofo para transformar em string segura no Excel
  }
  // Escapa aspas duplas dobrando-as
  return `"${strField.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const { tenantId, role } = await getSessionContext();

    if (role !== 'admin_rh') {
      return NextResponse.json({ error: 'Acesso Restrito: Apenas Gestores de RH.' }, { status: 403 });
    }

    const db = getTenantPrisma(tenantId);

    // Buscar "Perdas" (Resgates) no ledger deste mês
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const redemptions = await db.pointsLedger.findMany({
      where: {
        type: 'loss',
        timestamp: {
          gte: startOfMonth
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Construção segura do CSV
    let csvContent = 'Data,Funcionario,Email,Descricao_Beneficio,Pontos_Deduzidos\n';

    for (const record of redemptions) {
      const date = sanitizeCsvField(record.timestamp.toISOString());
      const name = sanitizeCsvField(record.user.name);
      const email = sanitizeCsvField(record.user.email);
      const description = sanitizeCsvField(record.description);
      const points = sanitizeCsvField(record.pointsAmount);

      csvContent += `${date},${name},${email},${description},${points}\n`;
    }

    // Configura headers para forçar download do CSV
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="folha_beneficios_${tenantId}.csv"`);

    return new NextResponse(csvContent, { status: 200, headers });

  } catch (error: any) {
    if (error.message === 'Não autenticado.') {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    console.error('[PAYROLL EXPORT] Erro na geração da folha:', error);
    return NextResponse.json({ error: 'Falha interna ao gerar arquivo da folha.' }, { status: 500 });
  }
}
