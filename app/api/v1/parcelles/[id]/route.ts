import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { withErrorHandling } from '@/lib/utils/api-response';
import { databaseService } from '@/lib/services/database/db';
import { z } from 'zod';

// Schéma de validation pour la mise à jour (champs optionnels)
const updateParcelleSchema = z.object({
  numero: z.string().min(1).trim().optional(),
  transporteur: z.string().min(1).trim().optional(),
  nom: z.string().min(1).trim().optional(),
  statut: z.enum(['en_transit', 'livré', 'perdu']).optional(),
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
    'SELECT * FROM parcelles WHERE id = ? AND userId = ?',
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
      'SELECT id FROM parcelles WHERE numero = ? AND userId = ? AND id != ?',
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
  if (validatedData['prixAchat']) (updates as any)['prixAchat'] = validatedData['prixAchat'];

  // Recalculer prixTotal et prixParGramme si nécessaire
  const poids = ((updates as any)['poids'] || existing.poids) as number;
  const prixAchat = ((updates as any)['prixAchat'] || existing.prixAchat) as number;
  (updates as any)['prixTotal'] = prixAchat + (poids * 0.1); // Exemple, ajuster
  (updates as any)['prixParGramme'] = (updates as any)['prixTotal'] / poids;
  (updates as any)['updatedAt'] = new Date().toISOString();

  // Mise à jour
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id, user.id); // Pour WHERE

  const result = await databaseService.execute(
    `UPDATE parcelles SET ${setClause} WHERE id = ? AND userId = ?`,
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

  return NextResponse.json({ success: true, data: { parcelle: updated } });
}

// Handler DELETE : Supprime une parcelle (soft delete via actif=0)
async function handleDelete(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireAuth(req);
  const { id } = params;

  // Vérifier existence et propriété
  const existing = await databaseService.queryOne(
    'SELECT * FROM parcelles WHERE id = ? AND userId = ?',
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
    'UPDATE parcelles SET actif = 0, updatedAt = datetime(\'now\') WHERE id = ? AND userId = ?',
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
