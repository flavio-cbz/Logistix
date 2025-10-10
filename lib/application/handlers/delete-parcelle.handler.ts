import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';

async function deleteParcelleHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { user } = await requireAuth(req);
  const { id } = params;

  const parcelleService = serviceContainer.getParcelleService();
  const success = await parcelleService.deleteParcelle(id, user.id);

  if (!success) {
    return NextResponse.json(
      { error: 'Parcelle non trouvée ou déjà supprimée' },
      { status: 404 }
    );
  }

  const response = createSuccessResponse({
    message: 'Parcelle supprimée avec succès',
  });

  return NextResponse.json(response);
}

export const DELETE = withErrorHandling(deleteParcelleHandler);