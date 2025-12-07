import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse } from "@/lib/utils/api-response";
import { COOKIE_NAME } from "@/lib/constants/config";

export async function POST(request: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const sessionId = request.cookies.get(COOKIE_NAME)?.value;

    if (sessionId) {
      await authService.destroySession(sessionId);
    }

    // Create response with proper structure (not using createSuccessResponse since we need to modify cookies)
    const response = NextResponse.json({
      ok: true,
      success: true,
      data: { message: "Déconnexion réussie" },
      meta: { timestamp: new Date().toISOString() }
    });

    response.cookies.delete(COOKIE_NAME);

    return response;
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
