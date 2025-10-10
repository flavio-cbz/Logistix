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
  dbQueryLogger,
} from "@/lib/utils/logging";

/**
 * Database Service Instrumentation
 */
export class DatabaseServiceInstrumentation {
  static async instrumentQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    query?: string,
  ): Promise<T> {
    const timer = new PerformanceTimer(`DB_QUERY_${queryName}`, databaseLogger);

    try {
      const result = await queryFn();

      const duration = timer.end({
        queryName,
        success: true,
        resultCount: Array.isArray(result) ? result.length : 1,
      });

      if (query) {
        dbQueryLogger.logQuery(query, undefined, duration, { queryName });
      }

      return result;
    } catch (error) {
      timer.endWithError(error as Error, { queryName, query });
      databaseLogger.error(`Query failed: ${queryName}`, error as Error, {
        queryName,
        query,
      });
      throw error;
    }
  }

  static async instrumentTransaction<T>(
    transactionName: string,
    transactionFn: () => Promise<T>,
  ): Promise<T> {
    const timer = new PerformanceTimer(
      `DB_TRANSACTION_${transactionName}`,
      databaseLogger,
    );

    databaseLogger.info(`Starting transaction: ${transactionName}`);

    try {
      const result = await transactionFn();

      const duration = timer.end({
        transactionName,
        success: true,
      });

      dbQueryLogger.logTransaction(transactionName, duration);
      databaseLogger.info(`Transaction completed: ${transactionName}`, {
        duration,
      });

      return result;
    } catch (error) {
      databaseLogger.error(
        `Transaction failed: ${transactionName}`,
        error as Error,
      );
      timer.endWithError(error as Error, { transactionName });
      throw error;
    }
  }
}

/**
 * Authentication Service Instrumentation
 */
export class AuthServiceInstrumentation {
  static async instrumentLogin<T>(
    loginFn: (credentials: any) => Promise<T>,
    credentials: any,
  ): Promise<T> {
    const timer = new PerformanceTimer("AUTH_LOGIN", authLogger);

    authLogger.info("Login attempt started", {
      username: credentials?.username ?? credentials?.email,
      ip: credentials?.ip,
      userAgent: credentials?.userAgent,
    });

    try {
      const result = await loginFn(credentials);

      const duration = timer.end({
        success: true,
        username: credentials?.username ?? credentials?.email,
      });

      authLogger.info("Login successful", {
        username: credentials?.username ?? credentials?.email,
        duration,
      });

      return result;
    } catch (error) {
      authLogger.error("Login failed", error as Error, {
        username: credentials?.username ?? credentials?.email,
        ip: credentials?.ip,
        reason: (error as Error).message,
      });

      timer.endWithError(error as Error, {
        username: credentials?.username ?? credentials?.email,
      });
      throw error;
    }
  }

