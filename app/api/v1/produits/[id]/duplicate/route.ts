import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { requireAuth } from "@/lib/middleware/auth-middleware";

/**
 * POST /api/v1/produits/[id]/duplicate
 * Duplique un produit existant
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { user } = await requireAuth(req);
        const { id } = params;

        const productService = serviceContainer.getProductService();

        // 1. Récupérer le produit source
        const sourceProduct = await productService.getProduct(id, user.id);

        if (!sourceProduct) {
            return NextResponse.json(
                createErrorResponse(new Error('Produit non trouvé')),
                { status: 404 }
            );
        }

        // 2. Créer un nouveau produit avec les mêmes données (sauf l'ID)
        const duplicateData: any = {
            userId: user.id,
            name: `${sourceProduct.name} (Copie)`,
            price: sourceProduct.price,
            poids: sourceProduct.poids,
        };

        // Ajouter les propriétés optionnelles seulement si elles existent
        if (sourceProduct.parcelleId) duplicateData.parcelleId = sourceProduct.parcelleId;
        if (sourceProduct.brand) duplicateData.brand = sourceProduct.brand;
        if (sourceProduct.category) duplicateData.category = sourceProduct.category;

        const newProduct = await productService.createProduct(user.id, duplicateData);

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
<<<<<<< HEAD
=======
    
    // 2. Créer un nouveau produit avec les mêmes données (sauf l'ID)
    console.log('DUPLICATE ENDPOINT: Creating duplicate data from source:', sourceProduct);
    const duplicateData: any = {
      userId: user.id,
      name: `${sourceProduct.name} (Copie)`,
      price: sourceProduct.price,
      poids: sourceProduct.poids,
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
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
}
