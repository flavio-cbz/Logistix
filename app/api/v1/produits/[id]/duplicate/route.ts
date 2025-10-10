import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/application/services/product.service';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/v1/produits/[id]/duplicate
 * Duplique un produit existant
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('DUPLICATE ENDPOINT: Starting duplicate for product:', params.id);
    const { user } = await requireAuth(req);
    console.log('DUPLICATE ENDPOINT: User authenticated:', user.id);
    const { id } = params;

    const productService = new ProductService();
    console.log('DUPLICATE ENDPOINT: ProductService created');
    
    // 1. Récupérer le produit source
    console.log('DUPLICATE ENDPOINT: Calling getProductById for:', id);
    const sourceProduct = await productService.getProductById(id);
    console.log('DUPLICATE ENDPOINT: Source product retrieved:', sourceProduct);
    
    if (!sourceProduct) {
      return NextResponse.json(
        createErrorResponse(new Error('Produit non trouvé')),
        { status: 404 }
      );
    }
    
    // 2. Créer un nouveau produit avec les mêmes données (sauf l'ID)
    console.log('DUPLICATE ENDPOINT: Creating duplicate data from source:', sourceProduct);
    const duplicateData: any = {
      userId: user.id,
      name: `${sourceProduct.name} (Copie)`,
      price: sourceProduct.price,
      poids: sourceProduct.poids,
      vintedItemId: `${sourceProduct.vintedItemId || 'item'}-copy-${Date.now()}`,
    };
    
    // Ajouter les propriétés optionnelles seulement si elles existent
    if (sourceProduct.parcelleId) duplicateData.parcelleId = sourceProduct.parcelleId;
    if (sourceProduct.brand) duplicateData.brand = sourceProduct.brand;
    if (sourceProduct.category) duplicateData.category = sourceProduct.category;
    
    console.log('DUPLICATE ENDPOINT: Duplicate data prepared:', duplicateData);
    
    console.log('DUPLICATE ENDPOINT: Calling createProduct...');
    const newProduct = await productService.createProduct(duplicateData);
    console.log('DUPLICATE ENDPOINT: Product created successfully:', newProduct);

    return NextResponse.json(
      createSuccessResponse({
        product: newProduct,
        message: 'Produit dupliqué avec succès',
      })
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error : new Error('Erreur lors de la duplication')),
      { status: 500 }
    );
  }
}
