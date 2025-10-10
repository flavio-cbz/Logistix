# Guide de Maintenance - Logistix

## Vue d'ensemble

Ce guide décrit les procédures de maintenance pour l'application Logistix, incluant les tâches de routine, la surveillance du système, et les procédures de dépannage.

## Maintenance Préventive

### Tâches Quotidiennes

#### Surveillance des Logs

```bash
# Vérifier les erreurs récentes
tail -f logs/error.log

# Analyser les performances
grep "duration" logs/combined.log | tail -20

# Vérifier l'utilisation de la base de données
npm run script:db-monitor
```

#### Métriques de Performance

```typescript
// scripts/daily-health-check.ts
import { logger } from '@/lib/shared/utils/logger';
import { DatabaseService } from '@/lib/platform/database';
import { CacheService } from '@/lib/platform/cache';

export async function dailyHealthCheck(): Promise<HealthReport> {
  const report: HealthReport = {
    timestamp: new Date(),
    database: await checkDatabaseHealth(),
    cache: await checkCacheHealth(),
    performance: await checkPerformanceMetrics(),
    errors: await checkRecentErrors(),
  };

  logger.info('Daily health check completed', report);
  return report;
}

async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const db = DatabaseService.getInstance();
  
  return {
    connectionCount: await db.getActiveConnections(),
    queryPerformance: await db.getAverageQueryTime(),
    diskUsage: await db.getDiskUsage(),
    indexEfficiency: await db.getIndexEfficiency(),
  };
}
```

### Tâches Hebdomadaires

#### Nettoyage des Logs

```bash
# Script de rotation des logs
npm run script:log-rotation

# Archivage des anciens logs
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
find logs/ -name "*.gz" -mtime +30 -delete
```

#### Analyse de la Qualité du Code

```bash
# Analyse de la dette technique
npm run lint -- --format=json > reports/lint-report.json

# Analyse de la couverture de tests
npm run test:coverage -- --reporter=json > reports/coverage-report.json

# Analyse des dépendances
npm audit --json > reports/security-audit.json
```### Tâches
 Mensuelles

#### Optimisation de la Base de Données

```sql
-- Analyse des performances des requêtes
EXPLAIN QUERY PLAN SELECT * FROM products WHERE status = 'active';

-- Réindexation si nécessaire
REINDEX products_status_idx;

-- Nettoyage des données obsolètes
DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days');

-- Analyse de l'espace disque
PRAGMA database_list;
PRAGMA page_count;
PRAGMA page_size;
```

#### Mise à Jour des Dépendances

```bash
# Vérifier les mises à jour disponibles
npm outdated

# Mettre à jour les dépendances mineures
npm update

# Tester après mise à jour
npm run test
npm run build
npm run test:e2e
```

## Surveillance du Système

### Métriques Clés à Surveiller

#### Performance de l'Application

```typescript
// lib/monitoring/performance-monitor.ts
export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  errorRate: {
    percentage: number;
    count: number;
  };
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];

  async collectMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      responseTime: await this.getResponseTimeMetrics(),
      throughput: await this.getThroughputMetrics(),
      errorRate: await this.getErrorRateMetrics(),
      resourceUsage: await this.getResourceUsageMetrics(),
    };

    this.metrics.push(metrics);
    return metrics;
  }

  async generateReport(): Promise<PerformanceReport> {
    const recent = this.metrics.slice(-24); // Dernières 24h
    
    return {
      averageResponseTime: this.calculateAverage(recent, 'responseTime.p50'),
      peakThroughput: Math.max(...recent.map(m => m.throughput.requestsPerSecond)),
      errorTrend: this.calculateTrend(recent, 'errorRate.percentage'),
      recommendations: this.generateRecommendations(recent),
    };
  }
}
```

#### Alertes Automatiques

