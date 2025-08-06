/**
 * Service Logging Instrumentation
 * Adds comprehensive logging to existing services
 */

import { 
  databaseLogger, 
  authLogger, 
  marketAnalysisLogger,
  vintedLogger,
  PerformanceTimer,
  dbQueryLogger
} from '@/lib/utils/logging';

/**
 * Database Service Instrumentation
 */
export class DatabaseServiceInstrumentation {
  static instrumentQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    query?: string
  ): Promise<T> {
    const timer = new PerformanceTimer(`DB_QUERY_${queryName}`, databaseLogger);
    
    return queryFn()
      .then(result => {
        const duration = timer.end({
          queryName,
          success: true,
          resultCount: Array.isArray(result) ? result.length : 1
        });
        
        if (query) {
          dbQueryLogger.logQuery(query, undefined, duration, { queryName });
        }
        
        return result;
      })
      .catch(error => {
        timer.endWithError(error, { queryName, query });
      });
  }

  static instrumentTransaction<T>(
    transactionName: string,
    transactionFn: () => Promise<T>
  ): Promise<T> {
    const timer = new PerformanceTimer(`DB_TRANSACTION_${transactionName}`, databaseLogger);
    
    databaseLogger.info(`Starting transaction: ${transactionName}`);
    
    return transactionFn()
      .then(result => {
        const duration = timer.end({
          transactionName,
          success: true
        });
        
        dbQueryLogger.logTransaction(transactionName, duration);
        databaseLogger.info(`Transaction completed: ${transactionName}`, { duration });
        
        return result;
      })
      .catch(error => {
        databaseLogger.error(`Transaction failed: ${transactionName}`, error);
        timer.endWithError(error, { transactionName });
      });
  }
}

/**
 * Authentication Service Instrumentation
 */
export class AuthServiceInstrumentation {
  static instrumentLogin<T>(
    loginFn: (credentials: any) => Promise<T>,
    credentials: any
  ): Promise<T> {
    const timer = new PerformanceTimer('AUTH_LOGIN', authLogger);
    
    authLogger.info('Login attempt started', {
      username: credentials.username || credentials.email,
      ip: credentials.ip,
      userAgent: credentials.userAgent
    });
    
    return loginFn(credentials)
      .then(result => {
        const duration = timer.end({
          success: true,
          username: credentials.username || credentials.email
        });
        
        authLogger.info('Login successful', {
          username: credentials.username || credentials.email,
          duration
        });
        
        return result;
      })
      .catch(error => {
        authLogger.error('Login failed', error, {
          username: credentials.username || credentials.email,
          ip: credentials.ip,
          reason: error.message
        });
        
        timer.endWithError(error, {
          username: credentials.username || credentials.email
        });
      });
  }

  static instrumentLogout(userId: string, sessionId?: string): void {
    authLogger.info('User logout', {
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    });
  }

  static instrumentPasswordChange(userId: string, success: boolean): void {
    if (success) {
      authLogger.info('Password changed successfully', { userId });
    } else {
      authLogger.warn('Password change failed', { userId });
    }
  }

