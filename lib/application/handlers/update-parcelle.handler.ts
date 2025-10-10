import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { UpdateParcelleInput } from '@/lib/types/entities';

async function updateParcelleHandler(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { user } = await requireAuth(req);
  const { id } = params;
  const body: UpdateParcelleInput = await req.json();

  const parcelleService = serviceContainer.getParcelleService();
  const parcelle = await parcelleService.updateParcelle(id, user.id, body);

  if (!parcelle) {
    return NextResponse.json(
      { error: 'Parcelle non trouvée' },
      { status: 404 }
    );
  }

  const response = createSuccessResponse({
    parcelle,
    message: 'Parcelle mise à jour avec succès',
  });

  return NextResponse.json(response);
}

export const PUT = withErrorHandling(updateParcelleHandler);