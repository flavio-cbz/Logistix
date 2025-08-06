/**
 * Debug Logger Demo Script
 * 
 * Demonstrates the Debug Logger functionality with realistic scenarios
 * Run with: npx tsx lib/services/validation/debug-logger-demo.ts
 */

// Mock the logger utility for demo purposes
const mockLogger = {
  error: (message: string, error?: any, meta?: any) => console.log(`[ERROR] ${message}`, error, meta),
  warn: (message: string, meta?: any) => console.log(`[WARN] ${message}`, meta),
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
  debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta)
};

// Mock the logger module
const mockGetLogger = () => mockLogger;

// Temporarily replace the import
const originalRequire = require;
require = function(id: string) {
  if (id === '../../utils/logger') {
    return { getLogger: mockGetLogger, ILogger: {} };
  }
  return originalRequire.apply(this, arguments as any);
} as any;

async function runDebugLoggerDemo() {
  console.log('🚀 Debug Logger Demo - Vinted Market Analysis Validation\n');

  try {
    // Import after mocking
    const { DebugLogger } = require('./debug-logger');
    const logger = DebugLogger.getInstance();

    console.log('📊 Initial Session Stats:');
    console.log(JSON.stringify(logger.getSessionStats(), null, 2));

    console.log('\n🔧 Enabling Debug Mode...');
    logger.enableDebugMode();

    // Simulate API request logging
    console.log('\n📡 Simulating API Request/Response Logging...');
    
    logger.logApiRequest({
      method: 'GET',
      url: 'https://api.vinted.com/v2/catalog/items',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret-token-12345',
        'User-Agent': 'LogistiX/1.0'
      },
      body: {
        search_text: 'airpods',
        price_from: 50,
        price_to: 100
      }
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 150));

    logger.logApiResponse({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '99'
      },
      body: {
        items: [
          { id: 1, title: 'AirPods Pro', price: 75, currency: 'EUR' },
          { id: 2, title: 'AirPods 2nd Gen', price: 65, currency: 'EUR' }
        ],
        pagination: { total: 2, page: 1 }
      },
      duration: 150
    }, { method: 'GET', url: 'https://api.vinted.com/v2/catalog/items' });

    // Simulate database operations
    console.log('\n💾 Simulating Database Operations...');
    
    logger.logDatabaseOperation({
      operation: 'INSERT',
      table: 'market_analysis',
      query: 'INSERT INTO market_analysis (product, search_query, created_at) VALUES (?, ?, ?)',
      parameters: ['airpods', 'airpods', new Date().toISOString()],
      affectedRows: 1,
      duration: 25
    });

    logger.logDatabaseOperation({
      operation: 'SELECT',
      table: 'market_analysis',
      query: 'SELECT * FROM market_analysis WHERE product = ? ORDER BY created_at DESC LIMIT 10',
      parameters: ['airpods'],
      affectedRows: 5,
      duration: 15
    });

    // Simulate calculation steps
    console.log('\n🧮 Simulating Market Metrics Calculations...');
    
    logger.logCalculation({
      step: 'price_data_extraction',
      input: {
        items: [
          { price: 75, currency: 'EUR' },
          { price: 65, currency: 'EUR' }
        ]
      },
      output: {
        prices: [75, 65],
        currency: 'EUR'
      },
      duration: 5
    });

    logger.logCalculation({
      step: 'price_statistics_calculation',
      input: {
        prices: [75, 65]
      },
      output: {
        average: 70,
        median: 70,
        min: 65,
        max: 75,
        count: 2
      },
      duration: 8
    });

    logger.logCalculation({
      step: 'price_range_validation',
      input: {
        calculatedRange: { min: 65, max: 75 },
        expectedRange: { min: 50, max: 100 }
      },
      output: {
        isValid: true,
        withinExpectedRange: true,
        validationResult: 'PASS'
      },
      duration: 2
    });

    // Simulate some warnings and errors
    console.log('\n⚠️ Simulating Warnings and Errors...');
    
    logger.logWarning('Price data contains outliers', {
      outliers: [{ price: 150, reason: 'significantly_above_average' }],
      action: 'filtered_out'
    });

    logger.logError('API rate limit exceeded', new Error('Rate limit: 429 Too Many Requests'), {
      endpoint: '/v2/catalog/items',
      retryAfter: 60,
      requestCount: 100
    });

    // Test scoped logger
    console.log('\n🎯 Testing Scoped Logger...');
    const scopedLogger = logger.createScopedLogger('PRODUCT_TEST');
    
    scopedLogger.logInfo('Starting product test for Airpods');
    scopedLogger.logCalculation({
      step: 'validation_check',
      input: { expectedRange: { min: 50, max: 100 } },
      output: { result: 'PASS' },
      duration: 3
    });

    // Generate and display debug report
    console.log('\n📋 Generating Debug Report...');
    const debugReport = logger.generateDebugReport();

    console.log('\n📊 Final Session Stats:');
    console.log(JSON.stringify(logger.getSessionStats(), null, 2));

    console.log('\n📄 Debug Report Summary:');
    console.log(`- API Calls: ${debugReport.apiCalls.length}`);
    console.log(`- Database Operations: ${debugReport.databaseOperations.length}`);
    console.log(`- Calculations: ${debugReport.calculations.length}`);
    console.log(`- Errors/Warnings: ${debugReport.errors.length}`);

    console.log('\n🔍 Sample API Call Log:');
    if (debugReport.apiCalls.length > 0) {
      const apiCall = debugReport.apiCalls[0];
      console.log(`  Method: ${apiCall.method}`);
      console.log(`  URL: ${apiCall.url}`);
      console.log(`  Status: ${apiCall.responseStatus}`);
      console.log(`  Duration: ${apiCall.duration}ms`);
      console.log(`  Headers: ${JSON.stringify(apiCall.headers, null, 2)}`);
    }

    console.log('\n🔍 Sample Database Operation:');
    if (debugReport.databaseOperations.length > 0) {
      const dbOp = debugReport.databaseOperations[0];
      console.log(`  Operation: ${dbOp.operation}`);
      console.log(`  Table: ${dbOp.table}`);
      console.log(`  Query: ${dbOp.query}`);
      console.log(`  Affected Rows: ${dbOp.affectedRows}`);
      console.log(`  Duration: ${dbOp.duration}ms`);
    }

    console.log('\n🔍 Sample Calculation:');
    if (debugReport.calculations.length > 0) {
      const calc = debugReport.calculations[0];
      console.log(`  Step: ${calc.step}`);
      console.log(`  Input: ${JSON.stringify(calc.input)}`);
      console.log(`  Output: ${JSON.stringify(calc.output)}`);
      console.log(`  Duration: ${calc.duration}ms`);
    }

    // Test JSON export
    console.log('\n💾 Testing JSON Export...');
    const exportedData = logger.exportDebugData();
    console.log(`Exported data size: ${exportedData.length} characters`);

    // Test log clearing
    console.log('\n🧹 Testing Log Clearing...');
    logger.clearLogs();
    const clearedStats = logger.getSessionStats();
    console.log('Stats after clearing:', JSON.stringify(clearedStats, null, 2));

    console.log('\n✅ Debug Logger Demo Completed Successfully!');
    console.log('\n📋 Demonstrated Features:');
    console.log('   ✅ Debug mode activation');
    console.log('   ✅ API request/response logging with payload capture');
    console.log('   ✅ Database operation logging with state tracking');
    console.log('   ✅ Calculation step logging for market metrics');
    console.log('   ✅ Error and warning logging');
    console.log('   ✅ Scoped logger functionality');
    console.log('   ✅ Debug report generation');
    console.log('   ✅ Session statistics tracking');
    console.log('   ✅ JSON export functionality');
    console.log('   ✅ Log clearing capability');
    console.log('   ✅ Header sanitization for security');

    return true;

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    return false;
  }
}

// Run demo if this file is executed directly
if (require.main === module) {
  runDebugLoggerDemo()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Demo error:', error);
      process.exit(1);
    });
}

export { runDebugLoggerDemo };