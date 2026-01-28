import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import type { NewProduct } from "@/lib/database/schema";

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
        const duplicateData: Partial<NewProduct> = {
            userId: user.id,
            name: `${sourceProduct.name} (Copie)`,
            price: sourceProduct.price,
            poids: sourceProduct.poids,
        };

        // Ajouter les propriétés optionnelles seulement si elles existent
        if (sourceProduct.parcelId) duplicateData.parcelId = sourceProduct.parcelId;
        if (sourceProduct.brand) duplicateData.brand = sourceProduct.brand;
        if (sourceProduct.category) duplicateData.category = sourceProduct.category;

        const newProduct = await productService.createProduct(user.id, duplicateData as NewProduct);

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
