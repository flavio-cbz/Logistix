import { getLogger } from "@/lib/utils/logging/logger";

// Importer le SDK Sentry si nécessaire, ou un type stub s'il est optionnel
// import * as Sentry from '@sentry/node'; // ou '@sentry/nextjs'

const logger = getLogger("ErrorTracking");

/**
 * Interface pour les options de configuration du service de suivi d'erreurs.
 */
interface ErrorTrackingConfig {
  dsn?: string | undefined;
  environment?: string;
  release?: string;
  debug?: boolean;
  sampleRate?: number;
}

/**
 * Service de suivi d'erreurs global.
 * Gère la capture et l'envoi d'erreurs à un système de suivi d'erreurs (ex: Sentry).
 */
export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Initialise le service de suivi d'erreurs.
   * Doit être appelé une seule fois au démarrage de l'application.
   * @param config Configuration du service.
   */
  public initialize(config: ErrorTrackingConfig): void {
    if (this.isInitialized) {
      logger.warn("ErrorTrackingService already initialized.");
      return;
    }

    // Vérifier si Sentry est disponible et configuré
    if (config.dsn && process.env['NEXT_PUBLIC_SENTRY_DSN']) {
      // Sentry.init({
      //   dsn: config.dsn,
      //   environment: config.environment,
      //   release: config.release,
      //   debug: config.debug,
      //   sampleRate: config.sampleRate,
      //   // Ajoutez d'autres options Sentry si nécessaire
      // });
      logger.info("ErrorTrackingService initialized (Sentry placeholder).");
      this.isInitialized = true;
    } else {
      logger.warn(
        "ErrorTrackingService not initialized: Sentry DSN not provided or NEXT_PUBLIC_SENTRY_DSN missing.",
      );
    }
  }

  /**
   * Capture une exception et l'envoie au service de suivi d'erreurs.
   * @param error L'objet Error à capturer.
   * @param context Contexte supplémentaire sous forme de clé-valeur.
   */
  public captureException(
    error: unknown,
    context?: Record<string, unknown>,
  ): void {
    // Changed error to unknown, metadata to Record<string, unknown>
    if (!this.isInitialized) {
      logger.warn(
        "ErrorTrackingService not initialized. Cannot capture exception.",
        { error: error instanceof Error ? error.message : String(error) },
      );
      return;
    }
    logger.error("Captured exception:", { error, ...context });
    // Sentry.captureException(error, { extra: context });
  }

  /**
   * Capture un message et l'envoie au service de suivi d'erreurs.
   * @param message Le message à capturer.
   * @param level Le niveau de sévérité du message.
   * @param context Contexte supplémentaire sous forme de clé-valeur.
   */
  public captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info",
    context?: Record<string, unknown>,
  ): void {
    // Changed metadata to Record<string, unknown>
    if (!this.isInitialized) {
      logger.warn(
        "ErrorTrackingService not initialized. Cannot capture message.",
        { message, level },
      );
      return;
    }
    // Utiliser les méthodes spécifiques du logger au lieu de l'indexation dynamique
    switch (level) {
      case "info":
        logger.info(message, { ...context });
        break;
      case "warning":
        logger.warn(message, { ...context });
        break;
      case "error":
        logger.error(message, { ...context });
        break;
      default:
        logger.info(message, { ...context });
    }
    // Sentry.captureMessage(message, level, { extra: context });
  }

  /**
   * Ajoute un "breadcrumb" pour tracer le chemin d'exécution.
   * @param message Le message du breadcrumb.
   * @param category La catégorie du breadcrumb (ex: 'ui', 'http', 'navigation').
   * @param level Le niveau de sévérité.
   * @param metadata Métadonnées supplémentaires.
   */
  public addBreadcrumb(
    _message: string,
    _category?: string,
    _level: "info" | "warning" | "error" = "info",
    _metadata?: Record<string, unknown>,
  ): void {
    // Changed metadata to Record<string, unknown>
    if (!this.isInitialized) {
      return;
    }
    // Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   level,
    //   data: metadata,
    // });
  }

  /**
   * Définit le contexte de l'utilisateur pour les erreurs.
   * @param user L'objet utilisateur (id, email, username, etc.).
   */
  public setUser(
    _user: { id?: string; email?: string; username?: string } | null,
  ): void {
    if (!this.isInitialized) {
      logger.warn(
        "ErrorTrackingService not initialized. Cannot set user context.",
      );
      return;
    }
    // Sentry.setUser(user);
  }

  /**
   * Efface le contexte de l'utilisateur.
   */
  public clearUser(): void {
    if (!this.isInitialized) {
      logger.warn(
        "ErrorTrackingService not initialized. Cannot clear user context.",
      );
      return;
    }
    // Sentry.setUser(null);
  }

  /**
   * Définit des tags globaux pour toutes les erreurs.
   * @param tags Un objet de tags.
   */
  public setTags(_tags: Record<string, string>): void {
    if (!this.isInitialized) {
      logger.warn("ErrorTrackingService not initialized. Cannot set tags.");
      return;
    }
    // Sentry.setTags(tags);
  }

  /**
   * Définit des extra data globaux pour toutes les erreurs.
   * @param extras Un objet de données supplémentaires.
   */
  public setExtras(_extras: Record<string, unknown>): void {
    // Changed extras to Record<string, unknown>
    if (!this.isInitialized) {
      logger.warn("ErrorTrackingService not initialized. Cannot set extras.");
      return;
    }
    // Sentry.setExtras(extras);
  }

  /**
   * Envoie toutes les données en file d'attente (utile avant l'arrêt de l'application).
   */
  public async flush(_timeout?: number): Promise<boolean> {
    if (!this.isInitialized) {
      logger.warn("ErrorTrackingService not initialized. Nothing to flush.");
      return true;
    }
    logger.info("Flushing error tracking data...");
    // return Sentry.flush(timeout); // Retourne la promesse de Sentry.flush
    return Promise.resolve(true); // Placeholder
  }
}

export const errorTrackingService = ErrorTrackingService.getInstance();
