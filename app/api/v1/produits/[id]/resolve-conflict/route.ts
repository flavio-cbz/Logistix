import { NextRequest } from "next/server";
import { z } from "zod";
import { serviceContainer } from "@/lib/services/container";
import {
    createErrorResponse,
    createSuccessResponse,
    createNotFoundResponse,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

interface EnrichmentData {
    enrichmentStatus?: 'pending' | 'done' | 'failed' | 'conflict';
    candidates?: unknown[];
    confidence?: number;
    source?: string;
    modelUsed?: string;
    resolvedAt?: string;
    resolvedBy?: 'manual' | 'candidate' | 'skipped';
    selectedCandidateId?: string;
}

// Validation schema for conflict resolution
const resolveConflictSchema = z.object({
    candidateId: z.string().optional(),
    name: z.string().optional(),
    brand: z.string().optional(),
    category: z.string().optional(),
    url: z.string().optional(),
    description: z.string().optional(),
    skip: z.boolean().optional(),
});

/**
 * POST /api/v1/produits/[id]/resolve-conflict
 * Resolves an enrichment conflict by applying the selected candidate or manual input
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();
        const validated = resolveConflictSchema.parse(body);

        const productService = serviceContainer.getProductService();
        const product = await productService.getProduct(params.id, user.id);

        if (!product) {
            return createNotFoundResponse("Produit");
        }

        // Check if the product has a conflict status
        const enrichmentData = product.enrichmentData as EnrichmentData | null;

        if (enrichmentData?.enrichmentStatus !== 'conflict' && enrichmentData?.enrichmentStatus !== 'failed') {
            logger.warn("[ResolveConflict] Product is not in conflict state", {
                productId: params.id,
                status: enrichmentData?.enrichmentStatus,
            });
        }

        // If skip is true, just mark as done without changes
        if (validated.skip) {
            const updatedProduct = await productService.updateProduct(params.id, user.id, {
                enrichmentData: {
                    ...enrichmentData,
                    candidates: enrichmentData?.candidates,
                    enrichmentStatus: 'done' as const,
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: 'skipped' as const,
                } as EnrichmentData,
            });

            logger.info("[ResolveConflict] Conflict skipped", { productId: params.id });
            return createSuccessResponse({ product: updatedProduct });
        }

        // Apply the selected candidate or manual input
        if (!validated.name) {
            return createErrorResponse(new Error("Le nom du produit est requis"));
        }

        const resolvedBy: 'manual' | 'candidate' = validated.candidateId === 'manual' ? 'manual' : 'candidate';

        const updateData = {
            name: validated.name,
            brand: validated.brand || undefined,
            category: validated.category || undefined,
            url: validated.url || undefined,
            description: validated.description || undefined,
            enrichmentData: {
                ...enrichmentData,
                enrichmentStatus: 'done' as const,
                resolvedAt: new Date().toISOString(),
                resolvedBy,
                selectedCandidateId: validated.candidateId,
                // Keep original candidates for audit trail
                candidates: enrichmentData?.candidates,
            },
        };

        const updatedProduct = await productService.updateProduct(params.id, user.id, updateData);

        logger.info("[ResolveConflict] Conflict resolved", {
            productId: params.id,
            method: validated.candidateId === 'manual' ? 'manual' : 'candidate',
            newName: validated.name,
        });

        return createSuccessResponse({ product: updatedProduct });
    } catch (error: unknown) {
        logger.error("[ResolveConflict] Error resolving conflict", { error });
        return createErrorResponse(error);
    }
}
