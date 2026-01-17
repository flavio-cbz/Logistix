import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { z } from "zod";

import { CreateProductParams } from "@/lib/services/product-service";

const createProductSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  price: z.number().min(0, "Le prix doit être positif"),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  poids: z.number().optional(),
  // Add other fields as needed
});

export async function GET(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const productService = serviceContainer.getProductService();
    // If page or limit are provided, this returns paginated object, otherwise array
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
    const validatedData = createProductSchema.parse(json);

    const productService = serviceContainer.getProductService();
    const product = await productService.createProduct(user.id, validatedData as CreateProductParams);

    return createSuccessResponse(product);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
