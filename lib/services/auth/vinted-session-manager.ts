import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import { vintedCredentialService } from './vinted-credential-service';
import axios from 'axios';
import { logger } from '@/lib/utils/logging/logger';

const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const SUGGESTIONS_URL = `${VINTED_API_BASE}/items/suggestions`;

export const vintedSessionManager = {
  async getSessionCookie(userId: string): Promise<string | null> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });
    return session?.sessionCookie || null;
  },

  async refreshSession(userId: string): Promise<void> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });

    if (!session || !session.sessionCookie) {
      logger.warn(`[VintedSessionManager] Aucune session à rafraîchir pour l'utilisateur ${userId}`);
      await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Session non trouvée' }).where(eq(vintedSessions.userId, userId));
      return;
    }

    try {
      const decryptedCookie = await vintedCredentialService.decrypt(session.sessionCookie);
      const isValid = await this.isTokenValid(decryptedCookie);
      const now = new Date().toISOString();

      if (isValid) {
        await db.update(vintedSessions).set({
          status: 'active',
          lastValidatedAt: now,
          refreshErrorMessage: null,
        }).where(eq(vintedSessions.userId, userId));
        logger.info(`[VintedSessionManager] Session validée pour l'utilisateur ${userId}`);
      } else {
        await db.update(vintedSessions).set({
          status: 'expired',
          refreshErrorMessage: 'Le token est invalide ou a expiré.',
        }).where(eq(vintedSessions.userId, userId));
        logger.warn(`[VintedSessionManager] Session expirée pour l'utilisateur ${userId}`);
      }
    } catch (error: any) {
      logger.error(`[VintedSessionManager] Erreur lors du rafraîchissement de la session pour ${userId}:`, error);
      await db.update(vintedSessions).set({
        status: 'error',
        refreshErrorMessage: error.message,
      }).where(eq(vintedSessions.userId, userId));
    }
  },

  async isTokenValid(cookieString: string): Promise<boolean> {
    if (!cookieString || typeof cookieString !== 'string') {
      return false;
    }
    
    // Le VintedAuthService est plus robuste pour la validation. Utilisons-le.
    // Note : On ne peut pas instancier VintedAuthService directement ici pour éviter les dépendances circulaires.
    // Nous réimplémentons donc une logique de validation simple et directe.
    try {
      const headers = {
        'Cookie': cookieString, // Utilisation directe de la chaîne de cookie complète
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      
      // Utilisons un endpoint connu pour fonctionner et qui est protégé.
      const response = await axios.get('https://www.vinted.fr/api/v2/users/current', { headers, timeout: 10000 });

      // Un statut 200 avec des données utilisateur valides confirme la validité.
      return response.status === 200 && response.data?.user?.id;
    } catch (error: any) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logger.warn(`[isTokenValid] Validation failed with status ${error.response.status}. Token is invalid.`);
        return false;
      }
      // Pour les autres erreurs (timeout, réseau, etc.), on considère le token comme potentiellement valide
      // mais on logue l'erreur pour investigation.
      logger.error('[isTokenValid] Erreur inattendue lors de la validation du token:', error);
      // On pourrait retourner false ici pour être plus strict.
      // Pour l'instant, on retourne true pour ne pas invalider un token à cause d'un problème réseau.
      return true;
    }
  },
};