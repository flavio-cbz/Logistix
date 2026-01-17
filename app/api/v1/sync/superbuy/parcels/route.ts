/**
 * API Endpoint: Synchronisation Superbuy → LogistiX (Parcelles)
 * 
 * POST /api/v1/sync/superbuy/parcels
 * 
 * Deux modes de synchronisation:
 * 
 * 1. MODE DIRECT (recommandé):
 *    POST avec body JSON contenant les parcelles
 *    ```json
 *    {
 *      "parcels": [
 *        {
 *          "parcelId": "PN25781061847",
 *          "trackingNumber": "CJ140286057DE",
 *          "carrier": "云腾",
 *          "status": "Received",
 *          "weight": 3528,
 *          "shippingFee": 33.78,
 *          ...
 *        }
 *      ],
 *      "options": {
 *        "skipExisting": true,
 *        "forceUpdate": false
 *      }
 *    }
 *    ```
 * 
 * 2. MODE FICHIER (legacy):
 *    POST sans body ou avec body vide
 *    Charge automatiquement depuis extracted_data/parcels_*.json
 * 
 * Query parameters:
 *    - mode: 'file' | 'direct' (auto-détect si non fourni)
 *    - skipExisting: true | false (default: true)
 *    - forceUpdate: true | false (default: false)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { serviceContainer } from "@/lib/services/container";
// import { DatabaseService } from "@/lib/database";
import { z } from "zod";
import { logger } from "@/lib/utils/logging/logger";
import { SuperbuyPackageStatus } from "@/lib/services/superbuy/constants";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const syncRequestSchema = z.object({
  parcels: z.array(z.unknown()), // SuperbuyParcel[] - validé par le mapper
  options: z
    .object({
      skipExisting: z.boolean().optional().default(true),
      forceUpdate: z.boolean().optional().default(false),
    })
    .optional()
    .default({ skipExisting: true, forceUpdate: false }),
});

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

/**
 * POST /api/v1/sync/superbuy/parcels
 * Synchronize Superbuy parcels with LogistiX
 * 
 * Supports both direct data (in body) and file-based (from extracted_data/)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentification requise
    const { user } = await requireAuth(req);

    // 2. Parse query parameters
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "auto"; // 'file', 'direct', or 'auto'
    const skipExistingParam = url.searchParams.get("skipExisting");
    const forceUpdateParam = url.searchParams.get("forceUpdate");

    // 3. Parse body
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // 4. Determine source and load parcels
    let parcels = body.parcels;
    let dataSource = "direct";

    // Mode AUTO: detect based on whether parcels are provided
    if (mode === "auto" || mode === "file") {
      if (!parcels || parcels.length === 0) {
        // Load from file
        parcels = await loadLatestExtractedData();
        dataSource = "file";

        if (parcels.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: "Aucune donnée Superbuy trouvée. Fournissez les parcelles en JSON ou utilisez 'npm run superbuy:extract' pour charger depuis un fichier.",
            },
            { status: 400 }
          );
        }
      } else {
        // Parcels provided in body, but mode is file - normalize them
        parcels = parcels.map(normalizeExtractedData);
        dataSource = "direct";
      }
    } else if (mode === "direct") {
      // Mode DIRECT requires parcels in body
      if (!parcels || parcels.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Mode 'direct' nécessite les parcelles dans le body sous la clé 'parcels'.",
            example: {
              parcels: [
                {
                  parcelId: "PN25781061847",
                  trackingNumber: "CJ140286057DE",
                  carrier: "云腾",
                  status: "Received",
                  weight: 3528,
                  shippingFee: 33.78,
                }
              ]
            }
          },
          { status: 400 }
        );
      }
      // Normalize the provided parcels
      parcels = parcels.map(normalizeExtractedData);
      dataSource = "direct";
    }

    // 5. Merge options from query params and body
    const options = { ...(body.options || {}) } as { skipExisting?: boolean; forceUpdate?: boolean };
    if (skipExistingParam !== null) options.skipExisting = skipExistingParam === "true";
    if (forceUpdateParam !== null) options.forceUpdate = forceUpdateParam === "true";

    // Set defaults
    if (options.skipExisting === undefined) options.skipExisting = true;
    if (options.forceUpdate === undefined) options.forceUpdate = false;

    // 6. Valide les données
    const validated = syncRequestSchema.parse({ parcels, options });

    // 4. Initialise les services
    // const databaseService = DatabaseService.getInstance(); // Removed
    // const parcelleService = serviceContainer.getParcelleService(); // Removed

    const syncService = serviceContainer.getSuperbuySyncService();
    // 5. Lance la synchronisation
    const summary = await syncService.syncParcels(
      user.id,
      validated.parcels,
      validated.options
    );

    // Log detailed errors for debugging
    if (summary.failed > 0 && summary.results) {
      const failures = summary.results.filter((r: { success: boolean }) => !r.success);
      logger.error("[Superbuy Sync API] Failures:", { failures });
    }

    // 6. Retourne le résumé
    return NextResponse.json(
      {
        success: true,
        message: `Synchronisation terminée : ${summary.created} créées, ${summary.updated} mises à jour, ${summary.skipped} ignorées, ${summary.failed} échouées`,
        created: summary.created,
        updated: summary.updated,
        skipped: summary.skipped,
        failed: summary.failed,
        dataSource, // 'file' or 'direct'
        mode, // The mode used for this sync
        totalProcessed: summary.totalProcessed,
        details: summary.failed > 0 ? summary.results?.filter((r: { success: boolean }) => !r.success) : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Superbuy Sync API] Error:", { error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/sync/superbuy/parcels
 * Get synchronization history for current user
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authentification requise
    const { user } = await requireAuth(req);

    // 2. Initialise les services
    // 2. Obtient le service depuis le conteneur
    const syncService = serviceContainer.getSuperbuySyncService();

    // 3. Récupère l'historique de sync
    const history = await syncService.getSyncHistory(user.id);

    return NextResponse.json(
      {
        success: true,
        data: history,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Superbuy Sync API] Error:", { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/sync/superbuy/parcels
 * Delete a sync record (rollback)
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Authentification requise
    const { user } = await requireAuth(req);

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const superbuyId = searchParams.get("superbuyId");

    if (!superbuyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing superbuyId parameter",
        },
        { status: 400 }
      );
    }

    // 3. Initialise les services
    // 3. Obtient le service depuis le conteneur
    const syncService = serviceContainer.getSuperbuySyncService();

    // 4. Supprime le record de sync
    await syncService.deleteSyncRecordWithUser(user.id, superbuyId, "parcel");

    return NextResponse.json(
      {
        success: true,
        message: "Sync record deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("[Superbuy Sync API] Error:", { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalise les données extraites de Superbuy pour correspondre au type SuperbuyParcel
 */
