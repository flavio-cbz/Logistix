import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/services/auth/auth';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';

async function registerHandler(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Nom d\'utilisateur et mot de passe requis' },
      { status: 400 }
    );
  }

  const result = await createUser(username, password);

  const response = createSuccessResponse({
    id: result.id,
    username: result.username,
    message: 'Utilisateur créé avec succès',
  });

  return NextResponse.json(response);
}

export const POST = withErrorHandling(registerHandler);