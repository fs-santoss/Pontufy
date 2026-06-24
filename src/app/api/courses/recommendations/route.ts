import { NextResponse } from 'next/server';
import { getSessionContext } from '@/backend/session';
import { getTenantDb } from '@/backend/db';

export async function GET(request: Request) {
  try {
    const { tenantId, userId } = await getSessionContext();

    const db = getTenantDb(tenantId);

    // 1. Identificar quais aulas o usuÃ¡rio jÃ¡ completou
    const userCompletions = await db.lessonCompletion.findMany({
      where: { userId },
      select: { lessonId: true }
    });
    
    const completedLessonIds = userCompletions.map(c => c.lessonId);

    // 2. Buscar cursos ativos no Tenant que possuam aulas que o usuÃ¡rio AINDA NÃƒO completou
    // Ordenar pelos mais recentes (Fallback do algoritmo base)
    const recommendedCourses = await db.course.findMany({
      where: {
        status: 'published',
        lessons: {
          some: {
            id: {
              notIn: completedLessonIds
            }
          }
        }
      },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            pointsAssigned: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5 // Recomendar no mÃ¡ximo 5 cursos
    });

    return NextResponse.json({
      success: true,
      recommendations: recommendedCourses
    });

  } catch (error: any) {
    if (error.message === 'NÃ£o autenticado.') {
      return NextResponse.json({ error: 'NÃ£o autenticado.' }, { status: 401 });
    }
    console.error('[RECOMMENDATIONS] Erro ao buscar cursos recomendados:', error);
    
    // Casos de Borda: Retorno suave (empty array) em vez de quebrar a UI
    return NextResponse.json({ success: true, recommendations: [] });
  }
}
