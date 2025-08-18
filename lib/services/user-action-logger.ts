/**
 * User Action Logger Service
 * Comprehensive logging of user interactions for audit and analytics
 */

import { auditLogger, auditUserAction, auditFailedUserAction } from '@/lib/services/audit-logger';
import { performanceMetrics, recordOperationDuration } from '@/lib/services/performance-metrics';
import { trackError } from '@/lib/services/error-tracking';
import { getLogger } from '@/lib/utils/logging';
import { v4 as uuidv4 } from 'uuid';

interface UserActionContext {
  userId: string;
  sessionId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

interface ActionDetails {
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

interface UserSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  actions: ActionDetails[];
  ip?: string;
  userAgent?: string;
}

class UserActionLoggerService {
  private logger = getLogger('USER_ACTION_LOGGER');
  private activeSessions = new Map<string, UserSession>();
  private recentActions: Array<{ context: UserActionContext; details: ActionDetails }> = [];
  private maxRecentActions = 5000;

  /**
   * Log a successful user action
   */
  async logUserAction(
    context: UserActionContext,
    details: ActionDetails
  ): Promise<void> {
    const actionId = uuidv4();
    const timestamp = new Date();

    // Update session tracking
    this.updateUserSession(context, details);

    // Store in recent actions
    this.recentActions.push({ context, details });
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions = this.recentActions.slice(-this.maxRecentActions);
    }

    // Log to audit system
    await auditUserAction(
      context.userId,
      {
        action: details.action,
        resource: details.resource,
        resourceId: details.resourceId,
        details: {
          ...details.metadata,
          method: details.method,
          url: details.url,
          statusCode: details.statusCode,
          duration: details.duration,
          actionId,
          timestamp: timestamp.toISOString()
        }
      },
      {
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    );

    // Record performance metrics
    if (details.duration) {
      recordOperationDuration(
        `user_action_${details.action}`,
        details.duration,
        {
          userId: context.userId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          metadata: {
            resource: details.resource,
            success: details.success,
            statusCode: details.statusCode
          }
        }
      );
    }

    // Log detailed action information
    this.logger.info(`User action: ${details.action} on ${details.resource}`, {
      actionId,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: details.action,
      resource: details.resource,
      resourceId: details.resourceId,
      method: details.method,
      url: details.url,
      statusCode: details.statusCode,
      duration: details.duration,
      success: details.success,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: timestamp.toISOString(),
      metadata: details.metadata
    });

    // Check for suspicious patterns
    await this.checkForSuspiciousActivity(context, details);
  }

