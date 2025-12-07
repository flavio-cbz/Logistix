import { NextRequest, NextResponse } from "next/server";
import { getService } from "@/lib/services/container";
import { MarketAnalysisService } from "@/lib/market/services/market-analysis-service";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query) {
            return NextResponse.json(
                { error: "Query parameter 'q' is required" },
                { status: 400 }
            );
        }

        const marketService = getService<MarketAnalysisService>("MarketAnalysisService");

        const results = await marketService.analyzeMarket({
            query: query,
            limit: 20,
            sortBy: 'relevance'
        });

        return NextResponse.json({
            count: results.length,
            results
        });
    } catch (error) {
        console.error("Market analysis failed:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
