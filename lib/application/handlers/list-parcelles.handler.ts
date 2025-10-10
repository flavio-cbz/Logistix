import { NextRequest, NextResponse } from 'next/server';
import { serviceContainer } from '@/lib/services/container';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';
import { requireAuth } from '@/lib/middleware/auth-middleware';

async function listParcellesHandler(req: NextRequest): Promise<NextResponse> {
  const { user } = await requireAuth(req);

  const parcelleService = serviceContainer.getParcelleService();
  const parcelles = await parcelleService.getAllParcelles(user.id);

  const response = createSuccessResponse({
    parcelles,
    count: parcelles.length,
  });

  return NextResponse.json(response);
}

export const GET = withErrorHandling(listParcellesHandler);