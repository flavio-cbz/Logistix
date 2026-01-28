<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { shippingHistoryService } from "@/lib/services/shipping-history.service";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const { searchParams } = new URL(request.url);
        const carrier = searchParams.get("carrier") || undefined;
        const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 90;

        // Fetch all history data in parallel
        const [history, stats, evolution, carriers] = await Promise.all([
            shippingHistoryService.getHistory(user.id, { carrier, limit: 50 }),
            shippingHistoryService.getCarrierStats(user.id),
            shippingHistoryService.getPriceEvolution(user.id, { carrier, days }),
            shippingHistoryService.getCarriers(user.id),
        ]);

        return createSuccessResponse({
            history,
            stats,
            evolution,
            carriers,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();

        // Validate required fields
        if (!body.carrier || typeof body.pricePerGram !== "number") {
            return NextResponse.json(
                { success: false, error: { message: "carrier and pricePerGram are required" } },
                { status: 400 }
            );
        }

        const record = await shippingHistoryService.recordPrice(user.id, {
            carrier: body.carrier,
            pricePerGram: body.pricePerGram,
            totalWeight: body.totalWeight,
            totalPrice: body.totalPrice,
            parcelId: body.parcelId,
            source: body.source || "manual",
            notes: body.notes,
        });

        return createSuccessResponse(record);
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
=======
import { NextRequest, NextResponse } from "next/server";
import { shippingHistoryService } from "@/lib/services/shipping-history.service";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const { searchParams } = new URL(request.url);
        const carrier = searchParams.get("carrier") || undefined;
        const days = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 90;

        // Fetch all history data in parallel
        const [history, stats, evolution, carriers] = await Promise.all([
            shippingHistoryService.getHistory(user.id, { carrier, limit: 50 }),
            shippingHistoryService.getCarrierStats(user.id),
            shippingHistoryService.getPriceEvolution(user.id, { carrier, days }),
            shippingHistoryService.getCarriers(user.id),
        ]);

        return createSuccessResponse({
            history,
            stats,
            evolution,
            carriers,
        });
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const body = await request.json();

        // Validate required fields
        if (!body.carrier || typeof body.pricePerGram !== "number") {
            return NextResponse.json(
                { success: false, error: { message: "carrier and pricePerGram are required" } },
                { status: 400 }
            );
        }

        const record = await shippingHistoryService.recordPrice(user.id, {
            carrier: body.carrier,
            pricePerGram: body.pricePerGram,
            totalWeight: body.totalWeight,
            totalPrice: body.totalPrice,
            parcelId: body.parcelId,
            source: body.source || "manual",
            notes: body.notes,
        });

        return createSuccessResponse(record);
    } catch (error: unknown) {
        return createErrorResponse(error);
    }
}
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
