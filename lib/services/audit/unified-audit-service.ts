/**
 * Unified Audit Logging Service - Version 1.0.0
 * 
 * Service centralisé et stabilisé pour l'audit de toutes les opérations critiques.
 * Format structuré et versionné pour garantir la stabilité dans le temps.
 * 
 * Fonctionnalités :
 * - Format stable avec versioning
 * - Support des mutations (create, update, delete)
 * - Support des événements de sécurité
 * - Support des événements système
 * - Sanitization automatique des données sensibles
 * - Stockage multi-destination (logs, DB future)
 * - Requêtes et analyse facilitées
 * 
 * @module services/audit/unified-audit-service
 * @version 1.0.0
 */

import { logger } from '@/lib/utils/logging/logger';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// TYPES ET INTERFACES (FORMAT STABLE v1.0.0)
// =============================================================================

/**
 * Version du format d'audit - permet la rétro-compatibilité
 */
export const AUDIT_FORMAT_VERSION = '1.0.0';

/**
 * Types d'événements d'audit
 */
export type AuditEventType = 
  | 'mutation'      // CRUD sur entités métier
  | 'security'      // Événements de sécurité (auth, permissions)
  | 'system'        // Événements système (config, maintenance)
  | 'performance';  // Événements de performance

/**
 * Actions de mutation
 */
export type MutationAction = 'create' | 'update' | 'delete';

/**
 * Types de ressources métier
 */
export type ResourceType = 
  | 'produit'
  | 'parcelle'
  | 'user'
  | 'session'
  | 'config'
  | 'migration';

/**
 * Types d'événements de sécurité
 */
export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset'
  | 'permission_denied'
  | 'rate_limit_exceeded'
  | 'brute_force_blocked'
  | 'suspicious_activity'
  | 'session_expired'
  | 'token_refresh';

/**
 * Niveaux de sévérité pour événements de sécurité
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Structure de base d'un événement d'audit (immutable)
 */
export interface BaseAuditEvent {
  /**
   * ID unique de l'événement d'audit
   */
  id: string;

  /**
   * Version du format (pour évolution future)
   */
  version: string;

  /**
   * Type d'événement
   */
  type: AuditEventType;

  /**
   * Timestamp ISO 8601
   */
  timestamp: string;

  /**
   * ID de l'utilisateur qui a déclenché l'action (si applicable)
   */
  userId?: string;

  /**
   * Username de l'utilisateur (pour faciliter les recherches)
   */
  username?: string;

  /**
   * ID de session (si applicable)
   */
  sessionId?: string;

  /**
   * ID de trace pour corrélation avec logs applicatifs
   */
  traceId?: string;

  /**
   * ID de requête HTTP (si applicable)
   */
  requestId?: string;

  /**
   * Adresse IP source
   */
  ip?: string;

  /**
   * User-Agent du client
   */
  userAgent?: string;

  /**
   * Métadonnées additionnelles
   */
  metadata?: Record<string, any>;
}

/**
 * Événement de mutation (CRUD)
 */
export interface MutationAuditEvent extends BaseAuditEvent {
  type: 'mutation';

  /**
   * Action effectuée
   */
  action: MutationAction;

  /**
   * Type de ressource
   */
  resource: ResourceType;

  /**
   * ID de la ressource
   */
  resourceId: string;

  /**
   * Changements effectués
   * - Pour create : { after: data }
   * - Pour update : { field: { before, after } }
   * - Pour delete : { before: data }
   */
  changes: Record<string, { before?: any; after?: any }>;

  /**
   * Succès de l'opération
   */
  success: boolean;

  /**
   * Message d'erreur si échec
   */
  error?: string;
}

/**
 * Événement de sécurité
 */
export interface SecurityAuditEvent extends BaseAuditEvent {
  type: 'security';

  /**
   * Type d'événement de sécurité
   */
  securityEventType: SecurityEventType;

  /**
   * Niveau de sévérité
   */
  severity: SecuritySeverity;

  /**
   * Succès de l'opération
   */
  success: boolean;

  /**
   * Raison de l'échec (si applicable)
   */
  reason?: string;

  /**
   * Détails supplémentaires
   */
  details?: Record<string, any>;
}

/**
 * Événement système
 */
export interface SystemAuditEvent extends BaseAuditEvent {
  type: 'system';

  /**
   * Catégorie d'événement système
   */
  category: 'config' | 'maintenance' | 'migration' | 'backup' | 'error';

