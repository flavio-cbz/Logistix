import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/application/services/product.service';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';

const productService = new ProductService();

async function listProductsHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);

  // List products
  const products = await productService.listProducts(user.id);

  // Utiliser toJSON() pour obtenir tous les champs de l'entité Product
  const response = createSuccessResponse(
    products.map((product: any) => product.toJSON())
  );

  return NextResponse.json(response);
}

export const GET = withErrorHandling(listProductsHandler);