```typescript
// lib/monitoring/alert-system.ts
export class AlertSystem {
  private thresholds = {
    responseTime: 2000, // 2 secondes
    errorRate: 5, // 5%
    cpuUsage: 80, // 80%
    memoryUsage: 85, // 85%
    diskUsage: 90, // 90%
  };

  async checkAlerts(metrics: PerformanceMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];

    if (metrics.responseTime.p95 > this.thresholds.responseTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Response time P95 is ${metrics.responseTime.p95}ms (threshold: ${this.thresholds.responseTime}ms)`,
        timestamp: new Date(),
      });
    }

    if (metrics.errorRate.percentage > this.thresholds.errorRate) {
      alerts.push({
        type: 'error',
        severity: 'critical',
        message: `Error rate is ${metrics.errorRate.percentage}% (threshold: ${this.thresholds.errorRate}%)`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  async sendAlert(alert: Alert): Promise<void> {
    // Envoi par email, Slack, etc.
    logger.error('Alert triggered', alert);
    
    if (alert.severity === 'critical') {
      await this.sendCriticalAlert(alert);
    }
  }
}
```

### Tableaux de Bord

#### Dashboard de Santé du Système

```typescript
// components/admin/system-health-dashboard.tsx
export function SystemHealthDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: fetchSystemMetrics,
    refetchInterval: 30000, // 30 secondes
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Temps de Réponse"
        value={`${metrics?.responseTime.p95}ms`}
        trend={metrics?.responseTimeTrend}
        threshold={2000}
      />
      
      <MetricCard
        title="Taux d'Erreur"
        value={`${metrics?.errorRate.percentage}%`}
        trend={metrics?.errorRateTrend}
        threshold={5}
      />
      
      <MetricCard
        title="Utilisation CPU"
        value={`${metrics?.resourceUsage.cpuUsage}%`}
        trend={metrics?.cpuTrend}
        threshold={80}
      />
      
      <MetricCard
        title="Utilisation Mémoire"
        value={`${metrics?.resourceUsage.memoryUsage}%`}
        trend={metrics?.memoryTrend}
        threshold={85}
      />
    </div>
  );
}
```

## Procédures de Dépannage

### Problèmes Courants

#### Performance Dégradée

**Symptômes:**
- Temps de réponse élevé
- Timeouts fréquents
- Utilisation CPU/mémoire élevée

**Diagnostic:**

```bash
# Analyser les requêtes lentes
npm run script:analyze-slow-queries

# Vérifier l'utilisation des ressources
top -p $(pgrep node)

# Analyser les logs d'erreur
grep -i "timeout\|slow\|performance" logs/error.log
```

**Solutions:**

1. **Optimisation des requêtes:**
```sql
-- Ajouter des index manquants
CREATE INDEX idx_products_status_created ON products(status, created_at);

-- Optimiser les requêtes complexes
EXPLAIN QUERY PLAN SELECT ... FROM ... WHERE ...;
```

2. **Mise en cache:**
```typescript
// Implémenter le cache Redis
const cachedResult = await cacheService.get(cacheKey);
if (!cachedResult) {
  const result = await expensiveOperation();
  await cacheService.set(cacheKey, result, 3600); // 1 heure
  return result;
}
return cachedResult;
```

#### Erreurs de Base de Données

**Symptômes:**
- Erreurs de connexion
- Transactions échouées
- Corruption de données

**Diagnostic:**

```bash
# Vérifier l'intégrité de la base
sqlite3 data/logistix.db "PRAGMA integrity_check;"

# Analyser les verrous
sqlite3 data/logistix.db "PRAGMA lock_status;"

# Vérifier l'espace disque
df -h data/
```

**Solutions:**

1. **Réparation de la base:**
```bash
# Sauvegarde avant réparation
cp data/logistix.db data/logistix.db.backup

# Réparation
sqlite3 data/logistix.db "VACUUM;"
sqlite3 data/logistix.db "REINDEX;"
```

2. **Restauration depuis sauvegarde:**
```bash
# Restaurer la dernière sauvegarde valide
npm run script:restore-backup --backup-id=latest
```

#### Fuites Mémoire

**Symptômes:**
- Utilisation mémoire croissante
- Ralentissements progressifs
- Crashes OOM (Out of Memory)

**Diagnostic:**

```bash
# Profiling mémoire avec Node.js
node --inspect --heap-prof server.js

# Analyser les heap dumps
npm install -g clinic
clinic doctor -- node server.js
```

**Solutions:**

1. **Optimisation du code:**
```typescript
// Éviter les fuites de closures
function processData(data: LargeData[]) {
  // ❌ Fuite potentielle
  const cache = new Map();
  return data.map(item => {
    return () => cache.get(item.id); // Référence à cache
  });
}