  /**
   * Description de l'événement
   */
  description: string;

  /**
   * Succès de l'opération
   */
  success: boolean;

  /**
   * Message d'erreur si échec
   */
  error?: string;

  /**
   * Détails supplémentaires
   */
  details?: Record<string, any>;
}

/**
 * Événement de performance
 */
export interface PerformanceAuditEvent extends BaseAuditEvent {
  type: 'performance';

  /**
   * Opération mesurée
   */
  operation: string;

  /**
   * Durée en millisecondes
   */
  duration: number;

  /**
   * Seuil configuré
   */
  threshold: number;

  /**
   * Seuil dépassé ?
   */
  thresholdExceeded: boolean;

  /**
   * Détails supplémentaires
   */
  details?: Record<string, any>;
}

/**
 * Union de tous les types d'événements
 */
export type AuditEvent =
  | MutationAuditEvent
  | SecurityAuditEvent
  | SystemAuditEvent
  | PerformanceAuditEvent;

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration du service d'audit
 */
export interface AuditServiceConfig {
  /**
   * Activer l'audit (peut être désactivé en dev)
   */
  enabled: boolean;

  /**
   * Logger les mutations (CRUD)
   */
  logMutations: boolean;

  /**
   * Logger les événements de sécurité
   */
  logSecurity: boolean;

  /**
   * Logger les événements système
   */
  logSystem: boolean;

  /**
   * Logger les événements de performance
   */
  logPerformance: boolean;

  /**
   * Sanitizer automatiquement les données sensibles
   */
  autoSanitize: boolean;

  /**
   * Champs sensibles à redacter
   */
  sensitiveFields: string[];

  /**
   * Seuil de performance en ms (défaut: 1000ms)
   */
  performanceThreshold: number;
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: AuditServiceConfig = {
  enabled: true,
  logMutations: true,
  logSecurity: true,
  logSystem: true,
  logPerformance: true,
  autoSanitize: true,
  sensitiveFields: [
    'password',
    'passwordHash',
    'password_hash',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'apiKey',
    'api_key',
    'secret',
    'encryptionSecret',
    'encryption_secret',
    'privateKey',
    'private_key',
    'sessionToken',
    'session_token',
  ],
  performanceThreshold: 1000,
};

// =============================================================================
// SERVICE PRINCIPAL
// =============================================================================

/**
 * Service d'audit unifié
 */
export class UnifiedAuditService {
  private config: AuditServiceConfig;
  private eventBuffer: AuditEvent[] = [];
  private bufferSize = 100;

