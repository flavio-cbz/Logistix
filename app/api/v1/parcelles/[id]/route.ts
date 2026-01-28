import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { serviceContainer } from '@/lib/services/container';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logging/logger';
=======
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { withErrorHandling } from '@/lib/utils/api-response';
import { databaseService } from '@/lib/database';
import { transformParcelleFromDb } from '@/lib/utils/case-transformer';
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
import { z } from 'zod';

// Schéma de validation pour la mise à jour (champs optionnels)
const updateParcelleSchema = z.object({
  superbuyId: z.string().min(1).trim().optional(),
  carrier: z.string().min(1).trim().optional(),
  name: z.string().min(1).trim().optional(),
<<<<<<< HEAD
  trackingNumber: z.string().optional(),
=======
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
  status: z.string()
    .trim()
    .refine(val => !val || ['En attente', 'En transit', 'Livré', 'Retourné', 'Perdu', 'Pending', 'In Transit', 'Delivered'].includes(val), {
      message: "Le statut doit être un statut valide"
    })
    .optional(),
<<<<<<< HEAD
  isActive: z.number().min(0).max(1).optional(),
  weight: z.number().positive().optional(),
  totalPrice: z.number().min(0).optional(),
  pricePerGram: z.number().min(0).optional(),
=======
  isActive: z.boolean().optional(),
  weight: z.number().positive().optional(),
  totalPrice: z.number().min(0).optional(),
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ doit être fourni',
});

// Handler PATCH : Met à jour une parcelle
async function handlePatch(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const { id } = params;
    const body = await req.json();
    const validatedData = updateParcelleSchema.parse(body);

    const parcelleService = serviceContainer.getParcelleService();
    const updatedParcelle = await parcelleService.updateParcelle(id, user.id, validatedData);

    logger.info('[PARCELLE-UPDATE] Parcelle updated successfully', { parcelleId: id, userId: user.id });

<<<<<<< HEAD
=======
  // Vérifier existence et propriété
  const existing = await databaseService.queryOne<{
    id: string;
    superbuy_id: string;
    weight: number;
    total_price: number;
    user_id: string;
  }>(
    'SELECT * FROM parcels WHERE id = ? AND user_id = ?',
    [id, user.id]
  );
  if (!existing) {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    return NextResponse.json(
      createSuccessResponse({ parcelle: updatedParcelle })
    );
  } catch (error) {
    logger.error('[PARCELLE-UPDATE] Error updating parcelle', { error });
    return NextResponse.json(
      createErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode || 500 : 500 }
    );
  }
<<<<<<< HEAD
}

// Handler DELETE : Supprime une parcelle (soft delete via is_active=0)
async function handleDelete(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authService = serviceContainer.getAuthService();
    const user = await authService.requireAuth();

    const { id } = params;

    const parcelleService = serviceContainer.getParcelleService();
    const deleted = await parcelleService.deleteParcelle(id, user.id);

    logger.info('[PARCELLE-DELETE] Parcelle deleted successfully', { parcelleId: id, userId: user.id });

=======

  // Vérifier unicité du numéro si modifié
  if (validatedData.superbuyId && validatedData.superbuyId !== existing.superbuy_id) {
    const conflict = await databaseService.queryOne(
      'SELECT id FROM parcels WHERE superbuy_id = ? AND user_id = ? AND id != ?',
      [validatedData.superbuyId, user.id, id]
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
  if (validatedData.superbuyId) updates['superbuy_id'] = validatedData.superbuyId.trim();
  if (validatedData.carrier) updates['carrier'] = validatedData.carrier.trim();
  if (validatedData.name) updates['name'] = validatedData.name.trim();
  if (validatedData.status) updates['status'] = validatedData.status;
  if (validatedData.isActive !== undefined) updates['is_active'] = validatedData.isActive ? 1 : 0;
  if (validatedData.weight) updates['weight'] = validatedData.weight;
  if (validatedData.totalPrice) updates['total_price'] = validatedData.totalPrice;

  // Recalculer pricePerGram si nécessaire
  const shouldRecalculatePrice = validatedData.weight || validatedData.totalPrice;
  if (shouldRecalculatePrice) {
    const weight = (validatedData.weight || existing.weight) as number;
    const totalPrice = (validatedData.totalPrice || existing.total_price) as number;

    // Vérifier division par zéro
    if (weight <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_WEIGHT', message: 'Le poids doit être positif' } },
        { status: 400 }
      );
    }

    updates['price_per_gram'] = totalPrice / weight;
  }
  updates['updated_at'] = new Date().toISOString();

  // Mise à jour
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id, user.id); // Pour WHERE

  const result = await databaseService.execute(
    `UPDATE parcels SET ${setClause} WHERE id = ? AND user_id = ?`,
    values
  );

  if (result.changes === 0) {
    throw new Error('Échec de la mise à jour');
  }

  // Récupérer la parcelle mise à jour
  const updated = await databaseService.queryOne<Record<string, unknown>>(
    'SELECT * FROM parcels WHERE id = ?',
    [id]
  );

  // Transformer en camelCase pour le frontend
  const transformedParcelle = transformParcelleFromDb(updated);

  return NextResponse.json({ success: true, data: { parcelle: transformedParcelle } });
}

// Handler DELETE : Supprime une parcelle (soft delete via is_active=0)
async function handleDelete(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await requireAuth(req);
  const { id } = params;

  // Vérifier existence et propriété
  const existing = await databaseService.queryOne<{ id: string }>(
    'SELECT * FROM parcels WHERE id = ? AND user_id = ?',
    [id, user.id]
  );
  if (!existing) {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
    return NextResponse.json(
      createSuccessResponse({ deleted })
    );
  } catch (error) {
    logger.error('[PARCELLE-DELETE] Error deleting parcelle', { error });
    return NextResponse.json(
      createErrorResponse(error),
      { status: error instanceof Error && 'statusCode' in error ? (error as { statusCode: number }).statusCode || 500 : 500 }
    );
  }
<<<<<<< HEAD
=======

  // Soft delete
  const result = await databaseService.execute(
    'UPDATE parcels SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?',
    [id, user.id]
  );

  if (result.changes === 0) {
    throw new Error('Échec de la suppression');
  }

  return NextResponse.json({ success: true, data: { deleted: true } });
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}

// Exports
export const PATCH = handlePatch;
export const DELETE = handleDelete;
