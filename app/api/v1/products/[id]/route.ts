import { serviceContainer } from "@/lib/services/container";
import {
  createErrorResponse,
  createSuccessResponse,
  createNotFoundResponse
} from "@/lib/utils/api-response";
import { updateProductSchema } from "@/lib/schemas/product";

/**
 * GET /api/v1/products/[id] - Get a product
 *
 * English alias for /api/v1/produits/[id]
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const productService = serviceContainer.getProductService();
    const product = await productService.getProduct(params.id, user.id);

    if (!product) {
      return createNotFoundResponse("Product");
    }

    return createSuccessResponse({ product });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/v1/products/[id] - Update a product
 *
 * English alias for /api/v1/produits/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const json = await request.json();

    // Validate with shared schema - field names now match database directly
    const validatedData = updateProductSchema.parse(json);

    // Sanitize data for DB: convert nulls to undefined for non-nullable fields
    // Drizzle requires non-nullable fields to be either present (number) or undefined (skip update), not null.
    const sanitizedData = {
      ...validatedData,
      poids: validatedData.poids ?? undefined,
      price: validatedData.price ?? undefined,
      currency: validatedData.currency ?? undefined,
    };

    // No manual mapping needed - schema fields match database columns
    const productService = serviceContainer.getProductService();
    const updatedProduct = await productService.updateProduct(params.id, user.id, sanitizedData);

    if (!updatedProduct) {
      return createNotFoundResponse("Product");
    }

    return createSuccessResponse({ product: updatedProduct });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/v1/products/[id] - Delete a product
 *
 * English alias for /api/v1/produits/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const productService = serviceContainer.getProductService();
    const success = await productService.deleteProduct(params.id, user.id);

    if (!success) {
      return createNotFoundResponse("Product");
    }

    return createSuccessResponse({ message: "Product deleted" });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
