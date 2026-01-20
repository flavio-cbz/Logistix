import { NextRequest } from "next/server";
import { orderToProductService } from "@/lib/services/order-to-product.service";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();
        const { orderId, all, options } = body;

        // Get user preferences for matching options
        const userService = serviceContainer.getUserService();
        const userSettings = await userService.getSettings(user.id);
        // The getSettings returns structured preferences object directly as part of response
        const userOptions = (userSettings.preferences as any)?.orderMatching || {};

        const matchingOptions = {
            autoEnrich: options?.autoEnrich ?? userOptions.autoCreateProducts ?? false,
            defaultParcelId: options?.defaultParcelId ?? userOptions.defaultParcelId,
            skipExisting: options?.skipExisting ?? true,
        };

        if (all) {
            // Convert all unprocessed orders
            const results = await orderToProductService.createProductsFromAllOrders(
                user.id,
                matchingOptions
            );
            return createSuccessResponse(results);
        } else if (orderId) {
            // Convert a specific order
            const result = await orderToProductService.createProductsFromOrder(
                user.id,
                orderId,
                matchingOptions
            );
            return createSuccessResponse(result);
        } else {
            return createErrorResponse(new Error("orderId or all=true required"));
        }
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}

export async function GET(_request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        // Get unmatched orders
        const unmatchedOrders = await orderToProductService.getUnmatchedOrders(user.id);

        return createSuccessResponse({
            unmatchedOrders,
            totalUnmatched: unmatchedOrders.filter(o => o.totalItems > o.matchedItems).length,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
