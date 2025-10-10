/**
 * Monitoring System Integration Test
 * 
 * Simple test to verify the unified monitoring system is working correctly.
 * This can be run to validate the implementation.
 */

import { getUnifiedMonitoring, initializeMonitoring, quickHealthCheck } from './index';
import { getCompleteMonitoringConfig, validateMonitoringConfig } from './monitoring-config';

/**
 * Run basic integration tests for the monitoring system
 */
export async function runMonitoringIntegrationTest(): Promise<{
  success: boolean;
  results: Array<{ test: string; passed: boolean; message: string; duration: number }>;
  summary: { total: number; passed: number; failed: number };
}> {
  const results: Array<{ test: string; passed: boolean; message: string; duration: number }> = [];

  // Test 1: Configuration validation
  const configTest = await runTest('Configuration Validation', async () => {
    const config = getCompleteMonitoringConfig();
    const validation = validateMonitoringConfig(config);
    
    if (!validation.valid) {
      throw new Error(`Configuration invalid: ${validation.errors.join(', ')}`);
    }
    
    return 'Configuration is valid';
  });
  results.push(configTest);

  // Test 2: Monitoring initialization
  const initTest = await runTest('Monitoring Initialization', async () => {
    const monitoring = initializeMonitoring({
      enablePerformanceTracking: true,
      enableHealthChecks: true,
      enableAlerting: false, // Disable alerts for testing
      enableStructuredLogging: true,
      logLevel: 'info',
      metricsRetentionPeriod: 60000, // 1 minute for testing
      healthCheckInterval: 60000, // 1 minute for testing
      alertCooldownPeriod: 30000, // 30 seconds for testing
    });
    
    if (!monitoring) {
      throw new Error('Failed to initialize monitoring');
    }
    
    return 'Monitoring initialized successfully';
  });
  results.push(initTest);

  // Test 3: Performance recording
  const perfTest = await runTest('Performance Recording', async () => {
    const monitoring = getUnifiedMonitoring();
    
    // Record a test performance metric
    monitoring.recordPerformance('test-operation', 150, true, {
      testData: 'integration-test',
    });
    
    return 'Performance metric recorded successfully';
  });
  results.push(perfTest);

  // Test 4: Structured logging
  const loggingTest = await runTest('Structured Logging', async () => {
    const monitoring = getUnifiedMonitoring();
    
    // Test different log types
    monitoring.logEvent('system', 'Integration test started', 'info', {
      testId: 'monitoring-integration-test',
    });
    
    monitoring.logEvent('business', 'Test business event', 'info', {
      entityType: 'test',
      entityId: 'test-123',
    });
    
    return 'Structured logging working correctly';
  });
  results.push(loggingTest);

  // Test 5: Health checks
  const healthTest = await runTest('Health Checks', async () => {
    const healthStatus = await quickHealthCheck();
    
    if (!healthStatus) {
      throw new Error('Health check returned null');
    }
    
    if (!healthStatus.checks || healthStatus.checks.length === 0) {
      throw new Error('No health checks found');
    }
    
    return `Health check completed with ${healthStatus.checks.length} checks`;
  });
  results.push(healthTest);

  // Test 6: System status
  const statusTest = await runTest('System Status', async () => {
    const monitoring = getUnifiedMonitoring();
    const systemStatus = await monitoring.getSystemStatus();
    
    if (!systemStatus) {
      throw new Error('System status returned null');
    }
    
    if (!systemStatus.overall) {
      throw new Error('System status missing overall status');
    }
    
    return `System status: ${systemStatus.overall}`;
  });
  results.push(statusTest);

  // Test 7: Critical metrics
  const metricsTest = await runTest('Critical Metrics', async () => {
    const monitoring = getUnifiedMonitoring();
    const criticalMetrics = monitoring.getCriticalMetrics();
    
    // Should be an array (might be empty)
    if (!Array.isArray(criticalMetrics)) {
      throw new Error('Critical metrics should return an array');
    }
    
    return `Found ${criticalMetrics.length} critical metrics`;
  });
  results.push(metricsTest);

  // Test 8: Alert creation (if enabled)
  const alertTest = await runTest('Alert Creation', async () => {
    const monitoring = getUnifiedMonitoring();
    
    try {
      const alert = await monitoring.createAlert(
        'system',
        'low',
        'Integration Test Alert',
        'This is a test alert created during integration testing',
        { testAlert: true }
      );
      
      if (!alert || !alert.id) {
        throw new Error('Alert creation failed');
      }
      
      return `Alert created with ID: ${alert.id}`;
    } catch (error) {
      // If alerting is disabled, this is expected
      if (error instanceof Error && error.message.includes('disabled')) {
        return 'Alert creation skipped (alerting disabled)';
      }
      throw error;
    }
  });
  results.push(alertTest);

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const success = failed === 0;

  return {
    success,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
    },
  };
}

/**
 * Helper function to run individual tests with timing
 */
async function runTest(
  testName: string,
  testFn: () => Promise<string>
): Promise<{ test: string; passed: boolean; message: string; duration: number }> {
  const startTime = Date.now();
  
  try {
    const message = await testFn();
    const duration = Date.now() - startTime;
    
    return {
      test: testName,
      passed: true,
      message,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      test: testName,
      passed: false,
      message: `FAILED: ${message}`,
      duration,
    };
  }
}

/**
 * Run the integration test and log results
 */
export async function runAndLogMonitoringTest(): Promise<boolean> {
  console.log('🔍 Running Monitoring System Integration Test...\n');
  
  const testResults = await runMonitoringIntegrationTest();
  
  // Log individual test results
  testResults.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const duration = `(${result.duration}ms)`;
    console.log(`${status} ${result.test} ${duration}`);
    console.log(`   ${result.message}\n`);
  });
  
  // Log summary
  console.log('📊 Test Summary:');
  console.log(`   Total: ${testResults.summary.total}`);
  console.log(`   Passed: ${testResults.summary.passed}`);
  console.log(`   Failed: ${testResults.summary.failed}`);
  console.log(`   Success: ${testResults.success ? '✅' : '❌'}\n`);
  
  if (testResults.success) {
    console.log('🎉 All monitoring system tests passed!');
  } else {
    console.log('⚠️  Some monitoring system tests failed. Please check the implementation.');
  }
  
  return testResults.success;
}

// Export for use in other test files
export default {
  runMonitoringIntegrationTest,
  runAndLogMonitoringTest,
};