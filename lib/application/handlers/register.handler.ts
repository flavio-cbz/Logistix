import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser } from '@/lib/services/auth/auth';
import { withErrorHandling, createSuccessResponse } from '@/lib/middleware/error-handling';

const registerSchema = z.object({
  username: z.string().min(2, "Le nom d'utilisateur doit faire au moins 2 caractères").max(50),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères").max(100),
});

async function registerHandler(req: NextRequest): Promise<NextResponse> {
  // Parser le JSON avec gestion d'erreur pour body invalide
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Corps JSON invalide' },
      },
      { status: 400 },
    );
  }

  // Validation en amont pour garantir 422 sur données invalides
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données invalides',
          details: parsed.error.issues,
        },
      },
      { status: 422 },
    );
  }

  const { username, password } = parsed.data;

  try {
    const result = await createUser(username, password);

    const response = createSuccessResponse({
      id: result.id,
      username: result.username,
      message: 'Utilisateur créé avec succès',
    });

    // 201 attendu par les tests d’intégration
    return NextResponse.json(response, { status: 201 });
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : String(err)) || '';
    // Conflit (utilisateur existant) attendu en 409
    if (msg.includes('existe déjà') || msg.toLowerCase().includes('already exist')) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'CONFLICT', message: "Un utilisateur avec ce nom existe déjà" },
        },
        { status: 409 },
      );
    }
    // Laisser withErrorHandling gérer le reste
    throw err;
  }
}

export const POST = withErrorHandling(registerHandler);