import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { logger } from '@/lib/utils/logging/logger';
import { getVintedConfig } from '@/lib/config/vinted-config';
import { encryptSecret, decryptSecret } from '@/lib/utils/crypto';

// Configuration centralisée via vinted-config.ts

export const vintedSessionManager = {
  async getSessionCookie(userId: string): Promise<string | null> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });
    if (!session?.sessionCookie) return null;
    try {
      const decrypted = decryptSecret(session.sessionCookie);
      return decrypted;
    } catch (err: any) {
      logger.error(`[VintedSessionManager] Erreur lors du déchiffrement du cookie pour ${userId}:`, err);
      // Marquer la session comme nécessitant une reconfiguration
      await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Impossible de déchiffrer la session' }).where(eq(vintedSessions.userId, userId));
      return null;
    }
  },

  async refreshSession(userId: string): Promise<{ success: boolean; error?: string; tokens?: any }> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });

    if (!session || !session.sessionCookie) {
      logger.warn(`[VintedSessionManager] Aucune session à rafraîchir pour l'utilisateur ${userId}`);
      await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Session non trouvée' }).where(eq(vintedSessions.userId, userId));
      return { success: false, error: 'Session non trouvée' };
    }

    try {
      let cookie: string;
      try {
        cookie = decryptSecret(session.sessionCookie);
      } catch (err: any) {
        logger.error(`[VintedSessionManager] Erreur de déchiffrement du cookie pour ${userId}:`, err);
        await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Impossible de déchiffrer la session' }).where(eq(vintedSessions.userId, userId));
        return { success: false, error: 'Impossible de déchiffrer la session' };
      }

      const isValid = await this.isTokenValid(cookie);
      const now = new Date().toISOString();

      if (isValid) {
        await db.update(vintedSessions).set({
          status: 'active',
          lastValidatedAt: now,
          refreshErrorMessage: null,
        }).where(eq(vintedSessions.userId, userId));
        logger.info(`[VintedSessionManager] Session validée pour l'utilisateur ${userId}`);
        return { success: true };
      } else {
        // Tenter un refresh automatique du token
        logger.info(`[VintedSessionManager] Token expiré, tentative de refresh pour l'utilisateur ${userId}`);
        
        const { VintedAuthService } = await import('./vinted-auth-service');
        const authService = new VintedAuthService(cookie);
        const newTokens = await authService.refreshAccessToken();
        
        if (newTokens && newTokens.accessToken && newTokens.refreshToken) {
          // Construire le nouveau cookie avec les nouveaux tokens
          const newCookie = cookie
            .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
            .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);
          
          // Sauvegarder le nouveau cookie chiffré
          const encrypted = encryptSecret(newCookie);
          await db.update(vintedSessions).set({
            sessionCookie: encrypted,
            status: 'active',
            lastValidatedAt: now,
            refreshErrorMessage: null,
          }).where(eq(vintedSessions.userId, userId));
          
          logger.info(`[VintedSessionManager] Token rafraîchi avec succès pour l'utilisateur ${userId}`);
          return { success: true, tokens: newTokens };
        } else {
          await db.update(vintedSessions).set({
            status: 'expired',
            refreshErrorMessage: 'Impossible de rafraîchir le token.',
          }).where(eq(vintedSessions.userId, userId));
          logger.warn(`[VintedSessionManager] Impossible de rafraîchir le token pour l'utilisateur ${userId}`);
          return { success: false, error: 'Impossible de rafraîchir le token' };
        }
      }
    } catch (error: any) {
      logger.error(`[VintedSessionManager] Erreur lors du rafraîchissement de la session pour ${userId}:`, error);
      await db.update(vintedSessions).set({
        status: 'error',
        refreshErrorMessage: error.message,
      }).where(eq(vintedSessions.userId, userId));
      return { success: false, error: error.message };
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
      const config = getVintedConfig();
      const headers = {
        'Cookie': cookieString, // Utilisation directe de la chaîne de cookie complète
        'User-Agent': config.headers.userAgent,
        'Accept': config.headers.accept,
        'X-Requested-With': config.headers.xRequestedWith,
      };
      
      // Utilisons un endpoint connu pour fonctionner et qui est protégé.
      const response = await axios.get(config.apiEndpoints.userCurrent, { headers, timeout: 10000 });

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