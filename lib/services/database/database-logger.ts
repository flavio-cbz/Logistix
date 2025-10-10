import "server-only";
import { randomUUID } from "crypto";

/**
 * Types pour le système de logging de la base de données
 */
export interface ConnectionLogEntry {
  connectionId: string;
  timestamp: string;
  event:
    | "created"
    | "acquired"
    | "released"
    | "closed"
    | "error"
    | "timeout"
    | "initialization_completed";
  context?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface DatabaseLockLogEntry {
  timestamp: string;
  lockType: "SQLITE_BUSY" | "SQLITE_LOCKED" | "TRANSACTION_LOCK" | "UNKNOWN";
  connectionId?: string;
  context: string;
  operation: string;
  duration: number;
  retryAttempt: number;
  resolved: boolean;
  error?: string;
}

export interface ConnectionMonitoringData {
  timestamp: string;
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  averageWaitTime: number;
  connectionUtilization: number;
}

export interface DatabaseErrorLogEntry {
  timestamp: string;
  errorId: string;
  connectionId?: string;
  context: string;
  operation: string;
  errorType: string;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  retryAttempt: number;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Configuration du système de logging
 */
export interface DatabaseLoggerConfig {
  enableConnectionLifecycleLogging: boolean;
  enableLockLogging: boolean;
  enableErrorLogging: boolean;
  enablePerformanceMonitoring: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  maxLogEntries: number;
  warningThresholds: {
    activeConnectionsPercent: number;
    averageWaitTimeMs: number;
    lockDurationMs: number;
    errorRatePercent: number;
  };
}

/**
 * Logger spécialisé pour la base de données avec monitoring avancé
 */
export class DatabaseLogger {
  private static instance: DatabaseLogger;
  private config: DatabaseLoggerConfig;
  private connectionLogs: ConnectionLogEntry[] = [];
  private lockLogs: DatabaseLockLogEntry[] = [];
  private errorLogs: DatabaseErrorLogEntry[] = [];
  private monitoringData: ConnectionMonitoringData[] = [];
  private activeOperations: Map<
    string,
    { startTime: number; context: string; operation: string }
  > = new Map();

  private constructor(config?: Partial<DatabaseLoggerConfig>) {
    this.config = {
      enableConnectionLifecycleLogging:
        config?.enableConnectionLifecycleLogging ?? true,
      enableLockLogging: config?.enableLockLogging ?? true,
      enableErrorLogging: config?.enableErrorLogging ?? true,
      enablePerformanceMonitoring: config?.enablePerformanceMonitoring ?? true,
      logLevel:
        config?.logLevel ??
        ((process.env as any)["NODE_ENV"] === "development" ? "debug" : "info"),
      maxLogEntries: config?.maxLogEntries ?? 1000,
      warningThresholds: {
        activeConnectionsPercent:
          config?.warningThresholds?.activeConnectionsPercent ?? 80,
        averageWaitTimeMs: config?.warningThresholds?.averageWaitTimeMs ?? 5000,
        lockDurationMs: config?.warningThresholds?.lockDurationMs ?? 10000,
        errorRatePercent: config?.warningThresholds?.errorRatePercent ?? 10,
        ...config?.warningThresholds,
      },
    };

    this.log("info", "DatabaseLogger initialized", { config: this.config });
  }

  public static getInstance(
    config?: Partial<DatabaseLoggerConfig>,
  ): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger(config);
    }
    return DatabaseLogger.instance;
  }

