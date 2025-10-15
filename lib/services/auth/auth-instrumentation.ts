import { logger } from "@/lib/utils/logging/universal-logger";
import { getErrorMessage } from "@/lib/utils/error-utils";

// Définitions des types pour l'instrumentation d'authentification
export const AuthInstrumentationEventTypes = [
  "login_attempt",
  "login_success",
  "login_failure",
  "session_create",
  "session_destroy",
  "session_renew",
  "password_reset_request",
  "password_reset_success",
  "password_reset_failure",
  "user_registration",
  "user_update",
  "user_delete",
  "auth_error",
  "token_refresh",
] as const;

export type AuthInstrumentationEventType =
  (typeof AuthInstrumentationEventTypes)[number];

export interface AuthInstrumentationEvent {
  id: string;
  type: AuthInstrumentationEventType;
  timestamp: number;
  userId?: string | undefined;
  details?: Record<string, unknown>;
  success?: boolean;
  latency?: number;
  error?: string;
  origin?: string; // e.g., 'web', 'mobile', 'api'
  provider?: string; // e.g., 'credentials', 'google', 'github'
  model?: string; // for AI-related auth features
}

export interface AuthInstrumentationMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<AuthInstrumentationEventType, number>;
  errorsByType: Record<AuthInstrumentationEventType, number>;
  totalLatency: number;
  averageLatency: Record<AuthInstrumentationEventType, number>;
  lastEventTimestamp: Record<AuthInstrumentationEventType, number>;

  activeSessions: number;
  failedLoginAttempts: number;

  loginSuccessRate: number;
  sessionRenewalRate: number;

  latencyDistribution: Record<AuthInstrumentationEventType, number[]>;
  errorDistribution: Record<AuthInstrumentationEventType, string[]>;

  eventsByTimeframe: Record<
    "hour" | "day" | "week" | "month",
    Record<AuthInstrumentationEventType, number>
  >;
  errorsByTimeframe: Record<
    "hour" | "day" | "week" | "month",
    Record<AuthInstrumentationEventType, number>
  >;

  eventsByOrigin: Record<string, Record<AuthInstrumentationEventType, number>>;
  errorsByOrigin: Record<string, Record<AuthInstrumentationEventType, number>>;

  metricsByProvider: Record<
    string,
    {
      totalEvents: number;
      successfulEvents: number;
      failedEvents: number;
      totalLatency: number;
    }
  >;
  metricsByModel: Record<
    string,
    {
      totalEvents: number;
      successfulEvents: number;
      failedEvents: number;
      totalLatency: number;
    }
  >;
}

/**
 * Service de collecte de métriques d'instrumentation d'authentification
 */
