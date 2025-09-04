import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/services/auth/auth';
import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import { vintedSessionCipherService } from '@/lib/services/auth/vinted-session-cipher-service';
import { vintedSessionManager } from '@/lib/services/auth/vinted-session-manager';
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '@/lib/utils/logging/simple-logger';
import { getErrorMessage } from '@/lib/utils/error-utils';
import { testVintedSessionCookie } from '@/lib/services/auth/vinted-session-validator';

/**
 * GET /api/v1/vinted/configure
 * Récupère le statut de la configuration Vinted pour l'utilisateur.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    }

    const session = await db.select({
      status: vintedSessions.status,
      lastRefreshedAt: vintedSessions.lastRefreshedAt,
      refreshErrorMessage: vintedSessions.refreshErrorMessage,
    }).from(vintedSessions).where(eq(vintedSessions.userId, user.id)).limit(1);

    if (!session.length) {
      return NextResponse.json({ status: 'requires_configuration' });
    }

    return NextResponse.json(session[0]!);
  } catch (error: unknown) {
    return NextResponse.json({ message: 'Erreur interne du serveur', error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/v1/vinted/configure
 * Configure ou met à jour le cookie/token Vinted pour un utilisateur.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    }

    const { sessionToken } = await req.json();
    if (!sessionToken) {
      return NextResponse.json({ message: 'Le cookie/token Vinted est requis.' }, { status: 400 });
    }

    // Valider le token/cookie via le validateur centralisé avant de le stocker
    try {
      const validation = await testVintedSessionCookie(sessionToken);
      if (!validation?.success || !validation?.valid) {
        const logger = getLogger('VintedConfigure');
        logger.info('Validation de session Vinted échouée lors de la configuration', { userId: user.id, validation });
        return NextResponse.json({ message: validation?.message || 'Token/cookie Vinted invalide', details: validation?.details ?? null }, { status: 400 });
      }
    } catch (valErr: any) {
      const logger = getLogger('VintedConfigure');
      logger.error('Erreur pendant la validation du token Vinted', { userId: user.id, error: valErr });
      return NextResponse.json({ message: 'Erreur lors de la validation du token Vinted' }, { status: 500 });
    }

    // Use envelope encryption service to generate encrypted token + encrypted DEK
    const { encryptedToken, encryptedDek, metadata } = await vintedSessionCipherService.encryptSession(user.id, sessionToken);
    const now = new Date().toISOString();

    // Utiliser une transaction pour assurer l'atomicité de l'upsert
    await db.transaction(async (tx: any) => {
      await tx.delete(vintedSessions).where(eq(vintedSessions.userId, user.id));
      await tx.insert(vintedSessions).values({
        id: uuidv4(),
        userId: user.id,
        sessionCookie: encryptedToken,
        encryptedDek: encryptedDek,
        encryptionMetadata: metadata,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastValidatedAt: now,
      });
    });

    // Déclencher un premier rafraîchissement pour valider le token
    try {
      await vintedSessionManager.refreshSession(user.id);
    } catch (refreshError: any) {
      // Si le rafraîchissement échoue, cela signifie que le token est probablement invalide.
      // On ne considère pas cela comme une erreur fatale de la configuration,
      // mais on logue l'erreur pour le débogage.
      const logger = getLogger('VintedConfigure');
      logger.warn(`Le rafraîchissement initial a échoué pour l'utilisateur ${user.id}, mais la session a été enregistrée`, refreshError);
      // On peut choisir de retourner un succès partiel ou un avertissement au client si nécessaire.
      // Pour l'instant, on considère que l'enregistrement est un succès.
    }

    return NextResponse.json({ message: 'Cookie/token Vinted enregistré avec succès.' });
  } catch (error: unknown) {
    return NextResponse.json({ message: 'Erreur lors de la configuration', error: getErrorMessage(error) }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/vinted/configure
 * Supprime la configuration Vinted pour un utilisateur.
 */
export async function DELETE(_req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
        }

        await db.delete(vintedSessions).where(eq(vintedSessions.userId, user.id));

        return NextResponse.json({ message: 'Configuration Vinted supprimée avec succès.' });
    } catch (error: unknown) {
        return NextResponse.json({ message: 'Erreur interne du serveur', error: getErrorMessage(error) }, { status: 500 });
    }
}