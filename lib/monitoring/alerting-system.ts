/**
 * Alerting System
 *
 * This module provides comprehensive alerting for system errors,
 * performance degradation, and deployment issues.
 *
 * Requirements: 9.4, 9.5
 */

import { getLogger } from "../utils/logging/logger";
// import { configService } from "../config/config-service";
import type { PerformanceAlert } from "./performance-monitor";
import type { SystemHealthStatus } from "./health-check";

// ============================================================================
// ALERT TYPES AND INTERFACES
// ============================================================================

export interface Alert {
  id: string;
  type: "system" | "performance" | "security" | "deployment";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, any>;
  actions: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  type: "url" | "command" | "api";
  target: string;
  description?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertActionConfig[];
  cooldown: number; // minutes
  lastTriggered?: string;
}

export interface AlertCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "ne" | "gte" | "lte";
  threshold: number;
  duration?: number; // seconds
}

export interface AlertActionConfig {
  type: "log" | "email" | "webhook" | "console";
  config: Record<string, any>;
  enabled: boolean;
}

// ============================================================================
// ALERTING SERVICE
// ============================================================================

export class AlertingService {
  private static instance: AlertingService;
  private alerts: Alert[] = [];
  // private _rules: AlertRule[] = []; // TODO: implement rules functionality
  private logger: ReturnType<typeof getLogger>;

  private constructor() {
    this.logger = getLogger("AlertingService");
    this.initializeDefaultRules();
  }

  public static getInstance(): AlertingService {
    if (!AlertingService.instance) {
      AlertingService.instance = new AlertingService();
    }
    return AlertingService.instance;
  }

  /**
   * Create and process a new alert
   */
  async createAlert(
    type: Alert["type"],
    severity: Alert["severity"],
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      source,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...(metadata && { metadata }),
      actions: this.generateAlertActions(type, severity, metadata),
    };

    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    // Process alert actions
    await this.processAlertActions(alert);

    this.logger.warn("Alert created", {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      source: alert.source,
    });

