/**
 * API Endpoint: Test de l'intégration Superbuy
 * 
 * GET /api/v1/sync/superbuy/test-sync
 * 
 * Vérifie que tous les composants de l'intégration Superbuy sont fonctionnels
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { SuperbuySyncService } from "@/lib/integrations/superbuy";
import { serviceContainer } from "@/lib/services/container";
import { DatabaseService } from "@/lib/database";

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * GET /api/v1/sync/superbuy/test-sync
 * Test de l'infrastructure de synchronisation Superbuy
 */
export async function GET(req: NextRequest) {
  const tests: Array<{ name: string; status: 'success' | 'error'; details?: string }> = [];
  
  try {
    // Test 1: Authentification
    tests.push({ name: "Authentification", status: "success", details: "En cours..." });
    const { user } = await requireAuth(req);
    tests[tests.length - 1] = {
      name: "Authentification",
      status: "success",
      details: `Utilisateur: ${user.email}`
    };

    // Test 2: Initialisation DatabaseService
    tests.push({ name: "DatabaseService", status: "success", details: "En cours..." });
    const databaseService = DatabaseService.getInstance();
    tests[tests.length - 1] = {
      name: "DatabaseService",
      status: "success",
      details: "Instance créée avec succès"
    };

    // Test 3: Initialisation ParcelleService
    tests.push({ name: "ParcelleService", status: "success", details: "En cours..." });
    const parcelleService = serviceContainer.getParcelleService();
    tests[tests.length - 1] = {
      name: "ParcelleService",
      status: "success",
      details: "Service récupéré du container"
    };

    // Test 4: Initialisation SuperbuySyncService
    tests.push({ name: "SuperbuySyncService", status: "success", details: "En cours..." });
    const syncService = new SuperbuySyncService(
      parcelleService,
      databaseService,
      user.id
    );
    tests[tests.length - 1] = {
      name: "SuperbuySyncService",
      status: "success",
      details: "Service de synchronisation créé"
    };

    // Test 5: Vérifier l'accès à la table superbuy_sync
    tests.push({ name: "Table superbuy_sync", status: "success", details: "En cours..." });
    try {
      const history = await syncService.getSyncHistory();
      tests[tests.length - 1] = {
        name: "Table superbuy_sync",
        status: "success",
        details: `${history.length} enregistrements trouvés`
      };
    } catch (error) {
      tests[tests.length - 1] = {
        name: "Table superbuy_sync",
        status: "error",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      };
    }

    // Test 6: Test du mapper (avec des données fictives)
    tests.push({ name: "Mapper Superbuy→LogistiX", status: "success", details: "En cours..." });
    try {
      const { SuperbuyMapperService } = await import("@/lib/integrations/superbuy/mapper");
      
      const testParcel = {
        packageOrderNo: "TEST-123",
        warehouseName: "Warehouse A",
        packageWeight: 1500,
        packageRealWeight: 1500,
        packageVolume: 50,
        packageTotalAmount: 28.0,
        packageTotalFreight: 25.5,
        orderStatus: 2,
        packageItems: [],
        expressUrl: "",
        goodsName: "Test Package"
      };

      const mapped = SuperbuyMapperService.mapParcelToLogistix(testParcel as any, user.id);
      
      tests[tests.length - 1] = {
        name: "Mapper Superbuy→LogistiX",
        status: "success",
        details: `Mapping réussi: ${mapped.nom} (${mapped.poids}kg)`
      };
    } catch (error) {
      tests[tests.length - 1] = {
        name: "Mapper Superbuy→LogistiX",
        status: "error",
        details: error instanceof Error ? error.message : "Erreur de mapping"
      };
    }

    // Résumé global
    const successCount = tests.filter(t => t.status === "success").length;
    const errorCount = tests.filter(t => t.status === "error").length;
    const allPassed = errorCount === 0;

    return NextResponse.json(
      {
        success: allPassed,
        message: allPassed 
          ? "✅ Tous les tests sont passés avec succès" 
          : `⚠️ ${errorCount} test(s) échoué(s) sur ${tests.length}`,
        summary: {
          total: tests.length,
          passed: successCount,
          failed: errorCount
        },
        tests,
        timestamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform
        }
      },
      { 
        status: allPassed ? 200 : 500 
      }
    );

  } catch (error) {
    console.error("[Test Sync API] Erreur fatale:", error);

    return NextResponse.json(
      {
        success: false,
        message: "❌ Erreur fatale lors des tests",
        error: error instanceof Error ? error.message : "Erreur inconnue",
        tests,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/sync/superbuy/test-sync
 * Test avec des données Superbuy fournies
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireAuth(req);
    const body = await req.json();

    // Vérifie que les données sont au bon format
    if (!body.parcels || !Array.isArray(body.parcels)) {
      return NextResponse.json(
        {
          success: false,
          error: "Le corps de la requête doit contenir un array 'parcels'"
        },
        { status: 400 }
      );
    }

    // Test de mapping sur les données fournies
    const { SuperbuyMapperService } = await import("@/lib/integrations/superbuy/mapper");
    const mappedResults = body.parcels.map((parcel: any, index: number) => {
      try {
        const mapped = SuperbuyMapperService.mapParcelToLogistix(parcel, user.id);
        return {
          index,
          success: true,
          superbuyId: parcel.packageOrderNo,
          mapped
        };
      } catch (error) {
        return {
          index,
          success: false,
          superbuyId: parcel.packageOrderNo || "UNKNOWN",
          error: error instanceof Error ? error.message : "Erreur de mapping"
        };
      }
    });

    const successCount = mappedResults.filter((r: any) => r.success).length;
    const errorCount = mappedResults.filter((r: any) => !r.success).length;

    return NextResponse.json(
      {
        success: errorCount === 0,
        message: `Mapping testé: ${successCount} réussis, ${errorCount} échoués`,
        summary: {
          total: body.parcels.length,
          mapped: successCount,
          failed: errorCount
        },
        results: mappedResults,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("[Test Sync API POST] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
