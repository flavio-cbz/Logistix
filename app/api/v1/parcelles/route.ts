import { NextRequest } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(_request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const parcelleService = serviceContainer.getParcelleService();
    const parcelles = await parcelleService.getAllParcelles(user.id);

    return createSuccessResponse(parcelles);
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
