<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";

interface EnrichmentData {
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
}

/**
 * POST /api/v1/produits/enrichment-status
 * Check enrichment status for multiple products (used by polling)
 */
export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();
        const { productIds } = body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: "productIds requis" },
                { status: 400 }
            );
        }

        const productService = serviceContainer.getProductService();

        // Get all products to check their status
        const completedIds: string[] = [];
        const stillPendingIds: string[] = [];

        // Process in parallel for better performance
        await Promise.all(
            productIds.map(async (productId: string) => {
                try {
                    const product = await productService.getProduct(productId, user.id);
                    if (product) {
                        const enrichmentData = product.enrichmentData as EnrichmentData | null;
                        const status = enrichmentData?.enrichmentStatus;

                        if (status === 'done' || status === 'failed') {
                            completedIds.push(productId);
                        } else if (status === 'pending') {
                            stillPendingIds.push(productId);
                        }
                    }
                } catch (error) {
                    logger.error(`Error checking status for product ${productId}`, { error });
                    // Continue with other products
                }
            })
        );

        return NextResponse.json({
            completedIds,
            stillPendingIds,
            total: productIds.length,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur interne" },
            { status: 500 }
        );
    }
}
=======
import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";

interface EnrichmentData {
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
}

/**
 * POST /api/v1/produits/enrichment-status
 * Check enrichment status for multiple products (used by polling)
 */
export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();
        const { productIds } = body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: "productIds requis" },
                { status: 400 }
            );
        }

        const productService = serviceContainer.getProductService();

        // Get all products to check their status
        const completedIds: string[] = [];
        const stillPendingIds: string[] = [];

        // Process in parallel for better performance
        await Promise.all(
            productIds.map(async (productId: string) => {
                try {
                    const product = await productService.getProduct(productId, user.id);
                    if (product) {
                        const enrichmentData = product.enrichmentData as EnrichmentData | null;
                        const status = enrichmentData?.enrichmentStatus;

                        if (status === 'done' || status === 'failed') {
                            completedIds.push(productId);
                        } else if (status === 'pending') {
                            stillPendingIds.push(productId);
                        }
                    }
                } catch (error) {
                    console.error(`Error checking status for product ${productId}:`, error);
                    // Continue with other products
                }
            })
        );

        return NextResponse.json({
            completedIds,
            stillPendingIds,
            total: productIds.length,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur interne" },
            { status: 500 }
        );
    }
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
