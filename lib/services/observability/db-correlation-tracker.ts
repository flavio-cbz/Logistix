/**
 * Service de Corrélation Base de Données
 * 
 * Permet de tracker et corréler toutes les requêtes SQL avec les requêtes HTTP,
 * facilitant le debugging et l'analyse de performance.
 * 
 * @module DbCorrelationTracker
 */

// (logger removed in stub version)

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

// Minimal stub implementation (original rich implementation temporarily removed during stabilization)
export interface DbQueryCorrelation {
  queryId: string;
  sql: string;
  operation: string;
  startedAt: string;
  success: boolean;
  duration?: number | undefined;
  traceId?: string | undefined;
  requestId?: string | undefined;
  userId?: string | undefined;
  params?: any[] | undefined;
  rowsAffected?: number | undefined;
  completedAt?: string | undefined;
  error?: string | undefined;
}

export interface DbCorrelationStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  avgDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  byOperation: Record<string, number>;
  byTrace: Record<string, number>;
  slowestQuery?: DbQueryCorrelation;
}

export interface DbCorrelationConfig { enabled: boolean }

export class DbCorrelationTracker {
  private queries: DbQueryCorrelation[] = [];
  private config: DbCorrelationConfig = { enabled: false };

  constructor(cfg?: Partial<DbCorrelationConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  startQuery(params: { sql: string; traceId?: string; requestId?: string; userId?: string; params?: any[] }): string {
    if (!this.config.enabled) return '';
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const record: DbQueryCorrelation = {
      queryId: id,
      sql: params.sql,
      operation: this.detectOperation(params.sql),
      startedAt: new Date().toISOString(),
      success: false,
      traceId: params.traceId,
      requestId: params.requestId,
      userId: params.userId,
      params: params.params,
    };
    this.queries.push(record);
    return id;
  }

  endQuery(params: { queryId: string; duration: number; success: boolean; error?: string; rowsAffected?: number }): void {
    if (!this.config.enabled) return;
    const q = this.queries.find(q => q.queryId === params.queryId);
    if (!q) return;
  q.duration = params.duration;
  q.success = params.success;
  if (typeof params.error !== 'undefined') q.error = params.error;
  if (typeof params.rowsAffected !== 'undefined') q.rowsAffected = params.rowsAffected;
    q.completedAt = new Date().toISOString();
  }

  async trackQuery<T>(ctx: { sql: string }, executor: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) return executor();
    const id = this.startQuery({ sql: ctx.sql });
    const start = Date.now();
    try {
      const result = await executor();
      this.endQuery({ queryId: id, duration: Date.now() - start, success: true });
      return result;
    } catch (e) {
      this.endQuery({ queryId: id, duration: Date.now() - start, success: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  trackQuerySync<T>(ctx: { sql: string }, executor: () => T): T {
    if (!this.config.enabled) return executor();
    const id = this.startQuery({ sql: ctx.sql });
    const start = Date.now();
    try {
      const result = executor();
      this.endQuery({ queryId: id, duration: Date.now() - start, success: true });
      return result;
    } catch (e) {
      this.endQuery({ queryId: id, duration: Date.now() - start, success: false, error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  }

  getStats(): DbCorrelationStats {
    return {
      totalQueries: this.queries.length,
      successfulQueries: this.queries.filter(q => q.success).length,
      failedQueries: this.queries.filter(q => !q.success).length,
      avgDuration: 0,
      medianDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      byOperation: {},
      byTrace: {},
    };
  }

  getQueriesByTrace(_t: string): DbQueryCorrelation[] { return []; }
  getSlowQueries(): DbQueryCorrelation[] { return []; }
  getAllQueries(): DbQueryCorrelation[] { return [...this.queries]; }
  reset(): void { this.queries = []; }
  updateConfig(cfg: Partial<DbCorrelationConfig>): void { this.config = { ...this.config, ...cfg }; }

  private detectOperation(sql: string): string {
    const first = sql.trim().split(/\s+/)[0]?.toUpperCase();
    if (["SELECT","INSERT","UPDATE","DELETE"].includes(first || '')) return first as string;
    return 'OTHER';
  }
}

export const dbCorrelationTracker = new DbCorrelationTracker();