  /**
   * Logging de base avec niveaux
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: any,
  ): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel]!;
    const messageLevel = levels[level]!;

    if (messageLevel < configLevel) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[DB-${level.toUpperCase()}] ${timestamp} - ${message}`;

    const logData = data
      ? typeof data === "object"
        ? JSON.stringify(data, null, 2)
        : data
      : "";

    switch (level) {
      case "debug":
        if ((process.env as any)["DB_DEBUG"] === "true") {
        }
        break;
      case "info":
        console.info(logMessage, logData);
        break;
      case "warn":
        console.warn(logMessage, logData);
        break;
      case "error":
        console.error(logMessage, logData);
        break;
    }
  }

  /**
   * Enregistre un événement de cycle de vie de connexion
   */
  public logConnectionEvent(
    connectionId: string,
    event: ConnectionLogEntry["event"],
    context?: string,
    duration?: number,
    metadata?: Record<string, any>,
  ): void {
    if (!this.config.enableConnectionLifecycleLogging) return;

    const entry: ConnectionLogEntry = {
      connectionId,
      timestamp: new Date().toISOString(),
      event,
      ...(context !== undefined ? { context } : {}),
      ...(duration !== undefined ? { duration } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    this.connectionLogs.push(entry);
    this.trimLogs(this.connectionLogs);

    // Log selon le niveau d'événement
    const logLevel =
      event === "error" ? "error" : event === "timeout" ? "warn" : "debug";
    this.log(logLevel, `Connection ${event}`, {
      connectionId: connectionId.substring(0, 8),
      context,
      duration,
      metadata,
    });

    // Vérifier les seuils d'alerte
    if (
      event === "timeout" ||
      (event === "acquired" &&
        duration &&
        duration > this.config.warningThresholds.averageWaitTimeMs)
    ) {
      this.log("warn", `Connection acquisition took longer than expected`, {
        connectionId: connectionId.substring(0, 8),
        duration,
        _threshold: this.config.warningThresholds.averageWaitTimeMs,
      });
    }
  }

  /**
   * Enregistre un événement de verrou de base de données
   */
  public logDatabaseLock(
    lockType: DatabaseLockLogEntry["lockType"],
    context: string,
    operation: string,
    duration: number,
    retryAttempt: number,
    resolved: boolean,
    connectionId?: string,
    error?: string,
  ): void {
    if (!this.config.enableLockLogging) return;

    const entry: DatabaseLockLogEntry = {
      timestamp: new Date().toISOString(),
      lockType,
      ...(connectionId !== undefined ? { connectionId } : {}),
      context,
      operation,
      duration,
      retryAttempt,
      resolved,
      ...(error !== undefined ? { error } : {}),
    };

    this.lockLogs.push(entry);
    this.trimLogs(this.lockLogs);

    const logLevel = resolved ? "warn" : "error";
    this.log(logLevel, `Database lock detected`, {
      lockType,
      connectionId: connectionId?.substring(0, 8),
      context,
      operation,
      duration,
      retryAttempt,
      resolved,
      error,
    });

    // Alerte si le verrou dure trop longtemps
    if (duration > this.config.warningThresholds.lockDurationMs) {
      this.log("error", `Database lock duration exceeded threshold`, {
        lockType,
        duration,
        _threshold: this.config.warningThresholds.lockDurationMs,
        context,
        operation,
      });
    }
  }

  /**
   * Enregistre une erreur de base de données
   */
  public logDatabaseError(
    connectionId: string | undefined,
    context: string,
    operation: string,
    error: any,
    retryAttempt: number,
    duration: number,
    metadata?: Record<string, any>,
  ): void {
    if (!this.config.enableErrorLogging) return;

    const errorId = randomUUID();
    const entry: DatabaseErrorLogEntry = {
      timestamp: new Date().toISOString(),
      errorId,
      ...(connectionId !== undefined ? { connectionId } : {}),
      context,
      operation,
      errorType: error?.constructor?.name || "Unknown",
      ...(error?.code !== undefined ? { errorCode: error?.code } : {}),
      errorMessage: error?.message || String(error),
      ...(error?.stack !== undefined ? { stackTrace: error?.stack } : {}),
      retryAttempt,
      duration,
      ...(metadata !== undefined ? { metadata } : {}),
    };

    this.errorLogs.push(entry);
    this.trimLogs(this.errorLogs);

    this.log("error", `Database operation failed`, {
      errorId,
      connectionId: connectionId?.substring(0, 8),
      context,
      operation,
      errorType: entry.errorType,
      errorCode: entry.errorCode,
      errorMessage: entry.errorMessage,
      retryAttempt,
      duration,
      metadata,
    });
  }

  /**
   * Enregistre les données de monitoring des connexions
   */
  public logConnectionMonitoring(
    totalConnections: number,
    activeConnections: number,
    idleConnections: number,
    waitingRequests: number,
    averageWaitTime: number,
  ): void {
    if (!this.config.enablePerformanceMonitoring) return;

    const connectionUtilization =
      totalConnections > 0 ? (activeConnections / totalConnections) * 100 : 0;

    const entry: ConnectionMonitoringData = {
      timestamp: new Date().toISOString(),
      totalConnections,
      activeConnections,
      idleConnections,
      waitingRequests,
      averageWaitTime,
      connectionUtilization,
    };

    this.monitoringData.push(entry);
    this.trimLogs(this.monitoringData);

    // Log seulement si debug activé ou si seuils dépassés
    const shouldLog =
      (process.env as any)["DB_DEBUG"] === "true" ||
      connectionUtilization >
        this.config.warningThresholds.activeConnectionsPercent ||
      averageWaitTime > this.config.warningThresholds.averageWaitTimeMs ||
      waitingRequests > 0;

    if (shouldLog) {
      const logLevel =
        connectionUtilization >
        this.config.warningThresholds.activeConnectionsPercent
          ? "warn"
          : "debug";
      this.log(logLevel, `Connection pool status`, {
        totalConnections,
        activeConnections,
        idleConnections,
        waitingRequests,
        averageWaitTime,
        connectionUtilization: `${connectionUtilization.toFixed(1)}%`,
      });
    }

    // Alertes spécifiques
    if (
      connectionUtilization >
      this.config.warningThresholds.activeConnectionsPercent
    ) {
      this.log("warn", `High connection utilization detected`, {
        utilization: `${connectionUtilization.toFixed(1)}%`,
        _threshold: `${this.config.warningThresholds.activeConnectionsPercent}%`,
        activeConnections,
        totalConnections,
      });
    }

    if (waitingRequests > 0) {
      this.log("warn", `Requests waiting for connections`, {
        waitingRequests,
        averageWaitTime,
        activeConnections,
        totalConnections,
      });
    }
  }

  /**
   * Démarre le suivi d'une opération
   */
  public startOperation(
    operationId: string,
    context: string,
    operation: string,
  ): void {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      context,
      operation,
    });
  }