function normalizeExtractedData(rawData: Record<string, unknown>): Record<string, unknown> {
  const parcelId = (rawData['parcelId'] || rawData['orderNo']) as string;
  const status = (rawData['status'] as string) || '';

  return {
    // Map champs extraits → SuperbuyParcel
    packageOrderNo: parcelId,
    packageId: rawData['packageId'] || parseInt(parcelId?.replace(/[^0-9]/g, '') || '0'),
    trackingNumber: rawData['trackingNumber'],
    carrier: rawData['carrier'], // Sera normalisé par deriveCarrier
    orderStatus: status ? (status.toLowerCase() === 'shipped' ? SuperbuyPackageStatus.SHIPPED : status.toLowerCase() === 'received' ? SuperbuyPackageStatus.RECEIVED : SuperbuyPackageStatus.PENDING) : SuperbuyPackageStatus.PENDING,
    status: status,
    packageRealWeight: rawData['weight'] || rawData['packageRealWeight'],
    packageWeight: rawData['packageWeight'],
    weight: rawData['weight'],
    packageTotalAmount: rawData['shippingFee'],
    shippingFee: rawData['shippingFee'],
    createdTime: rawData['createdAt'] ? new Date(rawData['createdAt'] as string).getTime() / 1000 : 0,
    deliveryTime: (rawData['deliveryTime'] || rawData['updatedAt']) ? new Date((rawData['deliveryTime'] || rawData['updatedAt']) as string).getTime() / 1000 : 0,
    destination: rawData['destination'],
    expressUrl: rawData['expressUrl'],
    warehouseName: rawData['warehouseName'],
    goodsName: rawData['goodsName'],
    goodsLink: rawData['goodsLink'],
    images: rawData['images'],
    remark: rawData['remark'],
    orderNo: rawData['orderNo'],
    deliveryCompanyName: rawData['carrier'],
    packageItems: ((rawData['items'] || []) as Array<{
      itemId: string;
      barcode: string;
      name: string;
      goodsLink: string;
      quantity: number;
      unitPrice: number;
      weight: number;
      status: string;
    }>).map((item) => ({
      itemId: item.itemId,
      itemBarcode: item.barcode,
      goodsName: item.name,
      goodsLink: item.goodsLink,
      count: item.quantity,
      unitPrice: item.unitPrice,
      weight: item.weight,
      itemStatus: item.status === 'Shipped' ? SuperbuyPackageStatus.SHIPPED : SuperbuyPackageStatus.PENDING,
    })),
    rawPackageInfo: rawData, // Garder les données brutes pour fallback
  };
}

/**
 * Charge les données extraites les plus récentes depuis extracted_data/
 */
async function loadLatestExtractedData(): Promise<unknown[]> {
  const fs = await import('fs');
  const path = await import('path');

  const extractedDataDir = path.resolve(process.cwd(), 'extracted_data');

  if (!fs.existsSync(extractedDataDir)) {
    logger.warn('Extracted data directory not found');
    return [];
  }

  // Lister tous les fichiers parcels_*.json
  const files = fs.readdirSync(extractedDataDir)
    .filter(f => f.startsWith('parcels_') && f.endsWith('.json'))
    .sort()
    .reverse(); // Plus récent en premier

  if (files.length === 0) {
    logger.warn('No parcel files found in extracted_data');
    return [];
  }

  // Charger le plus récent
  const latestFile = files[0];

  if (!latestFile) {
    logger.warn('No latest file found');
    return [];
  }

  const filePath = path.join(extractedDataDir, latestFile);

  logger.info(`Loading data from ${latestFile}`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Normaliser les données extraites
  return (Array.isArray(data) ? data : []).map(normalizeExtractedData);
}
