import { getLogger, ILogger, LogContext } from "@/lib/utils/logging/logger";
import Database from "better-sqlite3";

// Fallback logger for test environments where logger mock might not be ready
const createFallbackLogger = (): ILogger => ({
  info: (_message: string, _context?: LogContext) => { },
  warn: (_message: string, _context?: LogContext) => { },
  error: (_message: string, _context?: LogContext, _error?: unknown) => { },
  debug: (_message: string, _context?: LogContext) => { },
} as ILogger);

let logger: ILogger;
try {
  logger = getLogger("QueueManager");
  if (!logger) {
    logger = createFallbackLogger();
  }
} catch {
  logger = createFallbackLogger();
}

export enum RequestType {
  READ = "READ",
  WRITE = "WRITE",
  TRANSACTION = "TRANSACTION",
}

export enum RequestPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
}

interface QueueItem {
  type: RequestType;
  priority: RequestPriority;
  timeout: number;
  context: string;
  resolve: (value: Database.Database) => void;
  reject: (reason: unknown) => void;
  enqueuedAt: number; // Ajout de l'horodatage d'enfilement
}

/**
 * Gestionnaire de file d'attente pour les opérations asynchrones.
 * Permet de limiter le nombre d'opérations concurrentes et de gérer les requêtes en attente.
 */
export class QueueManager {
  private static instance: QueueManager;
  private queue: QueueItem[] = [];
  private runningCount: number = 0;
  private concurrencyLimit: number;
  private isShuttingDown = false;

  private constructor(concurrencyLimit: number = 5) {
    this.concurrencyLimit = concurrencyLimit;
    logger.info(
      `QueueManager initialized with concurrency limit: ${concurrencyLimit}`,
    );
  }

  public static getInstance(concurrencyLimit?: number): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager(concurrencyLimit);
    } else if (concurrencyLimit !== undefined) {
      // Permettre de changer la limite de concurrence si l'instance existe déjà
      QueueManager.instance.concurrencyLimit = concurrencyLimit;
      logger.info(
        `QueueManager concurrency limit updated to: ${concurrencyLimit}`,
      );
    }
    return QueueManager.instance;
  }

  /**
   * Ajoute une opération à la file d'attente et retourne une promesse qui sera résolue
   * lorsque l'opération sera exécutée.
   */
  public enqueue(
    type: RequestType,
    priority: RequestPriority,
    timeout: number,
    context: string,
  ): Promise<Database.Database> {
    if (this.isShuttingDown) {
      throw new Error("Queue is shutting down");
    }
    return new Promise((resolve, reject) => {
      const item: QueueItem = {
        type,
        priority,
        timeout,
        context,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };
      this.queue.push(item);
      this.processQueue();
    });
  }

  /**
   * Traite la file d'attente en exécutant les opérations jusqu'à la limite de concurrence.
   */
  public async processQueue(connection?: Database.Database): Promise<void> {
    // Si une connexion est passée, l'utiliser pour la prochaine requête en attente
    if (connection) {
      const item = this.queue.shift();
      if (item) {
        item.resolve(connection);
      }
    }

    while (this.runningCount < this.concurrencyLimit && this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        this.runningCount++;
        try {
          // Dans une vraie implémentation, ici on obtiendrait une connexion réelle du pool
          // Pour l'instant, on simule l'obtention d'une connexion ou le traitement direct
          const db = new Database(":memory:"); // Ceci est un placeholder

          // Simuler le traitement asynchrone
          setTimeout(() => {
            if (!this.isShuttingDown) {
              item.resolve(db);
            } else {
              item.reject(new Error("Queue shutdown"));
            }
          }, 100); // Délai simulé
        } catch (error: unknown) {
          item.reject(error);
          logger.error(`Operation "${item.context}" failed.`, {
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          this.runningCount--;
          // On ne rappelle pas processQueue ici car ConnectionPool va appeler releaseConnection
          // qui à son tour appellera processRequest qui gérera la file.
        }
      }
    }
  }

  /**
   * Méthode appelée par le pool de connexions pour traiter une requête en attente
   * avec une connexion libérée.
   * @returns true si une requête a été traitée, false sinon.
   */
  public processRequest(connection: Database.Database): boolean {
    if (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.resolve(connection);
        return true;
      }
    }
    return false;
  }

  /**
   * Retourne le nombre d'opérations en attente dans la file.
   */
  public getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Retourne le nombre d'opérations actuellement en cours d'exécution.
   */
  public getRunningCount(): number {
    return this.runningCount;
  }

  /**
   * Vide la file d'attente des opérations en attente.
   * Les promesses des opérations vidées seront rejetées.
   */
  public clearQueue(): void {
    const clearedItems = this.queue.splice(0, this.queue.length);
    clearedItems.forEach((item) => {
      item.reject(new Error("Operation cancelled: Queue cleared."));
    });
    logger.info(`Queue cleared. ${clearedItems.length} operations cancelled.`);
  }

  /**
   * Change la limite de concurrence et ajuste le traitement de la file.
   * @param newLimit La nouvelle limite de concurrence.
   */
  public setConcurrencyLimit(newLimit: number): void {
    if (newLimit <= 0) {
      logger.warn(
        `Attempted to set invalid concurrency limit: ${newLimit}. Must be greater than 0.`,
      );
      return;
    }
    this.concurrencyLimit = newLimit;
    logger.info(`Concurrency limit set to: ${newLimit}`);
    this.processQueue(); // Tente de traiter plus d'opérations si la limite a augmenté
  }

  /**
   * Arrête le gestionnaire de file d'attente, rejette toutes les promesses en attente.
   */
  shutdown(): void {
    this.isShuttingDown = true;
    this.queue.forEach((item) => item.reject(new Error("Shutdown")));
    this.queue = [];
    logger.info("QueueManager shutting down. All pending requests rejected.");
  }

  /**
   * Retourne les statistiques détaillées de la file d'attente.
   */
  public getStats(): {
    pendingRequests: number;
    runningRequests: number;
    averageWaitTime: number;
    peakWaitTime: number;
  } {
    const now = Date.now();
    const waitTimes = this.queue.map((item) => now - item.enqueuedAt);
    const totalWaitTime = waitTimes.reduce((sum, time) => sum + time, 0);
    const averageWaitTime =
      waitTimes.length > 0 ? totalWaitTime / waitTimes.length : 0;
    const peakWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    return {
      pendingRequests: this.queue.length,
      runningRequests: this.runningCount,
      averageWaitTime,
      peakWaitTime,
    };
  }

  /**
   * Retourne les statistiques de la file d'attente par type et priorité.
   */
  public getQueueByType(): {
    [type: string]: {
      [priority: string]: number;
    };
  } {
    const stats: { [type: string]: { [priority: string]: number } } = {};
    this.queue.forEach((item) => {
      if (!stats[item.type]) {
        stats[item.type] = {};
      }
      stats[item.type]![item.priority] =
        (stats[item.type]![item.priority] || 0) + 1;
    });
    return stats;
  }
}

export const queueManager = QueueManager.getInstance();
