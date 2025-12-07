import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { withErrorHandling } from '@/lib/utils/api-response';
import { databaseService } from '@/lib/services/database/db';
import { transformParcelleFromDb } from '@/lib/utils/case-transformer';
import { z } from 'zod';

// Schéma de validation pour la mise à jour (champs optionnels)
const updateParcelleSchema = z.object({
  numero: z.string().min(1).trim().optional(),
  transporteur: z.string().min(1).trim().optional(),
  nom: z.string().min(1).trim().optional(),
  statut: z.string()
    .trim()
    .refine(val => !val || ['En attente', 'En transit', 'Livré', 'Retourné', 'Perdu'].includes(val), {
      message: "Le statut doit être 'En attente', 'En transit', 'Livré', 'Retourné' ou 'Perdu'"
    })
    .optional(),
  actif: z.boolean().optional(),
  poids: z.number().positive().optional(),
  prixAchat: z.number().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ doit être fourni',
});

// Handler PATCH : Met à jour une parcelle
async function handlePatch(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireAuth(req);
  const { id } = params;
  const body = await req.json();
  const validatedData = updateParcelleSchema.parse(body);

  // Vérifier existence et propriété
  const existing = await databaseService.queryOne(
    'SELECT * FROM parcelles WHERE id = ? AND user_id = ?',
    [id, user.id]
  );
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Parcelle introuvable' } },
      { status: 404 }
    );
  }

  // Vérifier unicité du numéro si modifié
  if (validatedData.numero && validatedData.numero !== existing.numero) {
    const conflict = await databaseService.queryOne(
      'SELECT id FROM parcelles WHERE numero = ? AND user_id = ? AND id != ?',
      [validatedData.numero, user.id, id]
    );
    if (conflict) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Numéro déjà utilisé' } },
        { status: 409 }
      );
    }
  }

  // Préparer les champs à mettre à jour
  const updates: Record<string, unknown> = {};
  if (validatedData['numero']) (updates as any)['numero'] = validatedData['numero'].trim();
  if (validatedData['transporteur']) (updates as any)['transporteur'] = validatedData['transporteur'].trim();
  if (validatedData['nom']) (updates as any)['nom'] = validatedData['nom'].trim();
  if (validatedData['statut']) (updates as any)['statut'] = validatedData['statut'];
  if (validatedData['actif'] !== undefined) (updates as any)['actif'] = validatedData['actif'] ? 1 : 0;
  if (validatedData['poids']) (updates as any)['poids'] = validatedData['poids'];
  if (validatedData['prixAchat']) (updates as any)['prix_achat'] = validatedData['prixAchat'];

  // Recalculer prixTotal et prixParGramme si nécessaire
  const shouldRecalculatePrice = validatedData['poids'] || validatedData['prixAchat'];
  if (shouldRecalculatePrice) {
    const poids = (validatedData['poids'] || existing.poids) as number;
    const prixAchat = (validatedData['prixAchat'] || existing.prix_achat) as number;
    
    // Vérifier division par zéro
    if (poids <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_WEIGHT', message: 'Le poids doit être positif' } },
        { status: 400 }
      );
    }
    
    (updates as any)['prix_total'] = prixAchat + (poids * 0.1); // Exemple, ajuster
    (updates as any)['prix_par_gramme'] = (updates as any)['prix_total'] / poids;
  }
  (updates as any)['updated_at'] = new Date().toISOString();

  // Mise à jour
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id, user.id); // Pour WHERE

  const result = await databaseService.execute(
    `UPDATE parcelles SET ${setClause} WHERE id = ? AND user_id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new Error('Échec de la mise à jour');
  }

  // Récupérer la parcelle mise à jour
  const updated = await databaseService.queryOne(
    'SELECT * FROM parcelles WHERE id = ?',
    [id]
  );

  // Transformer en camelCase pour le frontend
  const transformedParcelle = transformParcelleFromDb(updated);

  return NextResponse.json({ success: true, data: { parcelle: transformedParcelle } });
}

// Handler DELETE : Supprime une parcelle (soft delete via actif=0)
async function handleDelete(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireAuth(req);
  const { id } = params;

  // Vérifier existence et propriété
  const existing = await databaseService.queryOne(
    'SELECT * FROM parcelles WHERE id = ? AND user_id = ?',
    [id, user.id]
  );
  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Parcelle introuvable' } },
      { status: 404 }
    );
  }

  // Soft delete
  const result = await databaseService.execute(
    'UPDATE parcelles SET actif = 0, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?',
    [id, user.id]
  );

  if (result.changes === 0) {
    throw new Error('Échec de la suppression');
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
}

// Exports avec withErrorHandling
export const PATCH = withErrorHandling(handlePatch);
export const DELETE = withErrorHandling(handleDelete);
