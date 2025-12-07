import { serviceContainer } from "@/lib/services/container";
import {
  createErrorResponse,
  createSuccessResponse,
  createNotFoundResponse
} from "@/lib/utils/api-response";

// GET /api/v1/produits/[id] - Récupérer un produit
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
      return createNotFoundResponse("Produit");
    }

    return createSuccessResponse({ product });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

// PUT /api/v1/produits/[id] - Mettre à jour un produit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const json = await request.json();
    const productService = serviceContainer.getProductService();

    // Note: ProductService handles ownership check internally
    const updatedProduct = await productService.updateProduct(params.id, user.id, json);

    if (!updatedProduct) {
      return createNotFoundResponse("Produit");
    }

    return createSuccessResponse({ product: updatedProduct });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

// DELETE /api/v1/produits/[id] - Supprimer un produit
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
      return createNotFoundResponse("Produit");
    }

    return createSuccessResponse({ message: "Produit supprimé" });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
