import type Database from 'better-sqlite3';

/**
 * Priorité des requêtes dans la file d'attente
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Type de requête pour optimiser la gestion
 */
export enum RequestType {
  READ = 'READ',
  WRITE = 'WRITE',
  TRANSACTION = 'TRANSACTION',
}

/**
 * Requête en attente dans la file
 */
export interface QueuedRequest {
  id: string;
  type: RequestType;
  priority: RequestPriority;
  timestamp: Date;
  timeout: number;
  resolve: (connection: Database.Database) => void;
  reject: (error: Error) => void;
  context?: string; // Pour le debugging
}

/**
 * Statistiques de la file d'attente
 */
export interface QueueStats {
  totalRequests: number;
  waitingRequests: number;
  averageWaitTime: number;
  maxWaitTime: number;
  timeoutCount: number;
  requestsByType: Record<RequestType, number>;
  requestsByPriority: Record<RequestPriority, number>;
}

/**
 * Gestionnaire de file d'attente pour les connexions à la base de données
 */
export class QueueManager {
  private queue: QueuedRequest[] = [];
  private stats: QueueStats = {
    totalRequests: 0,
    waitingRequests: 0,
    averageWaitTime: 0,
    maxWaitTime: 0,
    timeoutCount: 0,
    requestsByType: {
      [RequestType.READ]: 0,
      [RequestType.WRITE]: 0,
      [RequestType.TRANSACTION]: 0,
    },
    requestsByPriority: {
      [RequestPriority.LOW]: 0,
      [RequestPriority.NORMAL]: 0,
      [RequestPriority.HIGH]: 0,
      [RequestPriority.CRITICAL]: 0,
    },
  };
  private waitTimes: number[] = [];
  private cleanupInterval?: NodeJS.Timeout;

  private logger = (() => {
    const { getLogger } = require('@/lib/utils/logging/simple-logger');
    const logger = getLogger('QueueManager');
    return {
      debug: (msg: string, data?: any) => {
        if (process.env.DB_DEBUG === 'true') {
        }
      },
      warn: (msg: string, data?: any) => {
        logger.warn(msg, data);
      },
      error: (msg: string, data?: any) => {
        logger.error(msg, data);
      },
    };
  })();

  constructor() {
    // Démarrer le nettoyage périodique des requêtes expirées
    this.startCleanupTimer();
  }

  /**
   * Ajoute une requête à la file d'attente
   */
  enqueue(
    type: RequestType,
    priority: RequestPriority = RequestPriority.NORMAL,
    timeout: number = 30000,
    context?: string
  ): Promise<Database.Database> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        type,
        priority,
        timestamp: new Date(),
        timeout,
        resolve,
        reject,
        context,
      };

      // Insérer dans la file selon la priorité
      this.insertByPriority(request);
      
      // Mettre à jour les statistiques
      this.stats.totalRequests++;
      this.stats.waitingRequests++;
      this.stats.requestsByType[type]++;
      this.stats.requestsByPriority[priority]++;


      // Configurer le timeout
      setTimeout(() => {
        this.timeoutRequest(request.id);
      }, timeout);
    });
  }

  /**
   * Retire la prochaine requête de la file d'attente
   */
  dequeue(): QueuedRequest | null {
    const request = this.queue.shift();
    
    if (request) {
      this.stats.waitingRequests--;
      
      // Calculer le temps d'attente
      const waitTime = Date.now() - request.timestamp.getTime();
      this.updateWaitTimeStats(waitTime);

    }

    return request;
  }

  /**
   * Traite une requête avec une connexion disponible
   */
  processRequest(connection: Database.Database): boolean {
    const request = this.dequeue();
    
    if (!request) {
      return false;
    }

    try {
      request.resolve(connection);
      return true;
    } catch (error) {
      this.logger.error('Error processing request', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error),
      });
      request.reject(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Annule toutes les requêtes en attente
   */
  cancelAllRequests(reason: string = 'Queue shutdown'): void {
    const requestsToCancel = [...this.queue];
    this.queue.length = 0;
    this.stats.waitingRequests = 0;

    for (const request of requestsToCancel) {
      request.reject(new Error(reason));
    }

  }

  /**
   * Obtient les statistiques de la file d'attente
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Obtient la longueur actuelle de la file d'attente
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Obtient les requêtes en attente par type
   */
  getQueueByType(): Record<RequestType, number> {
    const counts = {
      [RequestType.READ]: 0,
      [RequestType.WRITE]: 0,
      [RequestType.TRANSACTION]: 0,
    };

    for (const request of this.queue) {
      counts[request.type]++;
    }

    return counts;
  }

  /**
   * Insère une requête dans la file selon sa priorité
   */
  private insertByPriority(request: QueuedRequest): void {
    let insertIndex = this.queue.length;

    // Trouver la position d'insertion basée sur la priorité
    for (let i = 0; i < this.queue.length; i++) {
      if (request.priority > this.queue[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, request);
  }

  /**
   * Génère un ID unique pour une requête
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gère le timeout d'une requête
   */
  private timeoutRequest(requestId: string): void {
    const requestIndex = this.queue.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      const request = this.queue.splice(requestIndex, 1)[0];
      this.stats.waitingRequests--;
      this.stats.timeoutCount++;

      this.logger.warn('Request timed out', {
        id: requestId,
        type: request.type,
        priority: request.priority,
        waitTime: Date.now() - request.timestamp.getTime(),
      });

      request.reject(new Error(`Request timeout after ${request.timeout}ms`));
    }
  }

  /**
   * Met à jour les statistiques de temps d'attente
   */
  private updateWaitTimeStats(waitTime: number): void {
    this.waitTimes.push(waitTime);
    
    // Garder seulement les 1000 derniers temps d'attente pour le calcul de la moyenne
    if (this.waitTimes.length > 1000) {
      this.waitTimes.shift();
    }

    // Calculer la moyenne
    this.stats.averageWaitTime = this.waitTimes.reduce((sum, time) => sum + time, 0) / this.waitTimes.length;
    
    // Mettre à jour le temps d'attente maximum
    this.stats.maxWaitTime = Math.max(this.stats.maxWaitTime, waitTime);
  }

  /**
   * Démarre le timer de nettoyage des requêtes expirées
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, 30000); // Vérifier toutes les 30 secondes
  }

  /**
   * Nettoie les requêtes expirées (sécurité supplémentaire)
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    const expiredRequests: QueuedRequest[] = [];
    
    this.queue = this.queue.filter(request => {
      const age = now - request.timestamp.getTime();
      if (age > request.timeout) {
        expiredRequests.push(request);
        return false;
      }
      return true;
    });

    // Rejeter les requêtes expirées
    for (const request of expiredRequests) {
      this.stats.waitingRequests--;
      this.stats.timeoutCount++;
      request.reject(new Error(`Request expired after ${request.timeout}ms`));
    }

    if (expiredRequests.length > 0) {
      this.logger.warn('Cleaned up expired requests', {
        expiredCount: expiredRequests.length,
        remainingInQueue: this.queue.length,
      });
    }
  }

  /**
   * Arrête le gestionnaire de file d'attente
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cancelAllRequests('Queue manager shutdown');
    
  }
}