/**
 * Audit Logger Service
 * Comprehensive logging for user actions and system events
 */

import {
  getLogger,
} from "@/lib/utils/logging";
import { v4 as uuidv4 } from "uuid";

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface UserAction {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type:
  | "login"
  | "logout"
  | "failed_login"
  | "password_change"
  | "permission_denied"
  | "suspicious_activity";
  severity: "low" | "medium" | "high" | "critical";
  details: Record<string, any>;
}

export interface PerformanceEvent {
  operation: string;
  duration: number;
  threshold: number;
  metadata?: Record<string, any>;
}

class AuditLoggerService {
  private logger = getLogger;

  /**
   * Log user action with full audit trail
   */
  async logUserAction(
    userId: string,
    action: UserAction,
    context: {
      sessionId?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    } = {},
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...(userId && { userId }),
      ...(context.sessionId && { sessionId: context.sessionId }),
      action: action.action,
      resource: action.resource,
      ...(action.resourceId && { resourceId: action.resourceId }),
      ...(action.details && { details: action.details }),
      ...(context.ip && { ip: context.ip }),
      ...(context.userAgent && { userAgent: context.userAgent }),
      success: true,
    };

    this.logger.info(`User action: ${action.action}`, {
      auditId: auditEvent.id,
      userId,
      resource: action.resource,
      resourceId: action.resourceId,
      details: action.details,
      sessionId: context.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    // Store in audit trail (could be database, file, or external service)
    await this.storeAuditEvent(auditEvent);
  }

  /**
   * Log failed user action
   */
  async logFailedUserAction(
    userId: string | undefined,
    action: UserAction,
    error: Error,
    context: {
      sessionId?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    } = {},
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...(userId && { userId }),
      ...(context.sessionId && { sessionId: context.sessionId }),
      action: action.action,
      resource: action.resource,
      ...(action.resourceId && { resourceId: action.resourceId }),
      ...(action.details && { details: action.details }),
      ...(context.ip && { ip: context.ip }),
      ...(context.userAgent && { userAgent: context.userAgent }),
      success: false,
      error: error.message,
    };

    this.logger.error(`User action failed: ${action.action}`, error, {
      auditId: auditEvent.id,
      userId,
      resource: action.resource,
      resourceId: action.resourceId,
      sessionId: context.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    await this.storeAuditEvent(auditEvent);
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    event: SecurityEvent,
    context: {
      userId?: string;
      sessionId?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    } = {},
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...(context.userId && { userId: context.userId }),
      ...(context.sessionId && { sessionId: context.sessionId }),
      action: `SECURITY_${event.type.toUpperCase()}`,
      resource: "security",
      details: {
        ...event.details,
        severity: event.severity,
      },
      ...(context.ip && { ip: context.ip }),
      ...(context.userAgent && { userAgent: context.userAgent }),
      success: true,
    };

    const logLevel = this.getLogLevelForSeverity(event.severity);

    this.logger[logLevel](`Security event: ${event.type}`, {
      auditId: auditEvent.id,
      type: event.type,
      severity: event.severity,
      details: event.details,
      userId: context.userId,
      sessionId: context.sessionId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });

    await this.storeAuditEvent(auditEvent);

    // Alert on high severity events
    if (event.severity === "critical" || event.severity === "high") {
      await this.alertSecurityTeam(auditEvent);
    }
  }

  /**
   * Log performance event
   */
  async logPerformanceEvent(
    event: PerformanceEvent,
    context: {
      userId?: string;
      sessionId?: string;
      requestId?: string;
    } = {},
  ): Promise<void> {
    const isSlowOperation = event.duration > event.threshold;

    if (isSlowOperation) {
      const auditEvent: AuditEvent = {
        id: uuidv4(),
        timestamp: new Date(),
        ...(context.userId && { userId: context.userId }),
        ...(context.sessionId && { sessionId: context.sessionId }),
        action: "PERFORMANCE_SLOW_OPERATION",
        resource: "performance",
        details: {
          operation: event.operation,
          duration: event.duration,
          _threshold: event.threshold,
          ...event.metadata,
        },
        success: true,
        duration: event.duration,
      };

      this.logger.warn(
        `Slow operation detected: ${event.operation}`,
        {
          auditId: auditEvent.id,
          operation: event.operation,
          duration: event.duration,
          _threshold: event.threshold,
          metadata: event.metadata,
          userId: context.userId,
          sessionId: context.sessionId,
          requestId: context.requestId,
        },
      );

      await this.storeAuditEvent(auditEvent);
    } else {
      this.logger.info(`Performance: ${event.operation}`, {
        threshold: event.threshold,
        metadata: event.metadata,
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(
    action: string,
    details: Record<string, any>,
    success: boolean = true,
    error?: Error,
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      action: `SYSTEM_${action.toUpperCase()}`,
      resource: "system",
      details,
      success,
      ...(error?.message && { error: error.message }),
    };

    if (success) {
      this.logger.info(`System event: ${action}`, {
        auditId: auditEvent.id,
        details,
      });
    } else {
      this.logger.error(`System event failed: ${action}`, error, {
        auditId: auditEvent.id,
        details,
      });
    }

    await this.storeAuditEvent(auditEvent);
  }

  /**
   * Get audit events for a user
   */
  async getUserAuditTrail(
    _userId: string,
    _options: {
      startDate?: Date;
      endDate?: Date;
      actions?: string[];
      limit?: number;
    } = {},
  ): Promise<AuditEvent[]> {
    // This would typically query a database
    // For now, return empty array
    return [];
  }

  /**
   * Get security events
   */
  async getSecurityEvents(
    _options: {
      severity?: SecurityEvent["severity"];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {},
  ): Promise<AuditEvent[]> {
    // This would typically query a database
    return [];
  }

  /**
   * Store audit event (implement based on your storage strategy)
   */
  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    // This could store to:
    // - Database table
    // - File system
    // - External audit service
    // - Message queue for processing

    // For now, just log to file through Winston
    this.logger.info("Audit event stored", {
      auditId: event.id,
      action: event.action,
      resource: event.resource,
      userId: event.userId,
      success: event.success,
    });
  }

  /**
   * Get log level based on security severity
   */
  private getLogLevelForSeverity(
    severity: SecurityEvent["severity"],
  ): "error" | "warn" | "info" {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warn";
      case "low":
      default:
        return "info";
    }
  }

  /**
   * Alert security team for critical events
   */
  private async alertSecurityTeam(event: AuditEvent): Promise<void> {
    // This could:
    // - Send email alerts
    // - Post to Slack/Teams
    // - Create tickets in JIRA
    // - Send to SIEM system

    this.logger.error("SECURITY ALERT", {
      auditId: event.id,
      action: event.action,
      userId: event.userId,
      details: event.details,
      timestamp: event.timestamp,
    });
  }
}

// Singleton instance
export const auditLogger = new AuditLoggerService();

// Convenience functions for common audit operations
export const auditUserAction = auditLogger.logUserAction.bind(auditLogger);
export const auditFailedUserAction =
  auditLogger.logFailedUserAction.bind(auditLogger);
export const auditSecurityEvent =
  auditLogger.logSecurityEvent.bind(auditLogger);
export const auditPerformanceEvent =
  auditLogger.logPerformanceEvent.bind(auditLogger);
export const auditSystemEvent = auditLogger.logSystemEvent.bind(auditLogger);

// Decorator for automatic audit logging
export function withAuditLogging<T extends any[], R>(
  action: string,
  resource: string,
  getUserId: (...args: T) => string | undefined = () => undefined,
) {
  return function (
    _target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const userId = getUserId(...args);
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        await auditUserAction(userId || "system", {
          action,
          resource,
          details: {
            method: propertyName,
            duration,
            success: true,
          },
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        await auditFailedUserAction(
          userId,
          {
            action,
            resource,
            details: {
              method: propertyName,
              duration,
              success: false,
            },
          },
          error as Error,
        );

        throw error;
      }
    };

    return descriptor;
  };
}
