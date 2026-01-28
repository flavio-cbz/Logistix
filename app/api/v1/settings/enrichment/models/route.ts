import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { ProductEnrichmentService } from "@/lib/services/product-enrichment-service";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use IntegrationService to get credentials (proper architecture)
        const integrationService = serviceContainer.getIntegrationService();
        const credentials = await integrationService.getCredentials(user.id, "gemini");

        let apiKey = "";

        if (credentials && typeof credentials === "object" && "apiKey" in credentials) {
            apiKey = (credentials as { apiKey: string }).apiKey;
        }

        // Allow overriding or providing key via header for testing/setup before save
        const headerKey = req.headers.get("x-gemini-api-key");
        if (headerKey && !headerKey.includes("...")) {
            apiKey = headerKey;
        }

        if (!apiKey) {
            return NextResponse.json({ models: [] });
        }

        const service = new ProductEnrichmentService(apiKey);
        const models = await service.listModels();

        return NextResponse.json({ models });

    } catch (error) {
        const safeError: unknown = error;
        logger.error("Error listing models", { error: String(safeError) });
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