// ✅ Correct
function processData(data: LargeData[]) {
  return data.map(item => {
    return () => item.processedValue;
  });
}
```

2. **Gestion des événements:**
```typescript
// ✅ Nettoyer les listeners
useEffect(() => {
  const handleResize = () => { /* ... */ };
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### Procédures d'Urgence

#### Rollback d'Application

```bash
# 1. Arrêter l'application
pm2 stop logistix

# 2. Restaurer la version précédente
git checkout HEAD~1
npm ci
npm run build

# 3. Restaurer la base de données si nécessaire
npm run script:restore-backup --backup-id=pre-deployment

# 4. Redémarrer l'application
pm2 start logistix
```

#### Récupération de Données

```typescript
// scripts/data-recovery.ts
export async function recoverCorruptedData(): Promise<RecoveryReport> {
  const report: RecoveryReport = {
    corruptedRecords: [],
    recoveredRecords: [],
    failedRecords: [],
  };

  // Identifier les enregistrements corrompus
  const corruptedProducts = await db
    .select()
    .from(products)
    .where(or(
      isNull(products.id),
      eq(products.price, 0),
      isNull(products.createdAt)
    ));

  for (const product of corruptedProducts) {
    try {
      // Tenter la récupération depuis les logs d'audit
      const auditLog = await findLastValidState(product.id);
      if (auditLog) {
        await db
          .update(products)
          .set(auditLog.data)
          .where(eq(products.id, product.id));
        
        report.recoveredRecords.push(product.id);
      } else {
        report.failedRecords.push(product.id);
      }
    } catch (error) {
      report.failedRecords.push(product.id);
      logger.error('Failed to recover product', { productId: product.id, error });
    }
  }

  return report;
}
```

## Sauvegardes et Restauration

### Stratégie de Sauvegarde

#### Sauvegardes Automatiques

```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/backups/logistix"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="data/logistix.db"

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

# Sauvegarde de la base de données
sqlite3 "$DB_FILE" ".backup $BACKUP_DIR/logistix_$DATE.db"

# Sauvegarde des fichiers de configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env config/

# Sauvegarde des logs récents
tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" logs/

# Nettoyage des anciennes sauvegardes (> 30 jours)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

#### Planification avec Cron

```bash
# Ajouter au crontab
# Sauvegarde quotidienne à 2h du matin
0 2 * * * /path/to/logistix/scripts/backup.sh

# Sauvegarde hebdomadaire complète le dimanche à 1h
0 1 * * 0 /path/to/logistix/scripts/full-backup.sh
```

### Procédures de Restauration

#### Restauration Complète

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1
RESTORE_DATE=$(date +%Y%m%d_%H%M%S)

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Arrêter l'application
pm2 stop logistix

# Sauvegarder l'état actuel
cp data/logistix.db "data/logistix_pre_restore_$RESTORE_DATE.db"

# Restaurer la base de données
cp "$BACKUP_FILE" data/logistix.db

# Vérifier l'intégrité
sqlite3 data/logistix.db "PRAGMA integrity_check;"

if [ $? -eq 0 ]; then
  echo "Database integrity check passed"
  # Redémarrer l'application
  pm2 start logistix
  echo "Restore completed successfully"
else
  echo "Database integrity check failed, rolling back"
  cp "data/logistix_pre_restore_$RESTORE_DATE.db" data/logistix.db
  pm2 start logistix
  exit 1
fi
```

## Optimisation Continue

### Analyse des Performances

#### Profiling Régulier

```typescript
// scripts/performance-analysis.ts
import { PerformanceObserver } from 'perf_hooks';

export class PerformanceAnalyzer {
  private observations: PerformanceEntry[] = [];

  startProfiling(): void {
    const obs = new PerformanceObserver((list) => {
      this.observations.push(...list.getEntries());
    });

    obs.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  generateReport(): PerformanceAnalysisReport {
    const slowOperations = this.observations
      .filter(entry => entry.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    const resourceUsage = this.observations
      .filter(entry => entry.entryType === 'resource')
      .reduce((acc, entry) => {
        acc.totalSize += (entry as any).transferSize || 0;
        acc.totalRequests += 1;
        return acc;
      }, { totalSize: 0, totalRequests: 0 });

    return {
      slowOperations,
      resourceUsage,
      recommendations: this.generateRecommendations(slowOperations),
    };
  }
}
```

### Métriques de Qualité

#### Surveillance de la Dette Technique

```typescript
// scripts/technical-debt-monitor.ts
export interface TechnicalDebtMetrics {
  codeComplexity: number;
  duplicatedCode: number;
  testCoverage: number;
  outdatedDependencies: number;
  securityVulnerabilities: number;
}

export async function analyzeTechnicalDebt(): Promise<TechnicalDebtMetrics> {
  const [
    complexity,
    duplication,
    coverage,
    dependencies,
    security
  ] = await Promise.all([
    analyzeCodeComplexity(),
    analyzeDuplicatedCode(),
    analyzeTestCoverage(),
    analyzeOutdatedDependencies(),
    analyzeSecurityVulnerabilities(),
  ]);

  return {
    codeComplexity: complexity.averageComplexity,
    duplicatedCode: duplication.percentage,
    testCoverage: coverage.percentage,
    outdatedDependencies: dependencies.count,
    securityVulnerabilities: security.count,
  };
}
```

Ce guide de maintenance assure la stabilité, la performance et la sécurité de l'application Logistix à long terme.