// API route pour tester la validité du token Vinted

import { NextRequest, NextResponse } from 'next/server';
import { VintedAuthService } from '@/lib/services/auth/vinted-auth-service';

import { getLogger } from '@/lib/utils/logging/logger';

const logger = getLogger('vinted-token-test');
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
logger.info('Début de la validation du token Vinted.', { token });

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { valid: false, error: "Token Vinted manquant ou invalide." },
        { status: 400 }
      );
    }

    const authService = new VintedAuthService(token);
    const result = await authService.validateAccessToken();
logger.info('Résultat de la validation du token Vinted.', { result });

    if (result.valid) {
      return NextResponse.json(
        { valid: true, status: result.status, user: result.body },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { valid: false, error: result.error || "Token Vinted invalide ou expiré.", status: result.status },
        { status: result.status === 401 ? 401 : 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: err?.message || "Erreur interne lors de la validation du token." },
      { status: 500 }
    );
  }
}