import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { createProductSchema } from "@/lib/schemas/product";
import { CreateProductParams } from "@/lib/services/product-service";

export async function GET(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const productService = serviceContainer.getProductService();
    const result = await productService.getUserProducts(user.id, { page, limit });

    return createSuccessResponse(result);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

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
