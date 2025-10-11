import { EventEmitter } from 'events';

/**
 * Interface pour les métriques de performance
 */
export interface QueryMetric {
  id: string;
  operation: string;
  service: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  query?: string;
  params?: any[];
  resultCount?: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'high_error_rate' | 'memory_usage' | 'connection_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metric?: QueryMetric;
  context?: Record<string, any>;
}

export interface PerformanceStats {
  totalQueries: number;
  averageResponseTime: number;
  slowQueryCount: number;
  errorRate: number;
  queriesPerSecond: number;
  topSlowQueries: QueryMetric[];
  errorDistribution: Record<string, number>;
  serviceStats: Record<string, {
    count: number;
    avgDuration: number;
    errorCount: number;
  }>;
}

/**
 * Moniteur de performance pour les requêtes de base de données
 */
export class DatabasePerformanceMonitor extends EventEmitter {
  private metrics: QueryMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds = {
    slowQueryThreshold: 1000, // 1 seconde
    errorRateThreshold: 0.05, // 5%
    maxMetrics: 10000, // Limite pour éviter la fuite mémoire
    alertCooldown: 60000, // 1 minute entre alertes du même type
  };
  private lastAlerts = new Map<string, number>();

  constructor() {
    super();
    
    // Nettoyage périodique des métriques anciennes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  /**
   * Enregistre une métrique de requête
   */
  recordQuery(metric: Omit<QueryMetric, 'id' | 'timestamp'>): void {
    const fullMetric: QueryMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);
    
    // Analyser pour détecter des problèmes
    this.analyzeMetric(fullMetric);
    
    // Nettoyer si trop de métriques
    if (this.metrics.length > this.thresholds.maxMetrics) {
      this.metrics = this.metrics.slice(-this.thresholds.maxMetrics / 2);
    }

    this.emit('metric', fullMetric);
  }

