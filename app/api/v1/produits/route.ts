import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { createProductSchema } from "@/lib/schemas/product";
import { CreateProductParams } from "@/lib/services/product-service";

/**
 * GET /api/v1/produits
 *
 * @deprecated Use /api/v1/products instead. This French endpoint will be removed in a future version.
 */
export async function GET(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    // Filtrage
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const enrichmentStatus = searchParams.get("enrichmentStatus") || undefined;
    const parcelId = searchParams.get("parcelId") || undefined;
    const brand = searchParams.get("brand") || undefined;
    const category = searchParams.get("category") || undefined;

    const productService = serviceContainer.getProductService();
    const result = await productService.getUserProducts(user.id, {
      page,
      limit,
      search,
      status,
      enrichmentStatus,
      parcelId,
      brand,
      category
    });

    return createSuccessResponse(result);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

/**
 * POST /api/v1/produits
 *
 * @deprecated Use /api/v1/products instead. This French endpoint will be removed in a future version.
 */
export async function POST(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const json = await request.json();

    // Validate with shared schema - field names now match database directly
    const validatedData = createProductSchema.parse(json);

    // No manual mapping needed - schema fields match database columns
    const productService = serviceContainer.getProductService();
    const product = await productService.createProduct(user.id, validatedData as CreateProductParams);

    return createSuccessResponse(product);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
