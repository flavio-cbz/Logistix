export interface HealthCheckResult {
    name: string;
    status: "healthy" | "unhealthy" | "degraded";
    message: string;
    duration: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface SystemHealthStatus {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: HealthCheckResult[];
    summary: {
        total: number;
        healthy: number;
        unhealthy: number;
        degraded: number;
    };
}

export interface HealthCheckConfig {
    timeout: number;
    retries: number;
    interval: number;
    enabled: boolean;
}
