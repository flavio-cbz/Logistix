import { NextResponse } from 'next/server';
import { signOut } from '@/lib/services/auth/auth';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';

async function logoutHandler(): Promise<NextResponse> {
  await signOut();

  const response = createSuccessResponse({
    ok: true,
    data: {
      message: 'Déconnexion réussie',
    },
  });

  return NextResponse.json(response);
}

export const POST = withErrorHandling(logoutHandler);