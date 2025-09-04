import { db } from '@/lib/services/database/drizzle-client';
import { vintedSessions } from '@/lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { logger } from '@/lib/utils/logging/logger';
import { getVintedConfig } from '@/lib/config/vinted-config';
import { VintedTokens } from './vinted-auth-service';
import { vintedSessionCipherService } from './vinted-session-cipher-service';

// Configuration centralisée via vinted-config.ts

export const vintedSessionManager = {
  /**
   * Récupère et déchiffre la session cookie pour un utilisateur.
   * Si le token est expiré, tente un "lazy refresh" respectant le backoff.
   */
  async getSessionCookie(userId: string): Promise<string | null> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });
    if (!session?.sessionCookie) return null;

    try {
      const decrypted = await vintedSessionCipherService.decryptSession(
        userId,
        session.sessionCookie,
        session.encryptedDek,
      );

      // Si tokenExpiresAt est défini et pas encore expiré => on renvoie directement
      if (session.tokenExpiresAt) {
        const expiresAt = new Date(session.tokenExpiresAt).getTime();
        const now = Date.now();
        if (expiresAt > now) {
          return decrypted;
        }

        // Token déjà expiré => tentative lazy refresh
        logger.info(`[VintedSessionManager] Token expiré pour ${userId}. Tentative de lazy refresh.`);
        const refreshResult = await this.refreshSession(userId);

        if (refreshResult.success) {
          // Recharger la session fraîchement mise à jour
          const updated = await db.query.vintedSessions.findFirst({
            where: eq(vintedSessions.userId, userId),
          });
          if (!updated?.sessionCookie) return null;
          const reDecrypted = await vintedSessionCipherService.decryptSession(
            userId,
            updated.sessionCookie,
            updated.encryptedDek,
          );
          return reDecrypted;
        } else {
          logger.warn(`[VintedSessionManager] Lazy refresh échoué pour ${userId}: ${refreshResult.error}`);
          return null;
        }
      }

      // Pas d'information d'expiration => on vérifie la validité via isTokenValid pour être sûr
      const valid = await this.isTokenValid(decrypted);
      if (valid) {
        return decrypted;
      }

      // Si invalide, tenter un refresh lazy
      logger.info(`[VintedSessionManager] Token invalide (pas de tokenExpiresAt) pour ${userId}, tentative de lazy refresh.`);
      const refreshResult = await this.refreshSession(userId);
      if (refreshResult.success) {
        const updated = await db.query.vintedSessions.findFirst({
          where: eq(vintedSessions.userId, userId),
        });
        if (!updated?.sessionCookie) return null;
        const reDecrypted = await vintedSessionCipherService.decryptSession(
          userId,
          updated.sessionCookie,
          updated.encryptedDek,
        );
        return reDecrypted;
      }

      return null;
    } catch (err: unknown) { // Utilisation de unknown
      logger.error(`[VintedSessionManager] Erreur lors du déchiffrement du cookie pour ${userId}:`, err instanceof Error ? err.message : err);
      // Marquer la session comme nécessitant une reconfiguration
      await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Impossible de déchiffrer la session' }).where(eq(vintedSessions.userId, userId));
      return null;
    }
  },

  /**
   * Rafraîchit la session Vinted pour un utilisateur.
   * Gère backoff exponentiel, incrémente les compteurs d'échec, logge chaque tentative.
   */
  async refreshSession(userId: string): Promise<{ success: boolean; error?: string; tokens?: { accessToken: string; refreshToken: string; expiresAt?: string } }> {
    const session = await db.query.vintedSessions.findFirst({
      where: eq(vintedSessions.userId, userId),
    });

    if (!session || !session.sessionCookie) {
      logger.warn(`[VintedSessionManager] Aucune session à rafraîchir pour l'utilisateur ${userId}`);
      await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Session non trouvée' }).where(eq(vintedSessions.userId, userId));
      return { success: false, error: 'Session non trouvée' };
    }

    const config = getVintedConfig();
    const maxAttempts = config.maxRefreshAttempts ?? 5;
    const baseBackoffSeconds = config.refreshBackoffBaseSeconds ?? 60;

    // Vérifier backoff exponentiel
    const attemptCount = session.refreshAttemptCount ?? 0;
    if (attemptCount > 0 && session.lastRefreshAttemptAt) {
      const lastAttempt = new Date(session.lastRefreshAttemptAt).getTime();
      const delayMs = baseBackoffSeconds * 1000 * Math.pow(2, Math.max(0, attemptCount - 1));
      const nextAllowed = lastAttempt + delayMs;
      if (Date.now() < nextAllowed) {
        const waitSeconds = Math.ceil((nextAllowed - Date.now()) / 1000);
        logger.info(`[VintedSessionManager] Backoff actif pour ${userId}. Prochaine tentative dans ${waitSeconds}s (attemptCount=${attemptCount}).`);
        return { success: false, error: 'backoff_active' };
      }
    }

    try {
      let cookie: string;
      try {
        cookie = await vintedSessionCipherService.decryptSession(userId, session.sessionCookie, session.encryptedDek);
      } catch (err: unknown) { // Utilisation de unknown
        logger.error(`[VintedSessionManager] Erreur de déchiffrement du cookie pour ${userId}:`, err instanceof Error ? err.message : err);
        await db.update(vintedSessions).set({ status: 'requires_configuration', refreshErrorMessage: 'Impossible de déchiffrer la session' }).where(eq(vintedSessions.userId, userId));
        return { success: false, error: 'Impossible de déchiffrer la session' };
      }

      const isValid = await this.isTokenValid(cookie);
      const nowIso = new Date().toISOString();

      if (isValid) {
        // Token valide -> mettre à jour métadatas
        await db.update(vintedSessions).set({
          status: 'active',
          lastValidatedAt: nowIso,
          refreshErrorMessage: null,
          refreshAttemptCount: 0,
        }).where(eq(vintedSessions.userId, userId));
        logger.info(`[VintedSessionManager] Session validée pour l'utilisateur ${userId}`);
        return { success: true };
      } else {
        // Tenter un refresh automatique du token
        logger.info(`[VintedSessionManager] Tentative de refresh pour l'utilisateur ${userId} (attempt ${attemptCount})`);
        const { VintedAuthService } = await import('./vinted-auth-service');
        const authService = new VintedAuthService(cookie);
        const newTokens = await authService.refreshAccessToken();

        // Mettre à jour la trace de tentative
        const nextAttemptCount = (session.refreshAttemptCount ?? 0) + 1;
        await db.update(vintedSessions).set({
          lastRefreshAttemptAt: nowIso,
          refreshAttemptCount: nextAttemptCount,
        }).where(eq(vintedSessions.userId, userId));

        if (newTokens && newTokens.accessToken && newTokens.refreshToken) {
          // Construire le nouveau cookie avec les nouveaux tokens
          const newCookie = cookie
            .replace(/access_token_web=[^;]+/, `access_token_web=${newTokens.accessToken}`)
            .replace(/refresh_token_web=[^;]+/, `refresh_token_web=${newTokens.refreshToken}`);

          // Sauvegarder le nouveau cookie chiffré en utilisant le service d'encryption par utilisateur
          const { encryptedToken: encrypted, encryptedDek, metadata } = await vintedSessionCipherService.encryptSession(userId, newCookie);

          // Calculer tokenExpiresAt : soit fourni par newTokens.expiresAt, sinon TTL par configuration.
          const ttlHours = config.tokenTTLHours ?? 24;
          const computedExpiresAt = newTokens.expiresAt ? new Date(newTokens.expiresAt).toISOString() : new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
          await db.update(vintedSessions).set({
            sessionCookie: encrypted,
            encryptedDek: encryptedDek,
            encryptionMetadata: metadata,
            status: 'active',
            lastValidatedAt: nowIso,
            lastRefreshedAt: nowIso,
            tokenExpiresAt: computedExpiresAt,
            refreshErrorMessage: null,
            refreshAttemptCount: 0, // reset on success
          }).where(eq(vintedSessions.userId, userId));

          logger.info(`[VintedSessionManager] Token rafraîchi avec succès pour l'utilisateur ${userId}`);
          return { success: true, tokens: newTokens };
        } else {
          // Échec du refresh : incrémenter compteur déjà fait, marquer expired si dépasse seuil
          logger.warn(`[VintedSessionManager] Impossible de rafraîchir le token pour l'utilisateur ${userId} (attempt ${nextAttemptCount})`);
          const updates: { status: 'expired' | 'error' | 'active' | 'requires_configuration'; refreshErrorMessage: string | null } = {
            status: 'expired',
            refreshErrorMessage: 'Impossible de rafraîchir le token.',
          };
          if (nextAttemptCount >= maxAttempts) {
            updates.status = 'error';
            updates.refreshErrorMessage = `Max refresh attempts reached (${maxAttempts}).`;
            logger.error(`[VintedSessionManager] Seuil d'échec atteint pour ${userId}. Marqué en erreur.`);
          }
          await db.update(vintedSessions).set(updates).where(eq(vintedSessions.userId, userId));
          return { success: false, error: 'Impossible de rafraîchir le token' };
        }
      }
    } catch (error: unknown) { // Utilisation de unknown
      logger.error(`[VintedSessionManager] Erreur lors du rafraîchissement de la session pour ${userId}:`, error instanceof Error ? error.message : error);
      await db.update(vintedSessions).set({
        status: 'error',
        refreshErrorMessage: String(error instanceof Error ? error.message : error),
      }).where(eq(vintedSessions.userId, userId));
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  /**
   * Force le rafraîchissement de la session Vinted pour un utilisateur.
   * Cette méthode réinitialise les compteurs/backoff côté DB puis délègue à refreshSession.
   * Utilisée par l'API pour un rafraîchissement manuel initié par l'utilisateur.
   */
  async forceRefreshSession(userId: string): Promise<{ success: boolean; error?: string; tokens?: VintedTokens }> {
    try {
      // Réinitialiser les compteurs de backoff pour permettre une tentative immédiate.
      await db.update(vintedSessions).set({ refreshAttemptCount: 0, lastRefreshAttemptAt: null }).where(eq(vintedSessions.userId, userId));
    } catch (err: unknown) { // Utilisation de unknown
      // Si l'update échoue, logguer et continuer : on essaiera quand même le refresh.
      logger.warn(`[VintedSessionManager] Impossible de reset backoff pour ${userId}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Déléguer à la logique existante de refreshSession (encapsule le comportement).
    return await this.refreshSession(userId);
  },

  /**
   * Rafraîchit toutes les sessions proches de l'expiration (utilisé par le scheduler).
   * Utilise la marge configurable pour déclencher un refresh proactif.
   */
  async refreshExpiringSessions(): Promise<void> {
    try {
      const config = getVintedConfig();
      const marginMinutes = config.proactiveRefreshMarginMinutes ?? 10;

      const sessions = await db.select().from(vintedSessions);
      const now = Date.now();
      const threshold = now + marginMinutes * 60 * 1000;
  
      const candidates = sessions.filter((s) => {
        if (!s.tokenExpiresAt) return false;
        if (s.status !== 'active') return false;
        const exp = new Date(s.tokenExpiresAt).getTime();
        return exp <= threshold;
      });

      logger.info(`[VintedSessionManager] ${candidates.length} session(s) candidates au rafraîchissement proactif (marge=${marginMinutes}min)`);

      for (const s of candidates) {
        try {
          logger.info(`[VintedSessionManager] Rafraîchissement proactif pour utilisateur ${s.userId}`);
          await this.refreshSession(s.userId);
        } catch (err: unknown) { // Utilisation de unknown
          logger.error(`[VintedSessionManager] Erreur lors du rafraîchissement proactif pour ${s.userId}:`, err instanceof Error ? err.message : err);
        }
      }
    } catch (err: unknown) { // Utilisation de unknown
      logger.error('[VintedSessionManager] Erreur lors de refreshExpiringSessions:', err instanceof Error ? err.message : err);
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
    } catch (error: unknown) { // Utilisation de unknown
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        logger.warn(`[isTokenValid] Validation failed with status ${error.response.status}. Token is invalid.`);
        return false;
      }
      // Pour les autres erreurs (timeout, réseau, etc.), on considère le token comme potentiellement valide
      // mais on logue l'erreur pour investigation.
      logger.error('[isTokenValid] Erreur inattendue lors de la validation du token:', error instanceof Error ? error.message : error);
      // On pourrait retourner false ici pour être plus strict.
      // Pour l'instant, on retourne true pour ne pas invalider un token à cause d'un problème réseau.
      return true;
    }
  },
};