  /**
   * Termine le suivi d'une opération
   */
  public endOperation(operationId: string): number {
    const operationData = this.activeOperations.get(operationId);
    if (!operationData) return 0;

    const duration = Date.now() - operationData.startTime;
    this.activeOperations.delete(operationId);
    return duration;
  }

  /**
   * Obtient les statistiques de logging
   */
  public getLoggingStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Erreurs dans la dernière heure
    const recentErrors = this.errorLogs.filter(
      (log) => new Date(log.timestamp).getTime() > oneHourAgo,
    );

    // Verrous dans la dernière heure
    const recentLocks = this.lockLogs.filter(
      (log) => new Date(log.timestamp).getTime() > oneHourAgo,
    );

    // Connexions actives dans la dernière heure
    const recentConnections = this.connectionLogs.filter(
      (log) => new Date(log.timestamp).getTime() > oneHourAgo,
    );

    // Calcul du taux d'erreur
    const totalOperations = recentConnections.length;
    const errorRate =
      totalOperations > 0 ? (recentErrors.length / totalOperations) * 100 : 0;

    return {
      totalLogs: {
        connections: this.connectionLogs.length,
        locks: this.lockLogs.length,
        errors: this.errorLogs.length,
        monitoring: this.monitoringData.length,
      },
      recentLogsCount:
        recentErrors.length + recentLocks.length + recentConnections.length,
      recentActivity: {
        errors: recentErrors.length,
        locks: recentLocks.length,
        connections: recentConnections.length,
        errorRate: `${errorRate.toFixed(2)}%`,
      },
      activeOperations: this.activeOperations.size,
      config: this.config,
    };
  }

  /**
   * Obtient les logs récents par type
   */
  public getRecentLogs(
    type: "connections" | "locks" | "errors" | "monitoring",
    limit: number = 50,
  ) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    switch (type) {
      case "connections":
        return this.connectionLogs
          .filter((log) => new Date(log.timestamp).getTime() > oneHourAgo)
          .slice(-limit);
      case "locks":
        return this.lockLogs
          .filter((log) => new Date(log.timestamp).getTime() > oneHourAgo)
          .slice(-limit);
      case "errors":
        return this.errorLogs
          .filter((log) => new Date(log.timestamp).getTime() > oneHourAgo)
          .slice(-limit);
      case "monitoring":
        return this.monitoringData
          .filter((log) => new Date(log.timestamp).getTime() > oneHourAgo)
          .slice(-limit);
      default:
        return [];
    }
  }

  /**
   * Nettoie les anciens logs pour éviter la surcharge mémoire
   */
  private trimLogs<T>(logs: T[]): void {
    if (logs.length > this.config.maxLogEntries) {
      logs.splice(0, logs.length - this.config.maxLogEntries);
    }
  }

  /**
   * Réinitialise tous les logs (pour les tests)
   */
  public clearLogs(): void {
    this.connectionLogs.length = 0;
    this.lockLogs.length = 0;
    this.errorLogs.length = 0;
    this.monitoringData.length = 0;
    this.activeOperations.clear();
    this.log("info", "All logs cleared");
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(config: Partial<DatabaseLoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.log("info", "Logger configuration updated", { config: this.config });
  }
}

// Export de l'instance singleton
export const databaseLogger = DatabaseLogger.getInstance();
