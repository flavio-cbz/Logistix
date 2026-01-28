import { NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { logger } from "@/lib/utils/logging/logger";
import { z } from "zod";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";

// Input validation schema
const linkVintedSchema = z.object({
    vintedId: z.union([z.string(), z.number()]).transform(v => String(v)),
    price: z.number().nonnegative().optional().nullable(),
    currency: z.string().default('EUR'),
    title: z.string().optional().nullable(),
    url: z.string().optional().nullable(),
    photoUrl: z.string().optional().nullable(),
});

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const productId = params.id;

    // Validate product ID format
    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
        return NextResponse.json(
            { error: 'Invalid product ID format' },
            { status: 400 }
        );
    }

    try {
        const body = await request.json();

        // Validate input
        const parseResult = linkVintedSchema.safeParse(body);
        if (!parseResult.success) {
            logger.error('[LINK-VINTED] Validation error', { error: parseResult.error.flatten() });
            return NextResponse.json(
                { error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { vintedId, price, url, photoUrl } = parseResult.data;

        logger.info('[LINK-VINTED] Processing', { productId, vintedId, price });

        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();
        const updatedProduct = await productService.linkVinted(
            productId,
            user.id,
            {
                vintedId,
                price: price ?? undefined,
                url: url ?? undefined,
                photoUrl: photoUrl ?? undefined
            }
        );

        logger.info('[LINK-VINTED] Success', {
            productId: updatedProduct.id,
            externalId: updatedProduct.externalId,
            userId: user.id
        });

        return createSuccessResponse({
            product: {
                id: updatedProduct.id,
                name: updatedProduct.name,
                status: updatedProduct.status,
                externalId: updatedProduct.externalId,
                sellingPrice: updatedProduct.sellingPrice,
                url: updatedProduct.url,
                photoUrl: updatedProduct.photoUrl,
            }
        });

    } catch (error) {
        logger.error('[LINK-VINTED] Error', { error });
        return createErrorResponse(error);
    }
}
