import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { getLogger } from "@/lib/utils/logging/logger";
import * as z from "zod";

const logger = getLogger("API:Market:Analyze");

const analyzeSchema = z.object({
    productId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId } = analyzeSchema.parse(body);

        logger.info("Triggering market analysis", { productId });

        const marketService = serviceContainer.getMarketAnalysisService();
        // This is an async operation that might take time (fetching Vinted)
        // For good UX, we should ideally treat it as a job or just await it if < 5s.
        // Vinted fetch is fast enough to await for MVP.
        const updatedProduct = await marketService.analyzeProduct(productId);

        if (!updatedProduct) {
            return NextResponse.json(
                { error: "Product not found or analysis failed" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedProduct
        });

    } catch (error) {
        logger.error("Market analysis failed", { error });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
