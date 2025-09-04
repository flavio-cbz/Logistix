import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth/auth';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';

export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHENTICATED', _message: 'Non authentifié' } },
        { status: 401 }
      );
    }

    const refreshResult = await vintedSessionManager.forceRefreshSession(user.id);

    if (refreshResult.success) {
      return NextResponse.json(
        { ok: true, _data: { message: 'Token rafraîchi avec succès.' } },
        { status: 200 }
      );
    }

    // Erreurs client connues -> 400, sinon 500
    const clientErrors = ['Session non trouvée', 'backoff_active', 'Impossible de déchiffrer la session', 'Impossible de rafraîchir le token'];
    const status = clientErrors.includes(refreshResult.error ?? '') ? 400 : 500;

    return NextResponse.json(
      { ok: false, error: { code: 'REFRESH_FAILED', _message: 'Le rafraîchissement du token a échoué.' } },
      { status }
    );
  } catch (error: any) {
    console.error('[vinted/refresh-token] Erreur interne:', error);
    return NextResponse.json(
      { ok: false, error: { code: 'REFRESH_FAILED', _message: 'Le rafraîchissement du token a échoué.' } },
      { status: 500 }
    );
  }
}