  constructor(config?: Partial<AuditServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Logger une mutation (create, update, delete)
   */
  async logMutation(params: {
    action: MutationAction;
    resource: ResourceType;
    resourceId: string;
    changes: Record<string, { before?: any; after?: any }>;
    userId?: string;
    username?: string;
    sessionId?: string;
    traceId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    success?: boolean;
    error?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.logMutations) {
      return;
    }

    // Sanitize changes si autoSanitize activé
    const sanitizedChanges = this.config.autoSanitize
      ? this.sanitizeData(params.changes)
      : params.changes;

    const event: MutationAuditEvent = {
      id: uuidv4(),
      version: AUDIT_FORMAT_VERSION,
      type: 'mutation',
      timestamp: new Date().toISOString(),
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      changes: sanitizedChanges,
      success: params.success ?? true,
      ...(params.userId && { userId: params.userId }),
      ...(params.username && { username: params.username }),
      ...(params.sessionId && { sessionId: params.sessionId }),
      ...(params.traceId && { traceId: params.traceId }),
      ...(params.requestId && { requestId: params.requestId }),
      ...(params.ip && { ip: params.ip }),
      ...(params.userAgent && { userAgent: params.userAgent }),
      ...(params.error && { error: params.error }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    await this.writeAuditEvent(event);
  }

  /**
   * Logger un événement de sécurité
   */
  async logSecurity(params: {
    securityEventType: SecurityEventType;
    severity: SecuritySeverity;
    success: boolean;
    reason?: string;
    userId?: string;
    username?: string;
    sessionId?: string;
    traceId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.logSecurity) {
      return;
    }

    const event: SecurityAuditEvent = {
      id: uuidv4(),
      version: AUDIT_FORMAT_VERSION,
      type: 'security',
      timestamp: new Date().toISOString(),
      securityEventType: params.securityEventType,
      severity: params.severity,
      success: params.success,
      ...(params.reason && { reason: params.reason }),
      ...(params.userId && { userId: params.userId }),
      ...(params.username && { username: params.username }),
      ...(params.sessionId && { sessionId: params.sessionId }),
      ...(params.traceId && { traceId: params.traceId }),
      ...(params.requestId && { requestId: params.requestId }),
      ...(params.ip && { ip: params.ip }),
      ...(params.userAgent && { userAgent: params.userAgent }),
      ...(params.details && { details: params.details }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    await this.writeAuditEvent(event);
  }

  /**
   * Logger un événement système
   */
  async logSystem(params: {
    category: 'config' | 'maintenance' | 'migration' | 'backup' | 'error';
    description: string;
    success: boolean;
    error?: string;
    userId?: string;
    username?: string;
    traceId?: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.logSystem) {
      return;
    }

    const event: SystemAuditEvent = {
      id: uuidv4(),
      version: AUDIT_FORMAT_VERSION,
      type: 'system',
      timestamp: new Date().toISOString(),
      category: params.category,
      description: params.description,
      success: params.success,
      ...(params.error && { error: params.error }),
      ...(params.userId && { userId: params.userId }),
      ...(params.username && { username: params.username }),
      ...(params.traceId && { traceId: params.traceId }),
      ...(params.details && { details: params.details }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    await this.writeAuditEvent(event);
  }

  /**
   * Logger un événement de performance
   */
  async logPerformance(params: {
    operation: string;
    duration: number;
    threshold?: number;
    userId?: string;
    traceId?: string;
    details?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.config.enabled || !this.config.logPerformance) {
      return;
    }

    const threshold = params.threshold ?? this.config.performanceThreshold;
    const thresholdExceeded = params.duration > threshold;

    // Ne logger que si le seuil est dépassé (optionnel)
    if (!thresholdExceeded && params.threshold === undefined) {
      return;
    }

    const event: PerformanceAuditEvent = {
      id: uuidv4(),
      version: AUDIT_FORMAT_VERSION,
      type: 'performance',
      timestamp: new Date().toISOString(),
      operation: params.operation,
      duration: params.duration,
      threshold,
      thresholdExceeded,
      ...(params.userId && { userId: params.userId }),
      ...(params.traceId && { traceId: params.traceId }),
      ...(params.details && { details: params.details }),
      ...(params.metadata && { metadata: params.metadata }),
    };

    await this.writeAuditEvent(event);
  }

  /**
   * Écriture de l'événement d'audit
   * @private
   */
  private async writeAuditEvent(event: AuditEvent): Promise<void> {
    // 1. Logger dans Winston
    this.logToWinston(event);

    // 2. Ajouter au buffer (pour future persistence DB)
    this.addToBuffer(event);

    // 3. Future: Écrire en base de données
    // await this.persistToDatabase(event);
  }

  /**
   * Logger l'événement dans Winston
   * @private
   */
  private logToWinston(event: AuditEvent): void {
    const logMessage = this.formatLogMessage(event);
    const logContext = this.formatLogContext(event);

    switch (event.type) {
      case 'mutation':
        if (event.success) {
          logger.info(logMessage, logContext);
        } else {
          logger.error(logMessage, logContext);
        }
        break;

      case 'security':
        if (event.severity === 'critical' || event.severity === 'high') {
          logger.error(logMessage, logContext);
        } else if (!event.success) {
          logger.warn(logMessage, logContext);
        } else {
          logger.info(logMessage, logContext);
        }
        break;

      case 'system':
        if (!event.success) {
          logger.error(logMessage, logContext);
        } else {
          logger.info(logMessage, logContext);
        }
        break;

      case 'performance':
        if (event.thresholdExceeded) {
          logger.warn(logMessage, logContext);
        } else {
          logger.debug(logMessage, logContext);
        }
        break;
    }
  }

  /**
   * Formater le message de log
   * @private
   */
  private formatLogMessage(event: AuditEvent): string {
    switch (event.type) {
      case 'mutation':
        return `[AUDIT] ${event.action.toUpperCase()} ${event.resource} ${event.resourceId}`;

      case 'security':
        return `[AUDIT] SECURITY ${event.securityEventType} (${event.severity})`;

      case 'system':
        return `[AUDIT] SYSTEM ${event.category} - ${event.description}`;

      case 'performance':
        return `[AUDIT] PERFORMANCE ${event.operation} (${event.duration}ms)`;
    }
  }

  /**
   * Formater le contexte de log
   * @private
   */
  private formatLogContext(event: AuditEvent): Record<string, any> {
    const base = {
      auditId: event.id,
      auditVersion: event.version,
      auditType: event.type,
      timestamp: event.timestamp,
      userId: event.userId,
      username: event.username,
      sessionId: event.sessionId,
      traceId: event.traceId,
      requestId: event.requestId,
      ip: event.ip,
      userAgent: event.userAgent,
      metadata: event.metadata,
    };

    switch (event.type) {
      case 'mutation':
        return {
          ...base,
          action: event.action,
          resource: event.resource,
          resourceId: event.resourceId,
          changes: event.changes,
          success: event.success,
          error: event.error,
        };

      case 'security':
        return {
          ...base,
          securityEventType: event.securityEventType,
          severity: event.severity,
          success: event.success,
          reason: event.reason,
          details: event.details,
        };

      case 'system':
        return {
          ...base,
          category: event.category,
          description: event.description,
          success: event.success,
          error: event.error,
          details: event.details,
        };

      case 'performance':
        return {
          ...base,
          operation: event.operation,
          duration: event.duration,
          threshold: event.threshold,
          thresholdExceeded: event.thresholdExceeded,
          details: event.details,
        };
    }
  }

  /**
   * Ajouter au buffer (pour future persistence)
   * @private
   */
  private addToBuffer(event: AuditEvent): void {
    this.eventBuffer.push(event);

    // Limiter la taille du buffer
    if (this.eventBuffer.length > this.bufferSize) {
      this.eventBuffer.shift();
    }
  }

  /**
   * Sanitize les données sensibles
   * @private
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      // Si la clé elle-même est sensible, redacter toute la valeur
      if (this.config.sensitiveFields.includes(key)) {
        // Si la valeur est un objet { before, after }, redacter both
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const objValue = value as Record<string, any>;
          if ('before' in objValue || 'after' in objValue) {
            sanitized[key] = {
              ...(objValue['before'] !== undefined && { before: '[REDACTED]' }),
              ...(objValue['after'] !== undefined && { after: '[REDACTED]' }),
            };
          } else {
            sanitized[key] = '[REDACTED]';
          }
        } else {
          sanitized[key] = '[REDACTED]';
        }
      } else if (value && typeof value === 'object') {
        // Sinon, recurser dans l'objet/array
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Récupérer les événements du buffer
   */
  getBufferedEvents(): AuditEvent[] {
    return [...this.eventBuffer];
  }

  /**
   * Vider le buffer
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): AuditServiceConfig {
    return { ...this.config };
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(config: Partial<AuditServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// =============================================================================
// INSTANCE SINGLETON
// =============================================================================

/**
 * Instance singleton du service d'audit
 */
export const auditService = new UnifiedAuditService();

// =============================================================================
// HELPERS POUR COMPATIBILITÉ ASCENDANTE
// =============================================================================

/**
 * Helper: Log création d'une entité
 * @deprecated Utilisez auditService.logMutation() directement
 */
export function logCreate(
  resource: ResourceType,
  resourceId: string,
  userId: string,
  data: any,
  options?: {
    traceId?: string;
    username?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  return auditService.logMutation({
    action: 'create',
    resource,
    resourceId,
    changes: { data: { after: data } },
    userId,
    ...options,
  });
}

/**
 * Helper: Log mise à jour d'une entité
 * @deprecated Utilisez auditService.logMutation() directement
 */
export function logUpdate(
  resource: ResourceType,
  resourceId: string,
  userId: string,
  before: any,
  after: any,
  options?: {
    traceId?: string;
    username?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  // Calculer les changements
  const changes: Record<string, { before: any; after: any }> = {};
  for (const key in after) {
    if (after[key] !== before[key]) {
      changes[key] = { before: before[key], after: after[key] };
    }
  }

  return auditService.logMutation({
    action: 'update',
    resource,
    resourceId,
    changes,
    userId,
    ...options,
  });
}

/**
 * Helper: Log suppression d'une entité
 * @deprecated Utilisez auditService.logMutation() directement
 */
export function logDelete(
  resource: ResourceType,
  resourceId: string,
  userId: string,
  data: any,
  options?: {
    traceId?: string;
    username?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  return auditService.logMutation({
    action: 'delete',
    resource,
    resourceId,
    changes: { data: { before: data } },
    userId,
    ...options,
  });
}
