import { NextResponse, NextRequest } from 'next/server';
import { statisticsService } from '@/lib/services/statistics-service';
import { requireAuth } from '@/lib/services/auth/auth'; // Pour obtenir l'ID utilisateur
import { logger } from '@/lib/utils/logging'; // Assurez-vous d'avoir un logger disponible

export async function GET(_request: NextRequest) { // Correction: _request au lieu de request
  try {
    const userSession = await requireAuth(); // Vérifie l'authentification et obtient la session utilisateur

    if (!userSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = userSession.id; // Ou userSession.username, selon ce que getDashboardData attend

    const dashboardData = await statisticsService.getDashboardData(userId);

    return NextResponse.json(dashboardData);
  } catch (error) {
    logger.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}