  /**
   * Log a failed user action
   */
  async logFailedUserAction(
    context: UserActionContext,
    details: ActionDetails,
    error: Error
  ): Promise<void> {
    const actionId = uuidv4();
    const timestamp = new Date();

    // Update session tracking
    this.updateUserSession(context, { ...details, success: false });

    // Store in recent actions
    this.recentActions.push({ 
      context, 
      details: { ...details, success: false }
    });
    if (this.recentActions.length > this.maxRecentActions) {
      this.recentActions = this.recentActions.slice(-this.maxRecentActions);
    }

    // Log to audit system
    await auditFailedUserAction(
      context.userId,
      {
        action: details.action,
        resource: details.resource,
        resourceId: details.resourceId,
        details: {
          ...details.metadata,
          method: details.method,
          url: details.url,
          statusCode: details.statusCode,
          duration: details.duration,
          actionId,
          timestamp: timestamp.toISOString(),
          error: error.message
        }
      },
      error,
      {
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    );

    // Track the error
    await trackError(error, {
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ip: context.ip,
      userAgent: context.userAgent,
      url: details.url,
      method: details.method
    }, {
      action: details.action,
      resource: details.resource,
      resourceId: details.resourceId,
      userAction: true
    });

    // Record performance metrics for failed actions
    if (details.duration) {
      recordOperationDuration(
        `user_action_${details.action}_failed`,
        details.duration,
        {
          userId: context.userId,
          sessionId: context.sessionId,
          requestId: context.requestId,
          metadata: {
            resource: details.resource,
            success: false,
            statusCode: details.statusCode,
            error: error.message
          }
        }
      );
    }

    // Log detailed error information
    this.logger.error(`User action failed: ${details.action} on ${details.resource}`, error, {
      actionId,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      action: details.action,
      resource: details.resource,
      resourceId: details.resourceId,
      method: details.method,
      url: details.url,
      statusCode: details.statusCode,
      duration: details.duration,
      success: false,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: timestamp.toISOString(),
      metadata: details.metadata,
      error: error.message,
      stack: error.stack
    });

    // Check for suspicious patterns (failed actions might indicate attacks)
    await this.checkForSuspiciousActivity(context, { ...details, success: false });
  }

  /**
   * Log user authentication events
   */
  async logAuthenticationEvent(
    event: 'login' | 'logout' | 'login_attempt' | 'login_failed' | 'session_expired',
    context: UserActionContext,
    details?: {
      reason?: string;
      method?: string;
      provider?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const actionId = uuidv4();
    const timestamp = new Date();

    // Handle session lifecycle
    if (event === 'login' && context.sessionId) {
      this.startUserSession(context);
    } else if (event === 'logout' && context.sessionId) {
      this.endUserSession(context.sessionId);
    }

    // Log authentication event
    await auditLogger.logSecurityEvent(
      {
        type: event === 'login_failed' ? 'failed_login' : 'login',
        severity: event === 'login_failed' ? 'medium' : 'low',
        details: {
          event,
          reason: details?.reason,
          method: details?.method,
          provider: details?.provider,
          actionId,
          timestamp: timestamp.toISOString(),
          ...details?.metadata
        }
      },
      {
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    );

    // Log detailed authentication information
    this.logger.info(`Authentication event: ${event}`, {
      actionId,
      event,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: timestamp.toISOString(),
      reason: details?.reason,
      method: details?.method,
      provider: details?.provider,
      metadata: details?.metadata
    });

    // Record authentication metrics
    performanceMetrics.recordMetric(
      `auth_event_${event}`,
      1,
      'count',
      {
        event,
        method: details?.method || 'unknown',
        provider: details?.provider || 'local'
      },
      {
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId
      }
    );
  }

  /**
   * Log data access events for sensitive operations
   */
  async logDataAccessEvent(
    context: UserActionContext,
    operation: 'read' | 'create' | 'update' | 'delete',
    resource: string,
    resourceId?: string,
    details?: {
      fields?: string[];
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      query?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const actionId = uuidv4();
    const timestamp = new Date();

    // Sanitize sensitive data
    const sanitizedDetails = this.sanitizeDataAccessDetails(details);

    // Log data access event
    await auditUserAction(
      context.userId,
      {
        action: `DATA_${operation.toUpperCase()}`,
        resource,
        resourceId,
        details: {
          operation,
          fields: sanitizedDetails?.fields,
          oldValues: sanitizedDetails?.oldValues,
          newValues: sanitizedDetails?.newValues,
          query: sanitizedDetails?.query,
          actionId,
          timestamp: timestamp.toISOString(),
          dataAccess: true,
          ...sanitizedDetails?.metadata
        }
      },
      {
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        requestId: context.requestId
      }
    );

    // Log detailed data access information
    this.logger.info(`Data access: ${operation} on ${resource}`, {
      actionId,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      operation,
      resource,
      resourceId,
      fields: sanitizedDetails?.fields,
      hasOldValues: !!sanitizedDetails?.oldValues,
      hasNewValues: !!sanitizedDetails?.newValues,
      queryLength: sanitizedDetails?.query?.length,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: timestamp.toISOString(),
      metadata: sanitizedDetails?.metadata
    });

    // Record data access metrics
    performanceMetrics.recordMetric(
      `data_access_${operation}`,
      1,
      'count',
      {
        operation,
        resource,
        hasResourceId: (!!resourceId).toString()
      },
      {
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId
      }
    );
  }

  /**
   * Get user activity summary
   */
  getUserActivitySummary(
    userId: string,
    timeRange: { start: Date; end: Date }
  ): {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    sessionCount: number;
    lastActivity: Date | null;
    suspiciousActivity: boolean;
  } {
    const userActions = this.recentActions.filter(
      ({ context }) => 
        context.userId === userId &&
        context.timestamp >= timeRange.start &&
        context.timestamp <= timeRange.end
    );

    const actionsByType: Record<string, number> = {};
    let successfulActions = 0;
    let failedActions = 0;
    let lastActivity: Date | null = null;

    userActions.forEach(({ context, details }) => {
      actionsByType[details.action] = (actionsByType[details.action] || 0) + 1;
      
      if (details.success) {
        successfulActions++;
      } else {
        failedActions++;
      }

      if (!lastActivity || context.timestamp > lastActivity) {
        lastActivity = context.timestamp;
      }
    });

    const sessionIds = new Set(
      userActions.map(({ context }) => context.sessionId).filter(Boolean)
    );

    return {
      totalActions: userActions.length,
      successfulActions,
      failedActions,
      actionsByType,
      sessionCount: sessionIds.size,
      lastActivity,
      suspiciousActivity: this.hasSuspiciousActivity(userId, timeRange)
    };
  }

  /**
   * Get session information
   */
  getSessionInfo(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId);
  }

  /**
   * Start tracking a user session
   */
  private startUserSession(context: UserActionContext): void {
    if (!context.sessionId) return;

    const session: UserSession = {
      sessionId: context.sessionId,
      userId: context.userId,
      startTime: context.timestamp,
      lastActivity: context.timestamp,
      actions: [],
      ip: context.ip,
      userAgent: context.userAgent
    };

    this.activeSessions.set(context.sessionId, session);

    this.logger.info(`User session started`, {
      sessionId: context.sessionId,
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: context.timestamp.toISOString()
    });
  }

  /**
   * Update user session with new activity
   */
  private updateUserSession(context: UserActionContext, details: ActionDetails): void {
    if (!context.sessionId) return;

    const session = this.activeSessions.get(context.sessionId);
    if (session) {
      session.lastActivity = context.timestamp;
      session.actions.push(details);

      // Keep only recent actions (last 100 per session)
      if (session.actions.length > 100) {
        session.actions = session.actions.slice(-100);
      }
    }
  }

  /**
   * End a user session
   */
  private endUserSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      const duration = Date.now() - session.startTime.getTime();
      
      this.logger.info(`User session ended`, {
        sessionId,
        userId: session.userId,
        duration,
        actionCount: session.actions.length,
        startTime: session.startTime.toISOString(),
        endTime: new Date().toISOString()
      });

      // Record session metrics
      performanceMetrics.recordMetric(
        'user_session_duration',
        duration,
        'ms',
        {
          userId: session.userId,
          actionCount: session.actions.length.toString()
        }
      );

      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkForSuspiciousActivity(
    context: UserActionContext,
    details: ActionDetails
  ): Promise<void> {
    const recentUserActions = this.recentActions
      .filter(({ context: ctx }) => 
        ctx.userId === context.userId &&
        Date.now() - ctx.timestamp.getTime() < 300000 // Last 5 minutes
      );

    // Check for rapid-fire requests (potential bot activity)
    if (recentUserActions.length > 50) {
      await auditLogger.logSecurityEvent(
        {
          type: 'suspicious_activity',
          severity: 'medium',
          details: {
            pattern: 'rapid_requests',
            actionCount: recentUserActions.length,
            timeWindow: '5_minutes',
            currentAction: details.action,
            resource: details.resource
          }
        },
        {
          userId: context.userId,
          sessionId: context.sessionId,
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId
        }
      );
    }

    // Check for multiple failed actions (potential brute force)
    const recentFailures = recentUserActions.filter(({ details: d }) => !d.success);
    if (recentFailures.length > 10) {
      await auditLogger.logSecurityEvent(
        {
          type: 'suspicious_activity',
          severity: 'high',
          details: {
            pattern: 'multiple_failures',
            failureCount: recentFailures.length,
            timeWindow: '5_minutes',
            currentAction: details.action,
            resource: details.resource
          }
        },
        {
          userId: context.userId,
          sessionId: context.sessionId,
          ip: context.ip,
          userAgent: context.userAgent,
          requestId: context.requestId
        }
      );
    }
  }

  /**
   * Check if user has suspicious activity in time range
   */
  private hasSuspiciousActivity(userId: string, timeRange: { start: Date; end: Date }): boolean {
    const userActions = this.recentActions.filter(
      ({ context }) => 
        context.userId === userId &&
        context.timestamp >= timeRange.start &&
        context.timestamp <= timeRange.end
    );

    const failedActions = userActions.filter(({ details }) => !details.success);
    const totalActions = userActions.length;

    // Consider suspicious if more than 30% of actions failed or more than 100 actions in time range
    return (failedActions.length / totalActions > 0.3) || totalActions > 100;
  }

  /**
   * Sanitize data access details to remove sensitive information
   */
  private sanitizeDataAccessDetails(details?: {
    fields?: string[];
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    query?: string;
    metadata?: Record<string, any>;
  }): typeof details {
    if (!details) return undefined;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
      const sanitized = { ...obj };
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    };

    return {
      ...details,
      oldValues: details.oldValues ? sanitizeObject(details.oldValues) : undefined,
      newValues: details.newValues ? sanitizeObject(details.newValues) : undefined,
      query: details.query ? details.query.replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'") : undefined
    };
  }
}

// Singleton instance
export const userActionLogger = new UserActionLoggerService();

// Convenience functions
export const logUserAction = userActionLogger.logUserAction.bind(userActionLogger);
export const logFailedUserAction = userActionLogger.logFailedUserAction.bind(userActionLogger);
export const logAuthenticationEvent = userActionLogger.logAuthenticationEvent.bind(userActionLogger);
export const logDataAccessEvent = userActionLogger.logDataAccessEvent.bind(userActionLogger);