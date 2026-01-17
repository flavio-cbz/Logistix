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

        for (const productId of productIds) {
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
        }

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
