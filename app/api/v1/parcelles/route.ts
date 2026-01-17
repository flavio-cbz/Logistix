import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;

    const parcelleService = serviceContainer.getParcelleService();
    // Use options only if page or limit is provided
    const options = (page || limit) ? { page, limit } : undefined;

    // cast result because we know it handles pagination now but return type is union
    const result = await parcelleService.getAllParcelles(user.id, options);

    return createSuccessResponse(result);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Force update
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const json = await request.json();

    // Validation is handled by the service, but we can do a pre-check or let the service handle it.
    // The service uses createParcelleSchema internally.

    const parcelleService = serviceContainer.getParcelleService();
    const parcelle = await parcelleService.createParcelle(user.id, json);

    return createSuccessResponse(parcelle);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
