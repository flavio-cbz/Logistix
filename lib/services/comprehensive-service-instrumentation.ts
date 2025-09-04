/**
 * Comprehensive Service Instrumentation
 * Provides logging instrumentation for all service classes with detailed metrics
 */

import { 
  PerformanceTimer, 
  createRequestLogger,
  databaseLogger,
  apiLogger,
  authLogger,
  marketAnalysisLogger,
  vintedLogger,
  performanceLogger,
  cacheLogger,
  fsLogger,
  schedulerLogger
} from '@/lib/utils/logging';
import { auditLogger } from './audit-logger';
import { v4 as uuidv4 } from 'uuid';

// Service logger mapping
const SERVICE_LOGGERS = {
  database: databaseLogger,
  api: apiLogger,
  auth: authLogger,
  marketAnalysis: marketAnalysisLogger,
  vinted: vintedLogger,
  performance: performanceLogger,
  cache: cacheLogger,
  filesystem: fsLogger,
  scheduler: schedulerLogger
} as const;

type ServiceType = keyof typeof SERVICE_LOGGERS;

interface ServiceOperationContext {
  serviceName: string;
  operationName: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>; // Changed from any to unknown
}


/**
 * Comprehensive service instrumentation class
 */
export class ComprehensiveServiceInstrumentation {
  private static instance: ComprehensiveServiceInstrumentation;

  public static getInstance(): ComprehensiveServiceInstrumentation {
    if (!ComprehensiveServiceInstrumentation.instance) {
      ComprehensiveServiceInstrumentation.instance = new ComprehensiveServiceInstrumentation();
    }
    return ComprehensiveServiceInstrumentation.instance;
  }

  /**
   * Instrument any service operation with comprehensive logging
   */
  async instrumentOperation<T>(
    context: ServiceOperationContext,
    operation: () => Promise<T>,
    serviceType: ServiceType = 'api'
  ): Promise<T> {
    const logger = SERVICE_LOGGERS[serviceType]!;
    const requestId = context.requestId || uuidv4();
    const timer = new PerformanceTimer(
      `${context.serviceName.toUpperCase()}_${context.operationName.toUpperCase()}`,
      logger
    );

    // Create request-scoped logger
    const scopedLogger = createRequestLogger(requestId, context.userId);

    // Log operation start
    scopedLogger.info(`Starting ${context.serviceName} operation: ${context.operationName}`, {
      service: context.serviceName,
      operation: context.operationName,
      userId: context.userId,
      sessionId: context.sessionId,
      metadata: context.metadata
    });

    try {
      // Execute the operation
      const result = await operation();

      // Calculate duration and log success
      const duration = timer.end({
        service: context.serviceName,
        operation: context.operationName,
        success: true,
        userId: context.userId,
        sessionId: context.sessionId,
        resultType: typeof result,
        ...context.metadata
      });

      // Log successful completion
      scopedLogger.info(`${context.serviceName} operation completed: ${context.operationName}`, {
        service: context.serviceName,
        operation: context.operationName,
        duration,
        success: true,
        userId: context.userId,
        sessionId: context.sessionId
      });

      // Log user action for audit trail
      if (context.userId) {
        await auditLogger.logUserAction(
          context.userId,
          {
            action: `${context.serviceName.toUpperCase()}_${context.operationName.toUpperCase()}`,
            resource: context.serviceName,
            details: {
              operation: context.operationName,
              duration,
              success: true,
              ...context.metadata
            }
          },
          {
            ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
            requestId
          }
        );
      }

      return result;

    } catch (error: unknown) { // Changed from any to unknown
      const duration = Date.now() - timer['startTime']!;

      // Convertir safe l'unknown en Error avant de l'utiliser
      const err = error instanceof Error ? error : new Error(String(error));

      // Log error (passer un Error)
      scopedLogger.error(`${context.serviceName} operation failed: ${context.operationName}`, err, {
        service: context.serviceName,
        operation: context.operationName,
        duration,
        success: false,
        userId: context.userId,
        sessionId: context.sessionId,
        metadata: context.metadata
      });

      // End timer with error (passer un Error)
      timer.endWithError(err, {
        service: context.serviceName,
        operation: context.operationName,
        userId: context.userId,
        sessionId: context.sessionId,
        ...context.metadata
      });

      // Log failed user action for audit trail (utiliser err)
      if (context.userId) {
        await auditLogger.logFailedUserAction(
          context.userId,
          {
            action: `${context.serviceName.toUpperCase()}_${context.operationName.toUpperCase()}`,
            resource: context.serviceName,
            details: {
              operation: context.operationName,
              duration,
              success: false,
              error: err.message,
              ...context.metadata
            }
          },
          err,
          {
            ...(context.sessionId !== undefined ? { sessionId: context.sessionId } : {}),
            requestId
          }
        );
      }

      throw error;
    }
  }

