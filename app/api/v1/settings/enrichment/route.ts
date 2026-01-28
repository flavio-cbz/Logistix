import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";

export async function GET() {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integrationService = serviceContainer.getIntegrationService();
    const config = await integrationService.getCredentials(user.id, "gemini");

    if (!config) {
      return NextResponse.json({ config: { enabled: false } });
    }

    return NextResponse.json({ config });
  } catch (error) {
    logger.error("Error fetching enrichment settings", { error });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.getSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { enabled, apiKey, model } = body;

    const integrationService = serviceContainer.getIntegrationService();
    await integrationService.updateCredentials(user.id, "gemini", {
      enabled,
      apiKey,
      model,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error saving enrichment settings", { error: String(error) });
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

