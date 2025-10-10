import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/services/auth/auth";
import { productSalesQuerySchema } from "@/lib/schemas";
import { validateQuery } from "@/lib/middleware/validation-middleware";
import { createSuccessResponse, createErrorResponse } from "@/lib/utils/api-response";
import { ProductService } from '@/lib/application/services/product.service';
import { requireAuth } from '@/lib/middleware/auth-middleware';

/**
 * GET /api/v1/produits/[id]/sales
 * Récupère les informations de vente d'un produit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return createErrorResponse(new Error("Non authentifié"));
    }

    const validationResult = validateQuery(request, productSalesQuerySchema);
    if (!validationResult.success) {
      return validationResult.response;
    }

    return createSuccessResponse({ 
      message: "Product sales endpoint secured",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error("Erreur interne"));
  }
}

/**
 * POST /api/v1/produits/[id]/sales
 * Marque un produit comme vendu et enregistre les informations de vente
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
    const { id } = params;
    
    let body: any;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (error) {
      return NextResponse.json(
        createErrorResponse(new Error('Corps de requête JSON invalide')),
        { status: 400 }
      );
    }

  const { prixVente, dateVente, dateMiseEnLigne, plateforme } = body;

  // Debug: log request body
  console.debug('[POST /produits/:id/sales] body:', body);

    // Validation des données requises
    if (!prixVente || typeof prixVente !== 'number') {
      return NextResponse.json(
        createErrorResponse(new Error('Prix de vente requis et doit être un nombre')),
        { status: 400 }
      );
    }

    if (!dateMiseEnLigne) {
      return NextResponse.json(
        createErrorResponse(new Error('Date de mise en ligne requise')),
        { status: 400 }
      );
    }

    const productService = new ProductService();
    
    // Récupérer le produit existant
    const existingProduct = await productService.getProductById(id);
    
    if (!existingProduct) {
      return NextResponse.json(
        createErrorResponse(new Error('Produit non trouvé')),
        { status: 404 }
      );
    }

    // Mettre à jour le produit avec les informations de vente
    const today = new Date().toISOString().split('T')[0];
    const updateData = {
      vendu: '1' as const, // Marquer comme vendu
      prixVente,
      dateVente: dateVente || today,
      dateMiseEnLigne: dateMiseEnLigne, // Utiliser la date fournie par le formulaire
      plateforme: plateforme || 'Vinted', // Requis par le schéma
      status: 'sold' as any, // Cast pour éviter l'erreur de type
    };

    console.debug('[POST /produits/:id/sales] updateData:', updateData);

    const updatedProduct = await productService.updateProduct(id, updateData);

    return NextResponse.json(
      createSuccessResponse({
        product: updatedProduct,
        message: 'Produit marqué comme vendu avec succès',
      })
    );
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(error instanceof Error ? error : new Error('Erreur lors de l\'enregistrement de la vente')),
      { status: 500 }
    );
  }
}