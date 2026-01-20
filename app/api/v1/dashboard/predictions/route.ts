import { NextRequest } from "next/server";
import { predictionService } from "@/lib/services/prediction.service";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(_request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        // Fetch all prediction data in parallel
        const [
            summary,
            slowMovingProducts,
            categoryVelocity,
            brandVelocity,
            allPredictions,
        ] = await Promise.all([
            predictionService.getSlowMovingSummary(user.id),
            predictionService.getSlowMovingProducts(user.id),
            predictionService.getCategoryVelocity(user.id),
            predictionService.getBrandVelocity(user.id),
            predictionService.getAllPredictions(user.id),
        ]);

        // Filter to only at-risk products for the main view
        const atRiskProducts = allPredictions.filter(
            (p) => p.riskLevel !== "low"
        );

        return createSuccessResponse({
            summary,
            slowMovingProducts,
            categoryVelocity,
            brandVelocity,
            atRiskProducts,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
