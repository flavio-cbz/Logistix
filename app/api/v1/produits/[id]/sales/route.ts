import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/lib/services/container";
import { createErrorResponse, createSuccessResponse } from "@/lib/utils/api-response";
import { requireAuth } from "@/lib/middleware/auth-middleware";

/**
 * POST /api/v1/produits/[id]/sales
 * Marque un produit comme vendu et enregistre les informations de vente
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAuth(req);
    const { id } = params;

    let body: any;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch (_error) {
      return NextResponse.json(
        createErrorResponse(new Error('Corps de requête JSON invalide')),
        { status: 400 }
      );
    }

    const { prixVente, dateVente, dateMiseEnLigne, plateforme } = body;

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

    const productService = serviceContainer.getProductService();

    // Mettre à jour le produit avec les informations de vente
    const today = new Date().toISOString().split('T')[0];
    const updateData = {
      vendu: '1' as const, // Marquer comme vendu
      prixVente,
      sellingPrice: prixVente, // Modern field
      dateVente: dateVente || today,
      dateMiseEnLigne: dateMiseEnLigne, // Utiliser la date fournie par le formulaire
      plateforme: plateforme, // Requis par le schéma
      status: 'sold' as any, // Cast pour éviter l'erreur de type
    };

    const updatedProduct = await productService.updateProduct(id, user.id, updateData);

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