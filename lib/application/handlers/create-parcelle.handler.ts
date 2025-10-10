import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { CreateParcelleInput } from '@/lib/types/entities';

async function createParcelleHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);
  const body: CreateParcelleInput = await req.json();

  const parcelleService = serviceContainer.getParcelleService();
  const parcelle = await parcelleService.createParcelle(user.id, body);

  const response = createSuccessResponse({
    id: parcelle.id,
    numero: parcelle.numero,
    transporteur: parcelle.transporteur,
    message: 'Parcelle créée avec succès',
  });

  return NextResponse.json(response);
}

export const POST = withErrorHandling(createParcelleHandler);