  static instrumentFailedAttempt(
    username: string, 
    reason: string, 
    ip?: string, 
    userAgent?: string
  ): void {
    authLogger.warn('Authentication failed', {
      username,
      reason,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Market Analysis Service Instrumentation
 */
export class MarketAnalysisInstrumentation {
  static instrumentAnalysis<T>(
    analysisType: string,
    analysisFn: () => Promise<T>,
    parameters?: Record<string, any>
  ): Promise<T> {
    const timer = new PerformanceTimer(`MARKET_ANALYSIS_${analysisType}`, marketAnalysisLogger);
    
    marketAnalysisLogger.info(`Starting market analysis: ${analysisType}`, {
      analysisType,
      parameters
    });
    
    return analysisFn()
      .then(result => {
        const duration = timer.end({
          analysisType,
          success: true,
          resultSize: JSON.stringify(result).length
        });
        
        marketAnalysisLogger.info(`Market analysis completed: ${analysisType}`, {
          analysisType,
          duration,
          success: true
        });
        
        return result;
      })
      .catch(error => {
        marketAnalysisLogger.error(`Market analysis failed: ${analysisType}`, error, {
          analysisType,
          parameters
        });
        
        timer.endWithError(error, { analysisType });
      });
  }

  static instrumentDataFetch<T>(
    source: string,
    fetchFn: () => Promise<T>,
    query?: string
  ): Promise<T> {
    const timer = new PerformanceTimer(`DATA_FETCH_${source}`, marketAnalysisLogger);
    
    marketAnalysisLogger.debug(`Fetching data from ${source}`, {
      source,
      query
    });
    
    return fetchFn()
      .then(result => {
        const duration = timer.end({
          source,
          success: true,
          dataSize: Array.isArray(result) ? result.length : 1
        });
        
        marketAnalysisLogger.debug(`Data fetch completed: ${source}`, {
          source,
          duration,
          dataSize: Array.isArray(result) ? result.length : 1
        });
        
        return result;
      })
      .catch(error => {
        marketAnalysisLogger.error(`Data fetch failed: ${source}`, error, {
          source,
          query
        });
        
        timer.endWithError(error, { source });
      });
  }
}

/**
 * Vinted Integration Instrumentation
 */
export class VintedIntegrationInstrumentation {
  static instrumentApiCall<T>(
    endpoint: string,
    method: string,
    apiFn: () => Promise<T>,
    payload?: any
  ): Promise<T> {
    const timer = new PerformanceTimer(`VINTED_API_${method}_${endpoint}`, vintedLogger);
    
    vintedLogger.debug(`Vinted API call: ${method} ${endpoint}`, {
      endpoint,
      method,
      payloadSize: payload ? JSON.stringify(payload).length : 0
    });
    
    return apiFn()
      .then(result => {
        const duration = timer.end({
          endpoint,
          method,
          success: true,
          responseSize: JSON.stringify(result).length
        });
        
        vintedLogger.debug(`Vinted API call successful: ${method} ${endpoint}`, {
          endpoint,
          method,
          duration
        });
        
        return result;
      })
      .catch(error => {
        vintedLogger.error(`Vinted API call failed: ${method} ${endpoint}`, error, {
          endpoint,
          method,
          payload: payload ? JSON.stringify(payload).substring(0, 200) : undefined
        });
        
        timer.endWithError(error, { endpoint, method });
      });
  }

  static instrumentAuthentication<T>(
    authFn: () => Promise<T>,
    sessionData?: any
  ): Promise<T> {
    const timer = new PerformanceTimer('VINTED_AUTH', vintedLogger);
    
    vintedLogger.info('Vinted authentication started');
    
    return authFn()
      .then(result => {
        const duration = timer.end({
          success: true,
          hasSession: !!sessionData
        });
        
        vintedLogger.info('Vinted authentication successful', {
          duration,
          hasSession: !!sessionData
        });
        
        return result;
      })
      .catch(error => {
        vintedLogger.error('Vinted authentication failed', error);
        timer.endWithError(error);
      });
  }

  static instrumentScraping<T>(
    scrapingType: string,
    scrapingFn: () => Promise<T>,
    url?: string
  ): Promise<T> {
    const timer = new PerformanceTimer(`VINTED_SCRAPING_${scrapingType}`, vintedLogger);
    
    vintedLogger.debug(`Vinted scraping started: ${scrapingType}`, {
      scrapingType,
      url
    });
    
    return scrapingFn()
      .then(result => {
        const duration = timer.end({
          scrapingType,
          success: true,
          resultCount: Array.isArray(result) ? result.length : 1
        });
        
        vintedLogger.debug(`Vinted scraping completed: ${scrapingType}`, {
          scrapingType,
          duration,
          url
        });
        
        return result;
      })
      .catch(error => {
        vintedLogger.error(`Vinted scraping failed: ${scrapingType}`, error, {
          scrapingType,
          url
        });
        
        timer.endWithError(error, { scrapingType });
      });
  }
}

/**
 * Generic Service Instrumentation Helper
 */
export class ServiceInstrumentation {
  static instrument<T extends any[], R>(
    serviceName: string,
    operationName: string,
    fn: (...args: T) => Promise<R>
  ) {
    return async (...args: T): Promise<R> => {
      const logger = marketAnalysisLogger; // Use appropriate logger
      const timer = new PerformanceTimer(`${serviceName}_${operationName}`, logger);
      
      logger.debug(`${serviceName} operation started: ${operationName}`, {
        service: serviceName,
        operation: operationName,
        argsCount: args.length
      });
      
      try {
        const result = await fn(...args);
        
        const duration = timer.end({
          service: serviceName,
          operation: operationName,
          success: true
        });
        
        logger.debug(`${serviceName} operation completed: ${operationName}`, {
          service: serviceName,
          operation: operationName,
          duration
        });
        
        return result;
      } catch (error) {
        logger.error(`${serviceName} operation failed: ${operationName}`, error as Error, {
          service: serviceName,
          operation: operationName
        });
        
        timer.endWithError(error as Error, {
          service: serviceName,
          operation: operationName
        });
      }
    };
  }
}