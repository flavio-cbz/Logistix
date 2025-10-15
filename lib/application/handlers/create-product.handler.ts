import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/application/services/product.service';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { CreateProductSchema } from '@/lib/validations/product-schemas';

const productService = new ProductService();

async function createProductHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);
  const body = await req.json();

  // Validate input
  const validatedData = CreateProductSchema.parse(body);

  // Create product
  const product = await productService.createProduct({
    name: validatedData.name,
    price: validatedData.price,
    userId: user.id,
    ...(validatedData.poids !== undefined && { poids: validatedData.poids }),
    ...(validatedData.brand && { brand: validatedData.brand }),
    ...(validatedData.category && { category: validatedData.category }),
    ...(validatedData.parcelleId && { parcelleId: validatedData.parcelleId }),
  });

  const response = createSuccessResponse({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    status: product.status,
    createdAt: product.createdAt,
  });

  return NextResponse.json(response);
}

export const POST = withErrorHandling(createProductHandler);