  /**
   * Instrument database operations specifically
   */
  async instrumentDatabaseOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    query?: string,
    params?: unknown[], // Changed from any[] to unknown[]
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'database',
        operationName,
        ...context,
        metadata: {
          query: query?.substring(0, 200),
          paramCount: params?.length,
          ...context?.metadata
        }
      },
      operation,
      'database'
    );
  }

  /**
   * Instrument authentication operations specifically
   */
  async instrumentAuthOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    username?: string,
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'auth',
        operationName,
        ...context,
        metadata: {
          username,
          ...context?.metadata
        }
      },
      operation,
      'auth'
    );
  }

  /**
   * Instrument API operations specifically
   */
  async instrumentApiOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    endpoint?: string,
    method?: string,
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'api',
        operationName,
        ...context,
        metadata: {
          endpoint,
          method,
          ...context?.metadata
        }
      },
      operation,
      'api'
    );
  }

  /**
   * Instrument market analysis operations specifically
   */
  async instrumentMarketAnalysisOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    analysisType?: string,
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'marketAnalysis',
        operationName,
        ...context,
        metadata: {
          analysisType,
          ...context?.metadata
        }
      },
      operation,
      'marketAnalysis'
    );
  }

  /**
   * Instrument Vinted integration operations specifically
   */
  async instrumentVintedOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    endpoint?: string,
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'vinted',
        operationName,
        ...context,
        metadata: {
          endpoint,
          ...context?.metadata
        }
      },
      operation,
      'vinted'
    );
  }

  /**
   * Instrument cache operations specifically
   */
  async instrumentCacheOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    cacheKey?: string,
    context?: Partial<ServiceOperationContext>
  ): Promise<T> {
    return this.instrumentOperation(
      {
        serviceName: 'cache',
        operationName,
        ...context,
        metadata: {
          cacheKey,
          ...context?.metadata
        }
      },
      operation,
      'cache'
    );
  }

  /**
   * Create a service class decorator for automatic instrumentation
   */
  createServiceDecorator(serviceName: string, serviceType: ServiceType = 'api') {
    // eslint-disable-next-line @typescript-eslint/ban-types
    // Remarque : TypeScript exige pour les mixins un constructeur avec un seul rest param de type 'any[]'
    return function <T extends new (...args: any[]) => object>(constructor: T) {
      return class extends constructor {
        // Le constructeur du mixin doit être `(...args: any[])`
        constructor(...args: any[]) {
           super(...args);
           
           // Instrument all methods of the service class
           const prototype = Object.getPrototypeOf(this);
           const methodNames = Object.getOwnPropertyNames(prototype)
             .filter(name => name !== 'constructor' && typeof (prototype as Record<string, unknown>)[name] === 'function'); // Added Record<string, unknown>
 
           for (const methodName of methodNames) {
             const originalMethod = (prototype as Record<string, Function>)[methodName]!; // Added Record<string, Function>
             
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prototype as Record<string, unknown>)[methodName] = async function (...methodArgs: unknown[]) {
               const instrumentation = ComprehensiveServiceInstrumentation.getInstance();
               
               return instrumentation.instrumentOperation(
                 {
                   serviceName,
                   operationName: methodName,
                   metadata: {
                     argsCount: methodArgs.length
                   }
                 },
                 () => originalMethod.apply(this, methodArgs),
                 serviceType
               );
             };
           }
         }
       };
     };
   }

  /**
   * Create a method decorator for specific method instrumentation
   */
  createMethodDecorator(
    serviceName: string, 
    serviceType: ServiceType = 'api',
    customOperationName?: string
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function ( // Removed 'target: any' as it's not used
      _target: object, // Changed any to object
      propertyName: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      const instrumentation = ComprehensiveServiceInstrumentation.getInstance();
      const operationName = customOperationName || propertyName;

      descriptor.value = async function (...args: unknown[]) { // Changed any to unknown
        return instrumentation.instrumentOperation(
          {
            serviceName,
            operationName,
            metadata: {
              method: propertyName,
              argsCount: args.length
            }
          },
          () => originalMethod.apply(this, args),
          serviceType
        );
      };

      return descriptor;
    };
  }

  /**
   * Get performance metrics for all services
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getAllServiceMetrics(): Promise<Record<string, unknown>> { // Changed return type to Record<string, unknown>
    const services = Object.keys(SERVICE_LOGGERS) as ServiceType[]; // Cast to ServiceType[]
    const metrics = await Promise.all(
      services.map(service => this.getServiceStatistics(service)) // getServiceStatistics is not defined, will need to be implemented or removed
    );
    
    return metrics.reduce((acc, metric) => {
      acc[metric.serviceName] = metric;
      return acc;
    }, {} as Record<string, unknown>); // Changed Record<string, any> to Record<string, unknown>
  }

  // Placeholder for getServiceStatistics - this method is not defined in the provided code
  // It needs to be implemented or removed if not intended for use.
  private async getServiceStatistics(serviceName: ServiceType): Promise<{ serviceName: ServiceType; [key: string]: unknown }> {
    // This is a placeholder. In a real scenario, this would fetch metrics from a metrics system.
    return { serviceName, data: 'mock_data' };
  }
}

// Export singleton instance
export const serviceInstrumentation = ComprehensiveServiceInstrumentation.getInstance();

// Export decorators for easy use
export const ServiceClass = (serviceName: string, serviceType: ServiceType = 'api') =>
  serviceInstrumentation.createServiceDecorator(serviceName, serviceType);

export const ServiceMethod = (serviceName: string, serviceType: ServiceType = 'api', operationName?: string) =>
  serviceInstrumentation.createMethodDecorator(serviceName, serviceType, operationName);

// Export specific instrumentation functions
export const instrumentDatabaseOperation = serviceInstrumentation.instrumentDatabaseOperation.bind(serviceInstrumentation);
export const instrumentAuthOperation = serviceInstrumentation.instrumentAuthOperation.bind(serviceInstrumentation);
export const instrumentApiOperation = serviceInstrumentation.instrumentApiOperation.bind(serviceInstrumentation);
export const instrumentMarketAnalysisOperation = serviceInstrumentation.instrumentMarketAnalysisOperation.bind(serviceInstrumentation);
export const instrumentVintedOperation = serviceInstrumentation.instrumentVintedOperation.bind(serviceInstrumentation);
export const instrumentCacheOperation = serviceInstrumentation.instrumentCacheOperation.bind(serviceInstrumentation);