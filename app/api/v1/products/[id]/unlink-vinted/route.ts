import { NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { logger } from '@/lib/utils/logging/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-response';

export async function POST(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const productId = params.id;

    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
        return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    try {
        const authService = serviceContainer.getAuthService();
        const user = await authService.requireAuth();

        const productService = serviceContainer.getProductService();
        const updatedProduct = await productService.unlinkVinted(productId, user.id);

        logger.info('[UNLINK-VINTED] Product unlinked', {
            productId,
            userId: user.id
        });

        return createSuccessResponse({
            product: updatedProduct,
            message: 'Association Vinted supprimée'
        });

    } catch (error) {
        logger.error('[UNLINK-VINTED] Error', { error });
        return createErrorResponse(error);
    }
}
