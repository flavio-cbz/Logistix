import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/services/auth/auth';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';

async function validateSessionHandler(req: NextRequest): Promise<NextResponse> {
  const result = await validateSession(req);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: result.message || 'Non authentifié',
        },
      },
      { status: 401 }
    );
  }

  const response = createSuccessResponse({
    user: {
      id: result.user!.id,
      username: result.user!.username,
      isAdmin: result.user!.isAdmin,
      aiConfig: result.user!.aiConfig,
    },
  });

  return NextResponse.json(response);
}

export const GET = withErrorHandling(validateSessionHandler);