import { serviceContainer } from "@/lib/services/container";
import {
  createErrorResponse,
  createSuccessResponse,
  createNotFoundResponse
} from "@/lib/utils/api-response";

// GET /api/v1/produits/[id] - Récupérer un produit
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const productService = serviceContainer.getProductService();
    const product = await productService.getProduct(params.id, user.id);

    if (!product) {
      return createNotFoundResponse("Produit");
    }

    return createSuccessResponse({ product });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}

// PUT /api/v1/produits/[id] - Mettre à jour un produit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const json = await request.json();
    const productService = serviceContainer.getProductService();

    // Note: ProductService handles ownership check internally
    const updatedProduct = await productService.updateProduct(params.id, user.id, json);

    if (!updatedProduct) {
      return createNotFoundResponse("Produit");
    }

<<<<<<< HEAD
    return createSuccessResponse({ product: updatedProduct });
  } catch (error: unknown) {
    return createErrorResponse(error);
=======
    const { id } = params;
    let body: any = {};
    const rawText = await request.text();
    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText);
      } catch (_e) {
        return NextResponse.json({ success: false, error: 'Requête invalide: JSON malformé' }, { status: 400 });
      }
    }

    // Vérifier que le produit existe et appartient à l'utilisateur
    const existing = await databaseService.queryOne<any>(
      'SELECT id FROM products WHERE id = ? AND user_id = ?',
      [id, user.id],
      'check-product-ownership'
    );

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 });
    }

    // Construire la requête de mise à jour dynamiquement
    const updates: string[] = [];
    const values: any[] = [];

    // Mapping des noms de champs vers les noms de colonnes DB
    const fieldMapping: Record<string, string> = {
      'name': 'name',
      'description': 'description',
      'poids': 'poids', 
      'price': 'price',
      'currency': 'currency',
      'coutLivraison': 'cout_livraison',
      'sellingPrice': 'selling_price',
      'prixVente': 'prix_vente',
      'plateforme': 'plateforme',
      'status': 'status',
      'url': 'url',
      'photoUrl': 'photo_url',
      'benefices': 'benefices',
      'parcelleId': 'parcelle_id',
      'vendu': 'vendu',
      'dateMiseEnLigne': 'date_mise_en_ligne',
      'dateVente': 'date_vente'
    };

    const allowedFields = Object.keys(fieldMapping);
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbColumn = fieldMapping[field];
        updates.push(`${dbColumn} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    values.push(id, user.id);
    
    await databaseService.execute(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values,
      'update-product'
    );

    const updated = await databaseService.queryOne<any>(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [id, user.id],
      'get-updated-product'
    );

    return NextResponse.json({ success: true, data: { product: updated } });
  } catch (error) {
    console.error('PUT /api/v1/produits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
  }
}

// DELETE /api/v1/produits/[id] - Supprimer un produit
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const productService = serviceContainer.getProductService();
    const success = await productService.deleteProduct(params.id, user.id);

    if (!success) {
      return createNotFoundResponse("Produit");
    }

    return createSuccessResponse({ message: "Produit supprimé" });
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
}
