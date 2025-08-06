import { NextRequest, NextResponse } from 'next/server';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { logger } from '@/lib/utils/logging/logger';

/**
 * POST /api/v1/vinted/test-token
 * Teste la validité d'un token Vinted sans l'enregistrer.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();
    if (!sessionToken) {
      return NextResponse.json({ message: 'Le cookie/token Vinted est requis.' }, { status: 400 });
    }

    // On utilise une méthode de test qui ne dépend pas d'un utilisateur enregistré
    const isValid = await vintedSessionManager.isTokenValid(sessionToken);

    if (isValid) {
      return NextResponse.json({ isValid: true, message: 'Le token est valide.' });
    } else {
      return NextResponse.json({ isValid: false, message: 'Le token est invalide ou a expiré.' });
    }

  } catch (error: any) {
    logger.error('[VINTED_TEST_TOKEN] Erreur lors du test du token:', error);
    return NextResponse.json({ isValid: false, message: 'Erreur lors de la vérification du token.', error: error.message }, { status: 500 });
  }
}