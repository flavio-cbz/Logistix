import { NextResponse } from 'next/server';
import { databaseService } from '@/lib/services/database/db';
import { getSessionUser } from '@/lib/services/auth/auth';

// GET /api/v1/produits/[id] - Récupérer un produit
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;
    
    const product = await databaseService.queryOne<any>(
      'SELECT * FROM products WHERE id = ? AND user_id = ?',
      [id, user.id],
      'get-product-by-id'
    );

    if (!product) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { product } });
  } catch (error) {
    console.error('GET /api/v1/produits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/v1/produits/[id] - Mettre à jour un produit
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

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
  }
}

// DELETE /api/v1/produits/[id] - Supprimer un produit
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = params;

    const result = await databaseService.execute(
      'DELETE FROM products WHERE id = ? AND user_id = ?',
      [id, user.id],
      'delete-product'
    );

    if (result.changes === 0) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { message: 'Produit supprimé' } });
  } catch (error) {
    console.error('DELETE /api/v1/produits/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
