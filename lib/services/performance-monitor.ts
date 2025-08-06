import { logger } from '@/lib/utils/logging/logger';

/**
 * Service de monitoring des performances pour les appels API Vinted
 */
class VintedApiMonitor {
    private static instance: VintedApiMonitor;

    public static getInstance(): VintedApiMonitor {
        if (!VintedApiMonitor.instance) {
            VintedApiMonitor.instance = new VintedApiMonitor();
        }
        return VintedApiMonitor.instance;
    }

    /**
     * Monitore un appel API avec mesure de performance
     */
    async monitorApiCall<T>(
        operationType: string,
        operation: () => Promise<T>,
        context?: Record<string, any>
    ): Promise<T> {
        const startTime = Date.now();
        const operationId = `${operationType}-${Date.now()}`;

        logger.info(`[ApiMonitor] Début de l'opération ${operationType}`, {
            operationId,
            context,
        });

        try {
            const result = await operation();
            const duration = Date.now() - startTime;

            logger.info(`[ApiMonitor] Opération ${operationType} réussie`, {
                operationId,
                duration: `${duration}ms`,
                context,
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            logger.error(`[ApiMonitor] Opération ${operationType} échouée`, {
                operationId,
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : String(error),
                context,
            });

            throw error;
        }
    }

    /**
     * Enregistre des métriques personnalisées
     */
    recordMetric(name: string, value: number, tags?: Record<string, string>) {
        logger.info(`[ApiMonitor] Métrique: ${name}`, {
            value,
            tags,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Enregistre un événement personnalisé
     */
    recordEvent(eventName: string, data?: Record<string, any>) {
        logger.info(`[ApiMonitor] Événement: ${eventName}`, {
            data,
            timestamp: new Date().toISOString(),
        });
    }
}

// Export de l'instance singleton
export const vintedApiMonitor = VintedApiMonitor.getInstance();