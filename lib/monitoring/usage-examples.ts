/**
 * Monitoring System Usage Examples
 *
 * Practical examples of how to integrate the unified monitoring system
 * into various parts of the Logistix application.
 */

// Mock variables for examples - these would be injected in real usage
const database = { products: { create: (_data: any) => ({ id: 1, name: 'Product', price: 100 }), findById: (_id: any) => ({ id: 1, name: 'Product', price: 100 }), update: (_id: any, _data: any) => ({ id: 1, name: 'Product', price: 100 }) }, users: { findByEmail: (_email: any) => ({ email: 'user@example.com', id: 1 }) } } as any;
const cache = { get: (_key: any) => ({}), set: (_key: any, _value: any, _ttl: any) => ({}), delete: (_key: any) => ({}) } as any;
const productData = { name: 'Example Product', price: 100, category: 'test' };

import {
  getUnifiedMonitoring,
  // monitorPerformance, // Commented out as decorators are disabled in examples
  createOperationLogger,
  logBusinessEvent,
  logSecurityEvent,
  monitorDatabaseQuery,
  monitorCacheOperation,
} from './index';

// ============================================================================
// API ROUTE MONITORING EXAMPLE
// ============================================================================

/**
 * Example: Monitoring an API route handler
 */
export async function exampleApiRouteHandler(request: any, response: any) {
  const monitoring = getUnifiedMonitoring();
  const operationLogger = createOperationLogger('api.products.create');
  
  try {
    // Log the incoming request
    monitoring.logEvent('system', 'API request received', 'info', {
      method: request.method,
      path: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    // Validate request data
    const productData = request.body;
    if (!productData.name || !productData.price) {
      monitoring.logEvent('system', 'Invalid request data', 'warn', {
        missingFields: !productData.name ? 'name' : 'price',
      });
      
      return response.status(400).json({ error: 'Missing required fields' });
    }

    // Monitor database operation
    const product = await monitorDatabaseQuery('create-product', async () => {
      return await database.products.create(productData);
    });

    // Log business event
    logBusinessEvent('product-created', 'product', product.id, {
      name: product.name,
      price: product.price,
      category: product.category,
    });

    // Record successful operation
    operationLogger.success({
      productId: product.id,
      productName: product.name,
    });

    return response.status(201).json({ product });

  } catch (error) {
    // Log error and record failed operation
    monitoring.logEvent('error', 'Product creation failed', 'error', {
      error: error instanceof Error ? error.message : String(error),
      productData: productData?.name || 'unknown',
    });

    operationLogger.failure(error as Error, {
      productData: productData?.name || 'unknown',
    });

    return response.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================================
// SERVICE CLASS MONITORING EXAMPLE
// ============================================================================

/**
 * Example: Service class with monitoring decorators
 */
export class ProductService {
  private monitoring = getUnifiedMonitoring();

  // @monitorPerformance('ProductService.findById') // Commented out for example compilation
  async findById(id: string) {
    // Monitor cache operation
    const cached = await monitorCacheOperation('get', `product:${id}`, async () => {
      return await cache.get(`product:${id}`);
    });

    if (cached) {
      this.monitoring.logEvent('system', 'Product found in cache', 'debug', {
        productId: id,
      });
      return cached;
    }

    // Monitor database query
    const product = await monitorDatabaseQuery('find-product-by-id', async () => {
      return await database.products.findById(id);
    });

    if (product) {
      // Cache the result
      await monitorCacheOperation('set', `product:${id}`, async () => {
        return await cache.set(`product:${id}`, product, 300); // 5 minutes
      });
    }

    return product;
  }

  // @monitorPerformance('ProductService.updatePrice') // Commented out for example compilation
  async updatePrice(id: string, newPrice: number, userId: string) {
    const operationLogger = createOperationLogger('update-product-price');

    try {
      // Validate price
      if (newPrice <= 0) {
        throw new Error('Price must be positive');
      }

      // Get current product
      const product = await this.findById(id);
      if (!product) {
        throw new Error('Product not found');
      }

      const oldPrice = product.price;

      // Update in database
      const updatedProduct = await monitorDatabaseQuery('update-product-price', async () => {
        return await database.products.update(id, { price: newPrice });
      });

      // Invalidate cache
      await monitorCacheOperation('delete', `product:${id}`, async () => {
        return await cache.delete(`product:${id}`);
      });

      // Log business event
      logBusinessEvent('product-price-updated', 'product', id, {
        oldPrice,
        newPrice,
        userId,
        priceChange: newPrice - oldPrice,
        percentageChange: ((newPrice - oldPrice) / oldPrice) * 100,
      });

      operationLogger.success({
        productId: id,
        oldPrice,
        newPrice,
      });

      return updatedProduct;

    } catch (error) {
      operationLogger.failure(error as Error, {
        productId: id,
        newPrice,
      });
      throw error;
    }
  }
}

// ============================================================================
// AUTHENTICATION MONITORING EXAMPLE
// ============================================================================

/**
 * Example: Authentication service with security logging
 */
export class AuthService {
  private monitoring = getUnifiedMonitoring();

  // @monitorPerformance('AuthService.login') // Commented out for example compilation
  async login(email: string, password: string, request: any) {
    const operationLogger = createOperationLogger('user-login');

    try {
      // Log login attempt
      this.monitoring.logEvent('security', 'Login attempt', 'info', {
        email,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Find user
      const user = await monitorDatabaseQuery('find-user-by-email', async () => {
        return await database.users.findByEmail(email);
      });

      if (!user) {
        // Log security event for non-existent user
        logSecurityEvent('login-attempt-invalid-user', 'medium', {
          email,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });

        operationLogger.failure(new Error('Invalid credentials'), {
          reason: 'user-not-found',
        });

        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        // Log security event for invalid password
        logSecurityEvent('login-attempt-invalid-password', 'medium', {
          userId: user.id,
          email,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        });

        operationLogger.failure(new Error('Invalid credentials'), {
          reason: 'invalid-password',
          userId: user.id,
        });

        throw new Error('Invalid credentials');
      }

      // Generate session token
      const token = await this.generateToken(user.id);

      // Log successful login
      logSecurityEvent('login-successful', 'low', {
        userId: user.id,
        email,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      logBusinessEvent('user-login', 'user', user.id, {
        email,
        lastLogin: new Date().toISOString(),
      });

      operationLogger.success({
        userId: user.id,
        email,
      });

      return { user, token };

    } catch (error) {
      // Additional error logging is handled by the operation logger
      throw error;
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Simulate password verification
    return await monitorDatabaseQuery('verify-password', async () => {
      // Your password verification logic here
      return password === hash; // Simplified for example
    });
  }

  private async generateToken(userId: string): Promise<string> {
    return await monitorDatabaseQuery('generate-token', async () => {
      // Your token generation logic here
      return `token-${userId}-${Date.now()}`;
    });
  }
}

// ============================================================================
// BACKGROUND JOB MONITORING EXAMPLE
// ============================================================================

/**
 * Example: Background job with comprehensive monitoring
 */
export class DataSyncJob {
  private monitoring = getUnifiedMonitoring();

  async run() {
    const jobLogger = createOperationLogger('data-sync-job');
    
    try {
      this.monitoring.logEvent('system', 'Data sync job started', 'info', {
        jobId: `sync-${Date.now()}`,
        scheduledTime: new Date().toISOString(),
      });

      // Step 1: Fetch external data
      const externalData = await this.fetchExternalData();
      jobLogger.checkpoint('External data fetched', {
        recordCount: externalData.length,
      });

      // Step 2: Process data
      const processedData = await this.processData(externalData);
      jobLogger.checkpoint('Data processed', {
        processedCount: processedData.length,
        skippedCount: externalData.length - processedData.length,
      });

      // Step 3: Update database
      const updateResults = await this.updateDatabase(processedData);
      jobLogger.checkpoint('Database updated', {
        insertedCount: updateResults.inserted,
        updatedCount: updateResults.updated,
        errorCount: updateResults.errors,
      });

      // Step 4: Clear cache
      await this.clearRelatedCache();
      jobLogger.checkpoint('Cache cleared');

      // Log business event
      logBusinessEvent('data-sync-completed', 'system', 'data-sync', {
        totalRecords: externalData.length,
        processedRecords: processedData.length,
        insertedRecords: updateResults.inserted,
        updatedRecords: updateResults.updated,
        errorRecords: updateResults.errors,
      });

      jobLogger.success({
        totalRecords: externalData.length,
        processedRecords: processedData.length,
        results: updateResults,
      });

      this.monitoring.logEvent('system', 'Data sync job completed successfully', 'info', {
        duration: Date.now() - parseInt(jobLogger.toString().split('-')[1] || '0'),
        results: updateResults,
      });

    } catch (error) {
      this.monitoring.logEvent('error', 'Data sync job failed', 'error', {
        error: error instanceof Error ? error.message : String(error),
      });

      jobLogger.failure(error as Error);

      // Create critical alert for job failure
      await this.monitoring.createAlert(
        'system',
        'high',
        'Data Sync Job Failed',
        `The scheduled data sync job failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          jobType: 'data-sync',
          failureTime: new Date().toISOString(),
        }
      );

      throw error;
    }
  }

  private async fetchExternalData(): Promise<any[]> {
    return await monitorDatabaseQuery('fetch-external-data', async () => {
      // Simulate external API call
      return [{ id: 1, name: 'Test' }, { id: 2, name: 'Test 2' }];
    });
  }

  private async processData(data: any[]): Promise<any[]> {
    const operationLogger = createOperationLogger('process-sync-data');
    
    try {
      // Simulate data processing
      const processed = data.filter(item => item.name && item.id);
      
      operationLogger.success({
        inputCount: data.length,
        outputCount: processed.length,
      });

      return processed;
    } catch (error) {
      operationLogger.failure(error as Error, {
        inputCount: data.length,
      });
      throw error;
    }
  }

  private async updateDatabase(data: any[]): Promise<{ inserted: number; updated: number; errors: number }> {
    return await monitorDatabaseQuery('bulk-update-sync-data', async () => {
      // Simulate database updates
      return {
        inserted: Math.floor(data.length * 0.7),
        updated: Math.floor(data.length * 0.3),
        errors: 0,
      };
    });
  }

  private async clearRelatedCache(): Promise<void> {
    await monitorCacheOperation('clear', 'sync-data-*', async () => {
      // Simulate cache clearing
      return Promise.resolve();
    });
  }
}

// ============================================================================
// ERROR HANDLING MONITORING EXAMPLE
// ============================================================================

/**
 * Example: Global error handler with monitoring
 */
export class GlobalErrorHandler {
  private monitoring = getUnifiedMonitoring();

  handleError(error: Error, context: any = {}) {
    // Determine error severity
    const severity = this.determineErrorSeverity(error);
    
    // Log structured error
    this.monitoring.logEvent('error', error.message, 'error', {
      errorType: error.constructor.name,
      stack: error.stack,
      severity,
      ...context,
    });

    // Create alert for critical errors
    if (severity === 'critical') {
      this.monitoring.createAlert(
        'system',
        'critical',
        'Critical System Error',
        error.message,
        {
          errorType: error.constructor.name,
          context,
          timestamp: new Date().toISOString(),
        }
      );
    }

    // Log security event if it's a security-related error
    if (this.isSecurityError(error)) {
      logSecurityEvent('security-error-detected', severity as any, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        ...context,
      });
    }
  }

  private determineErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    // Database connection errors are critical
    if (error.message.includes('database') || error.message.includes('connection')) {
      return 'critical';
    }

    // Authentication/authorization errors are high
    if (error.message.includes('auth') || error.message.includes('permission')) {
      return 'high';
    }

    // Validation errors are medium
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  private isSecurityError(error: Error): boolean {
    const securityKeywords = ['auth', 'permission', 'unauthorized', 'forbidden', 'token', 'session'];
    return securityKeywords.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    );
  }
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export const monitoringExamples = {
  ProductService,
  AuthService,
  DataSyncJob,
  GlobalErrorHandler,
  exampleApiRouteHandler,
};

export default monitoringExamples;