  /**
   * Analyse une métrique pour détecter des problèmes de performance
   */
  private analyzeMetric(metric: QueryMetric): void {
    // Requête lente
    if (metric.duration > this.thresholds.slowQueryThreshold) {
      this.createAlert({
        type: 'slow_query',
        severity: metric.duration > 5000 ? 'high' : 'medium',
        message: `Slow query detected: ${metric.operation} took ${metric.duration}ms`,
        metric,
        context: {
          service: metric.service,
          duration: metric.duration,
        },
      });
    }

    // Taux d'erreur élevé (calculé sur les 100 dernières requêtes)
    const recentMetrics = this.metrics.slice(-100);
    const errorRate = recentMetrics.filter(m => !m.success).length / recentMetrics.length;
    
    if (errorRate > this.thresholds.errorRateThreshold && recentMetrics.length >= 50) {
      this.createAlert({
        type: 'high_error_rate',
        severity: errorRate > 0.2 ? 'critical' : 'high',
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}% in recent queries`,
        context: {
          errorRate,
          sampleSize: recentMetrics.length,
        },
      });
    }
  }

  /**
   * Crée une alerte avec cooldown
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alertKey = `${alertData.type}_${alertData.severity}`;
    const now = Date.now();
    const lastAlert = this.lastAlerts.get(alertKey) || 0;
    
    if (now - lastAlert < this.thresholds.alertCooldown) {
      return; // Cooldown actif
    }
    
    const alert: PerformanceAlert = {
      ...alertData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    this.alerts.push(alert);
    this.lastAlerts.set(alertKey, now);
    
    // Garder seulement les 1000 dernières alertes
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
    
    this.emit('alert', alert);
    
    // Log selon la sévérité
    const logLevel = {
      'low': console.log,
      'medium': console.warn,
      'high': console.warn,
      'critical': console.error,
    }[alert.severity] || console.log;
    
    logLevel(`[DB Performance Alert] ${alert.message}`);
  }

  /**
   * Obtient les statistiques de performance
   */
  getPerformanceStats(timeWindow?: number): PerformanceStats {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp.getTime() > cutoff
    );

    if (relevantMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        slowQueryCount: 0,
        errorRate: 0,
        queriesPerSecond: 0,
        topSlowQueries: [],
        errorDistribution: {},
        serviceStats: {},
      };
    }

    const totalQueries = relevantMetrics.length;
    const successfulQueries = relevantMetrics.filter(m => m.success);
    const errorCount = totalQueries - successfulQueries.length;
    const errorRate = errorCount / totalQueries;
    
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageResponseTime = totalDuration / totalQueries;
    
    const slowQueryCount = relevantMetrics.filter(
      m => m.duration > this.thresholds.slowQueryThreshold
    ).length;
    
    // QPS (requêtes par seconde)
    const timeSpanSeconds = timeWindow ? timeWindow / 1000 :
      relevantMetrics.length > 0 ?
        ((relevantMetrics[relevantMetrics.length - 1]?.timestamp?.getTime() || Date.now()) -
         (relevantMetrics[0]?.timestamp?.getTime() || Date.now())) / 1000 : 0;
    const queriesPerSecond = timeSpanSeconds > 0 ? totalQueries / timeSpanSeconds : 0;
    
    // Top requêtes lentes
    const topSlowQueries = [...relevantMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // Distribution des erreurs
    const errorDistribution: Record<string, number> = {};
    relevantMetrics
      .filter(m => !m.success && m.error)
      .forEach(m => {
        const errorType = m.error!.split(':')[0] || 'Unknown';
        errorDistribution[errorType] = (errorDistribution[errorType] || 0) + 1;
      });
    
    // Stats par service
    const serviceStats: Record<string, { count: number; avgDuration: number; errorCount: number }> = {};
    relevantMetrics.forEach(m => {
      if (!serviceStats[m.service]) {
        serviceStats[m.service] = { count: 0, avgDuration: 0, errorCount: 0 };
      }
      
      const stats = serviceStats[m.service] || { count: 0, avgDuration: 0, errorCount: 0 };
      stats.count++;
      stats.avgDuration = (stats.avgDuration * (stats.count - 1) + m.duration) / stats.count;
      if (!m.success) stats.errorCount++;
    });

    return {
      totalQueries,
      averageResponseTime,
      slowQueryCount,
      errorRate,
      queriesPerSecond,
      topSlowQueries,
      errorDistribution,
      serviceStats,
    };
  }

  /**
   * Obtient les alertes récentes
   */
  getRecentAlerts(timeWindow = 24 * 60 * 60 * 1000): PerformanceAlert[] {
    const cutoff = Date.now() - timeWindow;
    return this.alerts.filter(alert => 
      alert.timestamp.getTime() > cutoff
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Configure les seuils de performance
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Nettoie les métriques anciennes
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => 
      m.timestamp.getTime() > oneHourAgo
    );
    
    if (this.metrics.length !== initialCount) {
      console.log(`[DB Performance Monitor] Cleaned up ${initialCount - this.metrics.length} old metrics`);
    }
  }

  /**
   * Exporte les métriques pour analyse externe
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'service', 'operation', 'duration', 'success', 'error'];
      const rows = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.service,
        m.operation,
        m.duration.toString(),
        m.success.toString(),
        m.error || '',
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Génère un rapport de santé de la base de données
   */
  generateHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    summary: string;
    metrics: PerformanceStats;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const stats = this.getPerformanceStats(60 * 60 * 1000); // Dernière heure
    const recentAlerts = this.getRecentAlerts(60 * 60 * 1000);
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const recommendations: string[] = [];
    
    // Analyser la santé
    if (stats.errorRate > 0.1) {
      status = 'critical';
      recommendations.push('Investigate high error rate immediately');
    } else if (stats.errorRate > 0.05) {
      status = 'warning';
      recommendations.push('Monitor error rate closely');
    }
    
    if (stats.averageResponseTime > 2000) {
      status = status === 'healthy' ? 'warning' : status;
      recommendations.push('Optimize slow queries');
    }
    
    if (recentAlerts.some(a => a.severity === 'critical')) {
      status = 'critical';
      recommendations.push('Address critical alerts immediately');
    }
    
    const summary = `Database ${status}. ${stats.totalQueries} queries in last hour, ` +
      `${stats.averageResponseTime.toFixed(0)}ms avg response time, ` +
      `${(stats.errorRate * 100).toFixed(1)}% error rate.`;
    
    return {
      status,
      summary,
      metrics: stats,
      alerts: recentAlerts,
      recommendations,
    };
  }
}

// Instance singleton
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();