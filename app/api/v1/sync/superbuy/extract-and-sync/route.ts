/**
 * Simplified Extract and Sync Endpoint
 * POST /api/v1/sync/superbuy/extract-and-sync
 *
 * This is a refactored version that delegates to services.
 * Complete flow:
 * 1. Extract data from Superbuy via SuperbuyExtractionService
 * 2. Sync to database via SuperbuySyncService
 * 3. Return results with progress steps
 */

import { NextRequest } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { createErrorResponse } from '@/lib/utils/api-response';

// Import the old implementation for now
// TODO: Move Puppeteer logic to extraction-service.ts
import { POST as legacyPOST } from './legacy-route';

export async function POST(req: NextRequest) {
  try {
    // Get auth
    const authService = serviceContainer.getAuthService();
    await authService.requireAuth();

    // For now, delegate to the legacy implementation
    // TODO: Once SuperbuyExtractionService.runSuperbuyExtractionDirect is implemented,
    // uncomment the code in the file comments and remove the legacy delegation

    return legacyPOST(req);

  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

/*
 * FUTURE CLEAN IMPLEMENTATION:
 *
 * Once the Puppeteer extraction logic is moved to SuperbuyExtractionService,
 * replace the legacyPOST call above with this implementation:
 *
 * const searchParams = new URL(req.url).searchParams;
 * const skipExisting = searchParams.get('skipExisting') !== 'false';
 * const forceUpdate = searchParams.get('forceUpdate') === 'true';
 *
 * const steps: ExtractionStep[] = [];
 *
 * // Step 1: Extract parcels from Superbuy
 * const extractionService = new SuperbuyExtractionService();
 * const extractionResult = await extractionService.extractParcels(user.id);
 *
 * steps.push(...extractionResult.steps);
 *
 * if (!extractionResult.success) {
 *   if (extractionResult.needsAuth) {
 *     return NextResponse.json({
 *       success: false,
 *       message: extractionResult.error || 'Session Superbuy invalide',
 *       needsAuth: true,
 *       authUrl: '/api/v1/superbuy/auth/init',
 *       steps,
 *     }, { status: 401 });
 *   }
 *   return createErrorResponse(new Error(extractionResult.error || 'Extraction failed'), { steps });
 * }
 *
 * // Step 2: Convert to Superbuy format
 * const superbuyLikeParcels = extractionService.convertToSuperbuyFormat(extractionResult.parcels);
 *
 * // Step 3: Sync to database
 * const syncService = serviceContainer.getSuperbuySyncService();
 * const summary = await syncService.syncParcels(user.id, superbuyLikeParcels, {
 *   skipExisting,
 *   forceUpdate,
 * });
 *
 * return createSuccessResponse({
 *   message: `Sync complete: ${summary.created} created, ${summary.updated} updated`,
 *   ...summary,
 *   steps,
 *   dataSource: 'direct-extraction',
 * });
 */
