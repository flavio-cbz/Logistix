#!/usr/bin/env ts-node

/**
 * Test runner script for the Logistix project
 * Runs all test suites and generates coverage reports
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
// import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests - Services',
    pattern: 'tests/unit/services/**/*.test.ts',
    description: 'Tests for service layer business logic'
  },
  {
    name: 'Unit Tests - Repositories',
    pattern: 'tests/unit/repositories/**/*.test.ts',
    description: 'Tests for repository layer data access'
  },
  {
    name: 'Unit Tests - Database',
    pattern: 'tests/unit/database/**/*.test.ts',
    description: 'Tests for database service and utilities'
  },
  {
    name: 'Integration Tests - API',
    pattern: 'tests/integration/**/*.test.ts',
    description: 'Tests for API routes and database integration'
  }
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`\n${description}`, 'cyan');
    log(`Running: ${command}`, 'blue');
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    log('✅ Success', 'green');
    return true;
  } catch (error) {
    log('❌ Failed', 'red');
    if (error instanceof Error) {
      log(`Error: ${error.message}`, 'red');
    }
    return false;
  }
}

function checkTestFiles(): boolean {
  log('\n📋 Checking test files...', 'yellow');
  
  const testFiles = [
    'tests/setup/test-setup.ts',
    'tests/setup/database-mocks.ts',
    'tests/setup/service-mocks.ts',
    'tests/setup/test-data-factory.ts',
    'tests/utils/test-helpers.ts',
    'tests/unit/services/base-service.test.ts',
    
    'tests/unit/services/parcelle-service.test.ts',
    'tests/unit/services/auth-service.test.ts',
    'tests/unit/repositories/base-repository.test.ts',
    'tests/unit/database/database-service.test.ts',
    'tests/integration/api-test-setup.ts',
    'tests/integration/auth-api.test.ts',
    'tests/integration/products-api.test.ts',
    'tests/integration/parcelles-api.test.ts',
    'tests/integration/database-integration.test.ts'
  ];

  let allFilesExist = true;
  
  for (const file of testFiles) {
    if (existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - Missing`, 'red');
      allFilesExist = false;
    }
  }

  return allFilesExist;
}

function runTestSuite(suite: TestSuite): boolean {
  log(`\n🧪 ${suite.name}`, 'magenta');
  log(`   ${suite.description}`, 'blue');
  
  const command = `npx vitest run "${suite.pattern}" --reporter=verbose`;
  return runCommand(command, `Running ${suite.name}`);
}

function runAllTests(): boolean {
  log('\n🚀 Running all tests...', 'cyan');
  
  const command = 'npx vitest run --reporter=verbose';
  return runCommand(command, 'Running complete test suite');
}

function generateCoverage(): boolean {
  log('\n📊 Generating coverage report...', 'cyan');
  
  const command = 'npx vitest run --coverage --reporter=verbose';
  return runCommand(command, 'Generating test coverage report');
}

function main() {
  log('🧪 Logistix Test Runner', 'bright');
  log('========================', 'bright');

  // Check if all test files exist
  if (!checkTestFiles()) {
    log('\n❌ Some test files are missing. Please ensure all test files are created.', 'red');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const runCoverage = args.includes('--coverage');
  const runSpecific = args.find(arg => arg.startsWith('--suite='));
  
  let success = true;

  if (runSpecific) {
    const suiteName = runSpecific.split('=')[1];
    const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
    
    if (suite) {
      success = runTestSuite(suite);
    } else {
      log(`\n❌ Test suite "${suiteName}" not found.`, 'red');
      log('\nAvailable test suites:', 'yellow');
      testSuites.forEach(s => log(`  - ${s.name}`, 'blue'));
      process.exit(1);
    }
  } else {
    // Run all test suites
    for (const suite of testSuites) {
      const suiteSuccess = runTestSuite(suite);
      if (!suiteSuccess) {
        success = false;
      }
    }

    // Run complete test suite
    if (success) {
      success = runAllTests();
    }
  }

  // Generate coverage if requested and tests passed
  if (success && runCoverage) {
    generateCoverage();
  }

  // Final summary
  log('\n📋 Test Summary', 'bright');
  log('===============', 'bright');
  
  if (success) {
    log('✅ All tests passed successfully!', 'green');
    
    if (runCoverage) {
      log('\n📊 Coverage report generated in ./coverage/', 'cyan');
    }
    
    log('\n🎉 Testing infrastructure is ready!', 'green');
    log('\nNext steps:', 'yellow');
    log('  - Run tests with: npm run test', 'blue');
    log('  - Run tests with coverage: npm run test -- --coverage', 'blue');
    log('  - Run specific test suite: npm run test -- --suite=services', 'blue');
    log('  - Run tests in watch mode: npm run test:watch', 'blue');
    
  } else {
    log('❌ Some tests failed. Please check the output above.', 'red');
    process.exit(1);
  }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('🧪 Logistix Test Runner', 'bright');
  log('========================', 'bright');
  log('\nUsage: npm run test:runner [options]', 'yellow');
  log('\nOptions:', 'yellow');
  log('  --coverage          Generate coverage report', 'blue');
  log('  --suite=<name>      Run specific test suite', 'blue');
  log('  --help, -h          Show this help message', 'blue');
  log('\nAvailable test suites:', 'yellow');
  testSuites.forEach(s => log(`  - ${s.name.toLowerCase().replace(/\s+/g, '-')}`, 'blue'));
  log('\nExamples:', 'yellow');
  log('  npm run test:runner', 'blue');
  log('  npm run test:runner -- --coverage', 'blue');
  log('  npm run test:runner -- --suite=services', 'blue');
  process.exit(0);
}

main();