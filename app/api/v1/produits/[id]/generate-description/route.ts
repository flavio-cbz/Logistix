import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse, createNotFoundResponse } from "@/lib/utils/api-response";

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        // Get the product
        const productService = serviceContainer.getProductService();
        const product = await productService.getProduct(params.id, user.id);

        if (!product) {
            return createNotFoundResponse("Produit");
        }

        // Get enrichment service from container
        const enrichmentService = serviceContainer.getProductEnrichmentService();

        // Generate description using AI
        const result = await enrichmentService.generateDescription(
            {
                name: product.name,
                brand: product.brand,
                category: product.category,
                subcategory: product.subcategory,
                size: product.size,
                color: product.color,
                description: product.description,
            },
            product.photoUrl || product.photoUrls?.[0]
        );

        return createSuccessResponse({
            description: result.description,
            hashtags: result.hashtags,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