    return alert;
  }

  /**
   * Process health check results and create alerts if needed
   */
  async processHealthCheckResults(
    healthStatus: SystemHealthStatus,
  ): Promise<void> {
    // Create alerts for unhealthy checks
    for (const check of healthStatus.checks) {
      if (check.status === "unhealthy") {
        await this.createAlert(
          "system",
          "high",
          `Health Check Failed: ${check.name}`,
          check.message,
          "health-check",
          {
            checkName: check.name,
            duration: check.duration,
            metadata: check.metadata,
          },
        );
      } else if (check.status === "degraded") {
        await this.createAlert(
          "system",
          "medium",
          `Health Check Degraded: ${check.name}`,
          check.message,
          "health-check",
          {
            checkName: check.name,
            duration: check.duration,
            metadata: check.metadata,
          },
        );
      }
    }

    // Create system-wide alert if overall status is unhealthy
    if (healthStatus.status === "unhealthy") {
      await this.createAlert(
        "system",
        "critical",
        "System Health Critical",
        `System health is critical with ${healthStatus.summary.unhealthy} failed checks`,
        "health-check",
        {
          summary: healthStatus.summary,
          failedChecks: healthStatus.checks
            .filter((c) => c.status === "unhealthy")
            .map((c) => c.name),
        },
      );
    }
  }

  /**
   * Process performance alerts
   */
  async processPerformanceAlert(perfAlert: PerformanceAlert): Promise<void> {
    const severity = perfAlert.type === "critical" ? "critical" : "medium";

    await this.createAlert(
      "performance",
      severity,
      `Performance Alert: ${perfAlert.metric}`,
      perfAlert.message,
      "performance-monitor",
      {
        metric: perfAlert.metric,
        threshold: perfAlert.threshold,
        currentValue: perfAlert.currentValue,
        performanceAlertId: perfAlert.id,
      },
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.find((a) => a.id === alertId);

    if (!alert) {
      return false;
    }

    if (alert.resolved) {
      return true;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    if (resolvedBy) {
      (alert as any).resolvedBy = resolvedBy;
    }

    this.logger.info("Alert resolved", {
      alertId: alert.id,
      resolvedBy,
      duration: Date.now() - new Date(alert.timestamp).getTime(),
    });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get alerts by criteria
   */
  getAlerts(criteria?: {
    type?: Alert["type"];
    severity?: Alert["severity"];
    resolved?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (criteria?.type) {
      filtered = filtered.filter((a) => a.type === criteria.type);
    }

    if (criteria?.severity) {
      filtered = filtered.filter((a) => a.severity === criteria.severity);
    }

    if (criteria?.resolved !== undefined) {
      filtered = filtered.filter((a) => a.resolved === criteria.resolved);
    }

    // Sort by timestamp (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    if (criteria?.limit) {
      filtered = filtered.slice(0, criteria.limit);
    }

    return filtered;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeWindow?: number): any {
    const windowStart = timeWindow ? Date.now() - timeWindow : 0;
    const windowAlerts = this.alerts.filter((alert) => {
      const alertTime = new Date(alert.timestamp).getTime();
      return alertTime >= windowStart;
    });

    const stats = {
      total: windowAlerts.length,
      active: windowAlerts.filter((a) => !a.resolved).length,
      resolved: windowAlerts.filter((a) => a.resolved).length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      averageResolutionTime: 0,
    };

    // Count by type and severity
    windowAlerts.forEach((alert) => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.bySeverity[alert.severity] =
        (stats.bySeverity[alert.severity] || 0) + 1;
    });

    // Calculate average resolution time
    const resolvedAlerts = windowAlerts.filter(
      (a) => a.resolved && a.resolvedAt,
    );
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce((sum, alert) => {
        const created = new Date(alert.timestamp).getTime();
        const resolved = new Date(alert.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);
      stats.averageResolutionTime = totalResolutionTime / resolvedAlerts.length;
    }

    return stats;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertActions(
    type: Alert["type"],
    severity: Alert["severity"],
    _metadata?: Record<string, any>,
  ): AlertAction[] {
    const actions: AlertAction[] = [];

    // Add common actions based on type
    switch (type) {
      case "system":
        actions.push({
          id: "view-health",
          label: "View Health Status",
          type: "url",
          target: "/api/health",
          description: "Check current system health status",
        });
        break;

      case "performance":
        actions.push({
          id: "view-metrics",
          label: "View Performance Metrics",
          type: "url",
          target: "/api/metrics",
          description: "Check current performance metrics",
        });
        break;

      case "deployment":
        actions.push({
          id: "view-deployment",
          label: "View Deployment Status",
          type: "url",
          target: "/api/deployment/status",
          description: "Check deployment status and logs",
        });
        break;
    }

    // Add severity-specific actions
    if (severity === "critical") {
      actions.push({
        id: "emergency-contact",
        label: "Contact Emergency Team",
        type: "url",
        target: "mailto:emergency@logistix.com",
        description: "Contact the emergency response team",
      });
    }

    return actions;
  }

  private async processAlertActions(alert: Alert): Promise<void> {
    // Log alert
    this.logger.warn(`[ALERT] ${alert.title}`, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      source: alert.source,
      metadata: alert.metadata,
    });

    // Console output for critical alerts
    if (alert.severity === "critical") {
      console.error(`🚨 CRITICAL ALERT: ${alert.title}`);
      console.error(`   Message: ${alert.message}`);
      console.error(`   Source: ${alert.source}`);
      console.error(`   Time: ${alert.timestamp}`);
      console.error(`   Alert ID: ${alert.id}`);
    }

    // Additional actions could be implemented here:
    // - Send emails
    // - Call webhooks
    // - Send to monitoring systems
    // - Trigger automated responses
  }

  private initializeDefaultRules(): void {
    // TODO: implement rules functionality
    console.log("Alert rules initialization skipped - feature not yet implemented");
  }
}

export default AlertingService;
