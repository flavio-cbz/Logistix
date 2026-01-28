import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logging/logger';
import { z } from 'zod';

// Schéma de validation pour la mise à jour (champs optionnels)
const updateParcelleSchema = z.object({
  superbuyId: z.string().min(1).trim().optional(),
  carrier: z.string().min(1).trim().optional(),
  name: z.string().min(1).trim().optional(),
  trackingNumber: z.string().optional(),
  status: z.string()
    .trim()
    .refine(val => !val || ['En attente', 'En transit', 'Livré', 'Retourné', 'Perdu', 'Pending', 'In Transit', 'Delivered'].includes(val), {
      message: "Le statut doit être un statut valide"
    })
    .optional(),
  isActive: z.number().min(0).max(1).optional(),
  weight: z.number().positive().optional(),
  totalPrice: z.number().min(0).optional(),
  pricePerGram: z.number().min(0).optional(),
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
}

// Exports
export const PATCH = handlePatch;
export const DELETE = handleDelete;
