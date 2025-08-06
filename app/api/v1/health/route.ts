import { NextRequest, NextResponse } from "next/server"
import { vintedSessionManager } from "@/lib/services/auth/vinted-session-manager"
import { createNonDatabaseHandler } from "@/lib/utils/api-route-optimization"
import { checkDatabaseStatus } from "@/lib/middlewares/database-initialization"
import { databaseService } from "@/lib/services/database/db"

async function healthHandler(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Vérifier le statut de la base de données sans forcer l'initialisation
    const dbStatus = await checkDatabaseStatus();
    
    // Vérifier la connectivité de la base de données
    let dbConnectivity = {
      isConnected: false,
      responseTime: 0,
      error: null as string | null
    };

    try {
      const connectivityStartTime = Date.now();
      const isHealthy = await databaseService.healthCheck();
      dbConnectivity = {
        isConnected: isHealthy,
        responseTime: Date.now() - connectivityStartTime,
        error: null
      };
    } catch (error) {
      dbConnectivity = {
        isConnected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }

    // Obtenir les statistiques du pool de connexions
    let poolStatus = null;
    try {
      poolStatus = databaseService.getPoolStatus();
    } catch (error) {
      // Pool status non disponible si la base de données n'est pas initialisée
    }
    
    // Vérifier le token Vinted
    let vintedTokenStatus = {
      isConfigured: false,
      canRefresh: false,
      error: null as string | null
    };

    try {
      // On tente de récupérer la session pour l'utilisateur admin pour valider le process
      const adminUser = await databaseService.queryOne<{ id: string }>(
        `SELECT id FROM users WHERE username = ?`,
        ['admin'],
        'healthCheck-getAdmin'
      );

      if (adminUser) {
        vintedTokenStatus.isConfigured = true;
        await vintedSessionManager.getSessionCookie(adminUser.id);
        vintedTokenStatus.canRefresh = true;
      } else {
        vintedTokenStatus.error = "L'utilisateur admin n'a pas été trouvé pour le test de la session Vinted.";
      }
    } catch (error) {
      vintedTokenStatus.error = error instanceof Error ? error.message : 'Vinted session check failed';
    }

    // Déterminer le statut global
    const isHealthy = dbConnectivity.isConnected; // Le statut de Vinted est informatif, pas bloquant pour le health check
    const responseTime = Date.now() - startTime;

    const response = {
      status: isHealthy ? "ok" : "degraded",
      responseTime,
      database: {
        initialized: dbStatus.isInitialized,
        context: dbStatus.context,
        state: dbStatus.initializationState,
        connectivity: dbConnectivity,
        pool: poolStatus
      },
      vinted: vintedTokenStatus,
      timestamp: new Date().toISOString(),
    };

    // Retourner un statut HTTP approprié
    if (!isHealthy) {
      return NextResponse.json(response, { status: 503 });
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        status: "error",
        error: "HEALTH_CHECK_FAILED",
        message: error instanceof Error ? error.message : "Health check failed",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Utiliser le handler optimisé pour les routes sans base de données
export const GET = createNonDatabaseHandler(healthHandler);
