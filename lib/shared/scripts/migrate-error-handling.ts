#!/usr/bin/env node
/**
 * @fileoverview Migration script for error handling
 * @description Helps migrate existing services to use the new centralized error handling system
 * @version 1.0.0
 * @since 2025-01-10
 */

import { migrationService, ERROR_HANDLING_MIGRATION_CHECKLIST } from '../services/error-migration';
// import { logger } from '@/lib/utils/logging/logger'; // Not used in this file

/**
 * Example service migration
 */
class ExampleLegacyService {
  async getData(id: string) {
    try {
      // Simulate some operation
      if (!id) {
        throw new Error('ID is required');
      }
      
      if (id === 'notfound') {
        throw new Error('Data not found');
      }
      
      return { id, data: 'example' };
    } catch (error) {
      // Legacy error handling
      console.error('Error in getData:', error);
      throw error;
    }
  }
}

/**
 * Migrated service example
 */
class ExampleMigratedService extends migrationService.createBaseService() {
  async getData(id: string) {
    return this.executeOperation(async () => {
      if (!id) {
        throw this.createValidationError('ID is required', 'id');
      }
      
      if (id === 'notfound') {
        throw this.createNotFoundError('Data', id);
      }
      
      return { id, data: 'example' };
    }, 'getData');
  }
}

/**
 * Runs migration analysis and generates reports
 */
async function runMigrationAnalysis() {
  console.log('🔍 Analyzing services for error handling migration...\n');

  // Analyze legacy service
  const legacyService = new ExampleLegacyService();
  const legacyStatus = migrationService.analyzeService(legacyService, 'ExampleLegacyService');
  
  console.log('📊 Legacy Service Analysis:');
  console.log(`  Service: ${legacyStatus.serviceName}`);
  console.log(`  Migration Score: ${legacyStatus.migrationScore}/100`);
  console.log(`  Is Migrated: ${legacyStatus.isMigrated ? '✅' : '❌'}`);
  console.log(`  Has New Error Methods: ${legacyStatus.hasNewErrorMethods ? '✅' : '❌'}`);
  console.log(`  Has Legacy Patterns: ${legacyStatus.hasLegacyErrorPatterns ? '⚠️' : '✅'}`);
  
  if (legacyStatus.recommendations.length > 0) {
    console.log('  Recommendations:');
    legacyStatus.recommendations.forEach(rec => console.log(`    - ${rec}`));
  }
  console.log();

  // Analyze migrated service
  const migratedService = new ExampleMigratedService();
  const migratedStatus = migrationService.analyzeService(migratedService, 'ExampleMigratedService');
  
  console.log('📊 Migrated Service Analysis:');
  console.log(`  Service: ${migratedStatus.serviceName}`);
  console.log(`  Migration Score: ${migratedStatus.migrationScore}/100`);
  console.log(`  Is Migrated: ${migratedStatus.isMigrated ? '✅' : '❌'}`);
  console.log(`  Has New Error Methods: ${migratedStatus.hasNewErrorMethods ? '✅' : '❌'}`);
  console.log(`  Has Legacy Patterns: ${migratedStatus.hasLegacyErrorPatterns ? '⚠️' : '✅'}`);
  
  if (migratedStatus.recommendations.length > 0) {
    console.log('  Recommendations:');
    migratedStatus.recommendations.forEach(rec => console.log(`    - ${rec}`));
  }
  console.log();

  // Generate migration checklist
  console.log('📋 Migration Checklist:');
  const checklist = migrationService.generateMigrationChecklist('YourService');
  checklist.forEach(item => {
    const status = item.completed ? '✅' : '❌';
    const required = item.required ? '(Required)' : '(Optional)';
    console.log(`  ${status} ${item.description} ${required}`);
  });
  console.log();

  // Generate overall migration report
  const report = migrationService.generateMigrationReport();
  console.log('📈 Migration Report:');
  console.log(`  Total Services: ${report.totalServices}`);
  console.log(`  Migrated Services: ${report.migratedServices}`);
  console.log(`  Migration Progress: ${report.migrationProgress.toFixed(1)}%`);
  
  if (report.overallRecommendations.length > 0) {
    console.log('  Overall Recommendations:');
    report.overallRecommendations.forEach(rec => console.log(`    - ${rec}`));
  }
  console.log();

  // Show migration checklist
  console.log('📝 Error Handling Migration Checklist:');
  ERROR_HANDLING_MIGRATION_CHECKLIST.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item}`);
  });
}

/**
 * Demonstrates error handling migration
 */
async function demonstrateErrorHandling() {
  console.log('🧪 Demonstrating Error Handling Migration...\n');

  const legacyService = new ExampleLegacyService();
  const migratedService = new ExampleMigratedService('req_123', 'user_456');

  // Test legacy service
  console.log('🔴 Legacy Service Error Handling:');
  try {
    await legacyService.getData('');
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`  Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`  Has context: No`);
  }
  console.log();

  // Test migrated service
  console.log('🟢 Migrated Service Error Handling:');
  try {
    await migratedService.getData('');
  } catch (error) {
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`  Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.log(`  Has context: Yes`);
    if (error && typeof error === 'object' && 'context' in error) {
      console.log(`  Context:`, (error as any).context);
    }
  }
  console.log();
}

/**
 * Main migration script
 */
async function main() {
  try {
    console.log('🚀 Error Handling Migration Script\n');
    
    await runMigrationAnalysis();
    await demonstrateErrorHandling();
    
    console.log('✅ Migration analysis complete!');
    console.log('\n📚 Next Steps:');
    console.log('1. Review the migration checklist for each service');
    console.log('2. Update services to extend BaseService or implement error handling interface');
    console.log('3. Replace legacy error patterns with CleanupError classes');
    console.log('4. Add proper error context and logging');
    console.log('5. Test error handling in development environment');
    
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runMigrationScript };