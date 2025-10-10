#!/usr/bin/env ts-node
/**
 * Comprehensive API Test Runner
 * 
 * This script runs all API tests and provides a summary of the results,
 * identifying which routes are working and which have issues.
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  route: string;
  method: string;
  status: number | null;
  error: string | undefined;
  duration: number | undefined;
  working: boolean;
}

class ApiTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private baseURL: string = process.env.BASE_URL || 'http://localhost:3000';
  private port: string = process.env.PORT || '3000';

  constructor() {
    this.baseURL = `http://localhost:${this.port}`;
  }

  /**
   * Start the Next.js development server
   */
  async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting Next.js development server...');
      
      // Kill any existing process on the port
      try {
        execSync(`lsof -ti:${this.port} | xargs kill -9`, { stdio: 'pipe' });
      } catch (error) {
        // Port was not in use, which is fine
      }

      const server = spawn('npm', ['run', 'dev'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: this.port }
      });

      // Store server reference to terminate later if needed
      (global as any).testServer = server;

      let serverReady = false;
      const timeout = setTimeout(() => {
        if (!serverReady) {
          console.error('❌ Server failed to start within 30 seconds');
          server.kill();
          reject(new Error('Server start timeout'));
        }
      }, 30000);

      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(output);

        // Check if the server is ready
        if (output.includes('ready') || output.includes('started') || output.includes('Local:')) {
          clearTimeout(timeout);
          serverReady = true;
          console.log('✅ Server started successfully');
          resolve();
        }
      });

      server.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error(errorOutput);
        
        if (errorOutput.includes('EADDRINUSE') || errorOutput.includes('port')) {
          clearTimeout(timeout);
          server.kill();
          reject(new Error(`Port ${this.port} is already in use`));
        }
      });

      server.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Wait for the server to be ready
   */
  async waitForServer(maxAttempts: number = 30): Promise<void> {
    console.log('⏳ Waiting for server to be ready...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Try to make a simple request to the health endpoint
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch(`${this.baseURL}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.status >= 200 && response.status < 500) {
          console.log(`✅ Server is ready on attempt ${attempt}`);
          return;
        }
      } catch (error) {
        console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Server not ready yet...`);
      }
      
      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Server failed to become ready within the timeout period');
  }

  /**
   * Run tests for all API routes
   */
  async runTests(): Promise<void> {
    this.startTime = Date.now();
    console.log('🧪 Starting API tests...\n');
    
    // Define test routes to check
    const testRoutes = [
      // GET routes
      { route: '/api/health', method: 'GET' },
      { route: '/api/metrics', method: 'GET' },
      { route: '/api/v1/metrics', method: 'GET' },
      { route: '/api/v1/auth/validate-session', method: 'GET' },
      { route: '/api/v1/produits', method: 'GET' },
      { route: '/api/v1/parcelles', method: 'GET' },
      { route: '/api/v1/parcelles/stats', method: 'GET' },
      { route: '/api/v1/produits/stats', method: 'GET' },
      { route: '/api/v1/profile', method: 'GET' },
      { route: '/api/v1/settings', method: 'GET' },
      { route: '/api/v1/statistics/dashboard', method: 'GET' },
      { route: '/api/v1/search/advanced', method: 'GET' },
      { route: '/api/v1/notifications', method: 'GET' },
      { route: '/api/v1/market-analysis/status', method: 'GET' },
      { route: '/api/v1/vinted/categories', method: 'GET' },
      // { route: '/api/client/products', method: 'GET' }, // REMOVED: obsolete route
      { route: '/api/v1/database/health', method: 'GET' },
      { route: '/api/v1/data/stats', method: 'GET' },
      
      // POST routes
      { route: '/api/v1/auth/login', method: 'POST' },
      { route: '/api/v1/auth/logout', method: 'POST' },
      { route: '/api/v1/produits', method: 'POST' },
      { route: '/api/v1/parcelles', method: 'POST' },
      { route: '/api/v1/notifications/read', method: 'POST' },
      { route: '/api/v1/vinted/categories/clear-cache', method: 'POST' },
      { route: '/api/v1/data/import', method: 'POST' },
      { route: '/api/v1/data/sync', method: 'POST' },
      { route: '/api/v1/cache/clear', method: 'POST' },
      { route: '/api/v1/market-analysis/predict', method: 'POST' },
      { route: '/api/v1/market-analysis/compare', method: 'POST' },
      
      // PUT/PATCH routes (if they exist)
      { route: '/api/v1/produits', method: 'PUT' },
      { route: '/api/v1/parcelles', method: 'PUT' },
      
      // DELETE routes
      { route: '/api/v1/parcelles', method: 'DELETE' },
      { route: '/api/v1/produits', method: 'DELETE' },
      { route: '/api/v1/notifications', method: 'DELETE' },
    ];

    // Run tests for each route
    for (const test of testRoutes) {
      await this.testRoute(test.route, test.method as 'GET' | 'POST' | 'PUT' | 'DELETE');
    }
  }

  /**
   * Test a specific route
   */
  async testRoute(route: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE'): Promise<void> {
    const startTime = Date.now();
    let status: number | null = null;
    let error: string | undefined;
    let working = false;

    try {
      // Prepare request options based on method
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add body for POST/PUT/DELETE requests
      if (method !== 'GET') {
        if (route.includes('/login')) {
          options.body = JSON.stringify({
            username: 'test',
            password: 'test'
          });
        } else if (route.includes('/produits') || route.includes('/parcelles')) {
          options.body = JSON.stringify({
            test: true
          });
        } else {
          // For other routes, send empty object
          options.body = JSON.stringify({});
        }
      }

      const response = await fetch(`${this.baseURL}${route}`, options);
      status = response.status;
      
      // Consider the route working if it returns a status code < 500
      // (excluding 404 for routes with placeholders like /[id])
      working = status < 500 && (status !== 404 || !route.includes('['));
      
    } catch (err: unknown) {
      const error = err as Error;
      error = error.message || 'Unknown error';
      working = false;
    }

    const duration = Date.now() - startTime;

    const result: TestResult = {
      route,
      method,
      status,
      error,
      duration,
      working
    };

    this.results.push(result);

    // Print immediate result
    const statusEmoji = working ? '✅' : '❌';
    const statusText = status !== null ? `Status: ${status}` : `Error: ${error}`;
    console.log(`${statusEmoji} ${method} ${route} - ${statusText} (${duration}ms)`);
  }

  /**
   * Generate and print the test report
   */
  generateReport(): void {
    const totalTime = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const workingTests = this.results.filter(r => r.working).length;
    const failingTests = totalTests - workingTests;
    
    const workingPercentage = Math.round((workingTests / totalTests) * 100);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 API TESTS COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Working: ${workingTests}`);
    console.log(`Failing: ${failingTests}`);
    console.log(`Success Rate: ${workingPercentage}%`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log('='.repeat(60));
    
    if (failingTests > 0) {
      console.log('\n❌ FAILING ROUTES:');
      const failingRoutes = this.results.filter(r => !r.working);
      failingRoutes.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.route}`);
        console.log(`   Status: ${result.status}, Error: ${result.error}`);
      });
    }
    
    if (workingTests > 0) {
      console.log('\n✅ WORKING ROUTES:');
      const workingRoutes = this.results.filter(r => r.working);
      workingRoutes.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.route} (${result.status})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Create detailed report file
    this.createDetailedReport(workingTests, failingTests, workingPercentage, totalTime);
  }

  /**
   * Create a detailed report file
   */
  createDetailedReport(working: number, failing: number, percentage: number, totalTime: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.length,
        working,
        failing,
        successRate: percentage,
        totalTimeMs: totalTime
      },
      results: this.results,
      details: {
        baseURL: this.baseURL,
        environment: process.env.NODE_ENV || 'development'
      }
    };
    
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `api-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Clean up - terminate the server process
   */
  cleanup(): void {
    console.log('\n🧹 Cleaning up...');
    if ((global as any).testServer) {
      (global as any).testServer.kill();
    }
  }

  /**
   * Run the complete test suite
   */
  async run(): Promise<void> {
    try {
      // Start the server
      await this.startServer();
      
      // Wait for server to be ready
      await this.waitForServer();
      
      // Run tests
      await this.runTests();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('💥 Error during testing:', error);
      this.generateReport(); // Still generate report even if there was an error
    } finally {
      // Cleanup
      this.cleanup();
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  (async () => {
    // Check if Next.js is available
    try {
      execSync('npm run dev --help', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ Next.js does not appear to be installed or configured properly');
      process.exit(1);
    }
    
    const runner = new ApiTestRunner();
    await runner.run();
  })();
}

export default ApiTestRunner;