  static instrumentLogout(userId: string, sessionId?: string): void {
    authLogger.info("User logout", {
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  static instrumentPasswordChange(userId: string, success: boolean): void {
    if (success) {
      authLogger.info("Password changed successfully", { userId });
    } else {
      authLogger.warn("Password change failed", { userId });
    }
  }

  static instrumentFailedAttempt(
    username: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ): void {
    authLogger.warn("Authentication failed", {
      username,
      reason,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Market Analysis Service Instrumentation
 */
export class MarketAnalysisInstrumentation {
  static async instrumentAnalysis<T>(
    analysisType: string,
    analysisFn: () => Promise<T>,
    parameters?: Record<string, any>,
  ): Promise<T> {
    const timer = new PerformanceTimer(
      `MARKET_ANALYSIS_${analysisType}`,
      marketAnalysisLogger,
    );

    marketAnalysisLogger.info(`Starting market analysis: ${analysisType}`, {
      analysisType,
      parameters,
    });

    try {
      const result = await analysisFn();

      const duration = timer.end({
        analysisType,
        success: true,
        resultSize:
          typeof result === "string"
            ? result.length
            : JSON.stringify(result).length,
      });

      marketAnalysisLogger.info(`Market analysis completed: ${analysisType}`, {
        analysisType,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      marketAnalysisLogger.error(
        `Market analysis failed: ${analysisType}`,
        error as Error,
        {
          analysisType,
          parameters,
        },
      );

      timer.endWithError(error as Error, { analysisType });
      throw error;
    }
  }

  static async instrumentDataFetch<T>(
    source: string,
    fetchFn: () => Promise<T>,
    query?: string,
  ): Promise<T> {
    const timer = new PerformanceTimer(
      `DATA_FETCH_${source}`,
      marketAnalysisLogger,
    );

    marketAnalysisLogger.debug(`Fetching data from ${source}`, {
      source,
      query,
    });

    try {
      const result = await fetchFn();

      const dataSize = Array.isArray(result) ? result.length : 1;
      const duration = timer.end({
        source,
        success: true,
        dataSize,
      });

      marketAnalysisLogger.debug(`Data fetch completed: ${source}`, {
        source,
        duration,
        dataSize,
      });

      return result;
    } catch (error) {
      marketAnalysisLogger.error(
        `Data fetch failed: ${source}`,
        error as Error,
        {
          source,
          query,
        },
      );

      timer.endWithError(error as Error, { source });
      throw error;
    }
  }
}

/**
 * Vinted Integration Instrumentation
 */
export class VintedIntegrationInstrumentation {
  static async instrumentApiCall<T>(
    endpoint: string,
    method: string,
    apiFn: () => Promise<T>,
    payload?: any,
  ): Promise<T> {
    const timer = new PerformanceTimer(
      `VINTED_API_${method}_${endpoint}`,
      vintedLogger,
    );

    vintedLogger.debug(`Vinted API call: ${method} ${endpoint}`, {
      endpoint,
      method,
      payloadSize: payload ? JSON.stringify(payload).length : 0,
    });

    try {
      const result = await apiFn();

      const duration = timer.end({
        endpoint,
        method,
        success: true,
        responseSize: JSON.stringify(result).length,
      });

      vintedLogger.debug(`Vinted API call successful: ${method} ${endpoint}`, {
        endpoint,
        method,
        duration,
      });

      return result;
    } catch (error) {
      vintedLogger.error(
        `Vinted API call failed: ${method} ${endpoint}`,
        error as Error,
        {
          endpoint,
          method,
          payload: payload
            ? JSON.stringify(payload).substring(0, 200)
            : undefined,
        },
      );

      timer.endWithError(error as Error, { endpoint, method });
      throw error;
    }
  }

  static async instrumentAuthentication<T>(
    authFn: () => Promise<T>,
    sessionData?: any,
  ): Promise<T> {
    const timer = new PerformanceTimer("VINTED_AUTH", vintedLogger);

    vintedLogger.info("Vinted authentication started");

    try {
      const result = await authFn();

      const duration = timer.end({
        success: true,
        hasSession: !!sessionData,
      });

      vintedLogger.info("Vinted authentication successful", {
        duration,
        hasSession: !!sessionData,
      });

      return result;
    } catch (error) {
      vintedLogger.error("Vinted authentication failed", error as Error);
      timer.endWithError(error as Error);
      throw error;
    }
  }

  static async instrumentScraping<T>(
    scrapingType: string,
    scrapingFn: () => Promise<T>,
    url?: string,
  ): Promise<T> {
    const timer = new PerformanceTimer(
      `VINTED_SCRAPING_${scrapingType}`,
      vintedLogger,
    );

    vintedLogger.debug(`Vinted scraping started: ${scrapingType}`, {
      scrapingType,
      url,
    });

    try {
      const result = await scrapingFn();

      const resultCount = Array.isArray(result) ? result.length : 1;
      const duration = timer.end({
        scrapingType,
        success: true,
        resultCount,
      });

      vintedLogger.debug(`Vinted scraping completed: ${scrapingType}`, {
        scrapingType,
        url,
        duration,
        resultCount,
      });

      return result;
    } catch (error) {
      vintedLogger.error(
        `Vinted scraping failed: ${scrapingType}`,
        error as Error,
        {
          scrapingType,
          url,
        },
      );

      timer.endWithError(error as Error, { scrapingType });
      throw error;
    }
  }
}

/**
 * Generic Service Instrumentation Helper
 */
export class ServiceInstrumentation {
  static instrument<T extends any[], R>(
    serviceName: string,
    operationName: string,
    fn: (...args: T) => Promise<R>,
  ) {
    return async (...args: T): Promise<R> => {
      const logger = marketAnalysisLogger; // Consider making logger selectable by serviceName
      const timer = new PerformanceTimer(
        `${serviceName}_${operationName}`,
        logger,
      );

      try {
        const result = await fn(...args);

        const duration = timer.end({
          service: serviceName,
          operation: operationName,
          success: true,
        });

        logger.info(`${serviceName} operation completed: ${operationName}`, {
          service: serviceName,
          operation: operationName,
          duration,
        });

        return result;
      } catch (error) {
        logger.error(
          `${serviceName} operation failed: ${operationName}`,
          error as Error,
          {
            service: serviceName,
            operation: operationName,
          },
        );

        timer.endWithError(error as Error, {
          service: serviceName,
          operation: operationName,
        });
        throw error;
      }
    };
  }
}