export class AuthInstrumentationCollector {
  private static instance: AuthInstrumentationCollector;
  private events: AuthInstrumentationEvent[] = [];
  private metrics: AuthInstrumentationMetrics;
  private readonly MAX_EVENTS_HISTORY = 5000;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer: NodeJS.Timeout | undefined;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.startCleanupTimer();
  }

  public static getInstance(): AuthInstrumentationCollector {
    if (!AuthInstrumentationCollector.instance) {
      AuthInstrumentationCollector.instance =
        new AuthInstrumentationCollector();
    }
    return AuthInstrumentationCollector.instance;
  }

  private initializeMetrics(): AuthInstrumentationMetrics {
    const initialMetrics: AuthInstrumentationMetrics = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      eventsByType: {} as Record<AuthInstrumentationEventType, number>,
      errorsByType: {} as Record<AuthInstrumentationEventType, number>,
      totalLatency: 0,
      averageLatency: {} as Record<AuthInstrumentationEventType, number>,
      lastEventTimestamp: {} as Record<AuthInstrumentationEventType, number>,

      activeSessions: 0,
      failedLoginAttempts: 0,

      loginSuccessRate: 0,
      sessionRenewalRate: 0,

      latencyDistribution: {} as Record<AuthInstrumentationEventType, number[]>,
      errorDistribution: {} as Record<AuthInstrumentationEventType, string[]>,

      eventsByTimeframe: {
        hour: {} as Record<AuthInstrumentationEventType, number>,
        day: {} as Record<AuthInstrumentationEventType, number>,
        week: {} as Record<AuthInstrumentationEventType, number>,
        month: {} as Record<AuthInstrumentationEventType, number>,
      },
      errorsByTimeframe: {
        hour: {} as Record<AuthInstrumentationEventType, number>,
        day: {} as Record<AuthInstrumentationEventType, number>,
        week: {} as Record<AuthInstrumentationEventType, number>,
        month: {} as Record<AuthInstrumentationEventType, number>,
      },

      eventsByOrigin: {},
      errorsByOrigin: {},

      metricsByProvider: {},
      metricsByModel: {},
    };

    // Initialize all event types to 0 for consistency
    AuthInstrumentationEventTypes.forEach((type) => {
      initialMetrics.eventsByType[type] = 0;
      initialMetrics.errorsByType[type] = 0;
      initialMetrics.averageLatency[type] = 0;
      initialMetrics.lastEventTimestamp[type] = 0;
      initialMetrics.latencyDistribution[type] = [];
      initialMetrics.errorDistribution[type] = [];

      Object.keys(initialMetrics.eventsByTimeframe).forEach((tf) => {
        initialMetrics.eventsByTimeframe[
          tf as "hour" | "day" | "week" | "month"
        ][type] = 0;
        initialMetrics.errorsByTimeframe[
          tf as "hour" | "day" | "week" | "month"
        ][type] = 0;
      });
    });

    return initialMetrics;
  }

  /**
   * Enregistre un événement d'instrumentation d'authentification.
   */
  recordEvent(event: AuthInstrumentationEvent): void {
    try {
      this.events.push(event);
      if (this.events.length > this.MAX_EVENTS_HISTORY) {
        this.events = this.events.slice(-this.MAX_EVENTS_HISTORY * 0.8);
      }

      this.updateMetrics(event);
    } catch (error) {
      logger.error("[AuthInstrumentation] Error recording event", {
        error: getErrorMessage(error),
        event,
      });
    }
  }

  private updateMetrics(event: AuthInstrumentationEvent): void {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[event.type] =
      (this.metrics.eventsByType[event.type] || 0) + 1;
    this.metrics.lastEventTimestamp[event.type] = event.timestamp;

    if (event.success) {
      this.metrics.successfulEvents++;
    } else {
      this.metrics.failedEvents++;
      this.metrics.errorsByType[event.type] =
        (this.metrics.errorsByType[event.type] || 0) + 1;
      if (event.error) {
        this.metrics.errorDistribution[event.type]?.push(event.error);
      }
    }

    if (event.latency !== undefined) {
      const currentLatencySum =
        (this.metrics.averageLatency[event.type] || 0) *
        (this.metrics.eventsByType[event.type] - 1);
      this.metrics.averageLatency[event.type] =
        (currentLatencySum + event.latency) /
        this.metrics.eventsByType[event.type];
      this.metrics.totalLatency += event.latency;
      this.metrics.latencyDistribution[event.type]?.push(event.latency);
    }

    // Mise à jour des métriques spécifiques
    if (event.type === "login_success") {
      this.metrics.activeSessions++;
    } else if (event.type === "session_destroy") {
      this.metrics.activeSessions = Math.max(
        0,
        this.metrics.activeSessions - 1,
      );
    } else if (event.type === "login_failure") {
      this.metrics.failedLoginAttempts++;
    }

    // Update time-based metrics
    const timeframeKeys: Array<"hour" | "day" | "week" | "month"> = [
      "hour",
      "day",
      "week",
      "month",
    ];
    timeframeKeys.forEach((tf) => {
      const tfMetrics = this.metrics.eventsByTimeframe[tf];
      tfMetrics[event.type] = (tfMetrics[event.type] || 0) + 1;
      if (!event.success) {
        this.metrics.errorsByTimeframe[tf][event.type] =
          (this.metrics.errorsByTimeframe[tf][event.type] || 0) + 1;
      }
    });

    // Update origin-based metrics
    if (event.origin) {
      if (!this.metrics.eventsByOrigin[event.origin]) {
        this.metrics.eventsByOrigin[event.origin] = {} as Record<
          AuthInstrumentationEventType,
          number
        >;
        this.metrics.errorsByOrigin[event.origin] = {} as Record<
          AuthInstrumentationEventType,
          number
        >;
      }
      const originEvents = (this.metrics.eventsByOrigin[event.origin] || {}) as Record<AuthInstrumentationEventType, number>;
      originEvents[event.type] = (originEvents[event.type] || 0) + 1;
      if (!event.success) {
        const originErrors = (this.metrics.errorsByOrigin[event.origin] || {}) as Record<AuthInstrumentationEventType, number>;
        originErrors[event.type] = (originErrors[event.type] || 0) + 1;
      }
    }

    // Update provider/model metrics
    if (event.provider) {
      if (!this.metrics.metricsByProvider[event.provider]) {
        this.metrics.metricsByProvider[event.provider] = {
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          totalLatency: 0,
        };
      }
      const providerMetrics = this.metrics.metricsByProvider[event.provider] || {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        totalLatency: 0,
      };
      providerMetrics.totalEvents++;
      if (event.success) providerMetrics.successfulEvents++;
      else providerMetrics.failedEvents++;
      if (event.latency) providerMetrics.totalLatency += event.latency;
    }

    if (event.model) {
      if (!this.metrics.metricsByModel[event.model]) {
        this.metrics.metricsByModel[event.model] = {
          totalEvents: 0,
          successfulEvents: 0,
          failedEvents: 0,
          totalLatency: 0,
        };
      }
      const modelMetrics = this.metrics.metricsByModel[event.model] || {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        totalLatency: 0,
      };
      modelMetrics.totalEvents++;
      if (event.success) modelMetrics.successfulEvents++;
      else modelMetrics.failedEvents++;
      if (event.latency) modelMetrics.totalLatency += event.latency;
    }

    this.calculateRates();
  }

  private calculateRates(): void {
    const totalLoginAttempts = this.metrics.eventsByType.login_attempt || 0;
    const successfulLogins = this.metrics.eventsByType.login_success || 0;
    this.metrics.loginSuccessRate =
      totalLoginAttempts > 0 ? successfulLogins / totalLoginAttempts : 0;

    const totalSessionEvents =
      (this.metrics.eventsByType.session_create || 0) +
      (this.metrics.eventsByType.session_renew || 0);
    const successfulSessionRenewals =
      this.metrics.eventsByType.session_renew || 0;
    this.metrics.sessionRenewalRate =
      totalSessionEvents > 0
        ? successfulSessionRenewals / totalSessionEvents
        : 0;
  }

  /**
   * Obtient toutes les métriques agrégées actuelles.
   */
  getMetrics(): AuthInstrumentationMetrics {
    return { ...this.metrics };
  }

  /**
   * Réinitialise toutes les métriques.
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.events = [];
    logger.info("[AuthInstrumentation] All metrics reset.");
  }

  /**
   * Démarre le timer de nettoyage périodique.
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldEvents();
    }, this.CLEANUP_INTERVAL);
    logger.info("[AuthInstrumentation] Cleanup timer started.");
  }

  /**
   * Nettoie les anciens événements pour éviter la surcharge mémoire.
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // Garder 7 jours d'historique
    const initialCount = this.events.length;
    this.events = this.events.filter((event) => event.timestamp > cutoffTime);
    const cleanedCount = initialCount - this.events.length;

    if (cleanedCount > 0) {
      logger.info("[AuthInstrumentation] Cleaned up old events", {
        cleanedCount,
      });
    }
  }

  /**
   * Arrête le timer de nettoyage et vide l'historique.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.events = [];
    this.metrics = this.initializeMetrics();
    logger.info("[AuthInstrumentation] Service destroyed and metrics cleared.");
  }

  /**
   * Exporte les événements d'instrumentation.
   */
  exportEvents(): AuthInstrumentationEvent[] {
    return [...this.events];
  }

  /**
   * Importe les événements d'instrumentation.
   */
  importEvents(events: AuthInstrumentationEvent[]): void {
    this.events = [...events];
    this.metrics = this.initializeMetrics(); // Réinitialiser les métriques avant de les recalculer
    this.events.forEach((event) => this.updateMetrics(event)); // Recalculer les métriques à partir des événements importés
    logger.info(
      "[AuthInstrumentation] Events imported and metrics re-calculated.",
      { count: events.length },
    );
  }
}

// Instance singleton
export const authInstrumentationCollector =
  AuthInstrumentationCollector.getInstance();
