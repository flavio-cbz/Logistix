import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

/**
 * GET /api/v1/settings/enrichment/products
 * Get recent products for enrichment testing
 */
export async function GET() {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();

        // Fetch recent 20 products with only needed fields
        const recentProducts = await productService.getRecentProducts(user.id, 20);

        // Transform to only return needed fields
        const products = recentProducts.map(p => ({
            id: p.id,
            name: p.name,
            photoUrl: p.photoUrl
        }));

        return createSuccessResponse({ products });

    } catch (error) {
        return createErrorResponse(error);
    }
}
