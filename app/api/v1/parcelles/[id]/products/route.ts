import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse, createNotFoundResponse } from "@/lib/utils/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    // First verify the parcel exists and belongs to the user
    const parcelService = serviceContainer.getParcelleService();
    const parcel = await parcelService.getParcelleById(params.id);

    if (!parcel || parcel.userId !== user.id) {
      return createNotFoundResponse("Parcelle");
    }

    // Get all products for this parcel
    const productService = serviceContainer.getProductService();
    const products = await productService.getProductsByParcelId(params.id, user.id);

    return createSuccessResponse(products);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}