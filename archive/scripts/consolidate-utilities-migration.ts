#!/usr/bin/env tsx
/**
 * @fileoverview Migration script for consolidated utilities
 * @description Updates imports across the codebase to use consolidated utilities
 * @version 1.0.0
 * @since 2025-01-10
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportMapping {
  from: string;
  to: string;
  exports: string[];
}

/**
 * Import mappings for the consolidation
 */
const IMPORT_MAPPINGS: ImportMapping[] = [
  // Formatting utilities
  {
    from: 'lib/utils/product-calculations',
    to: '@/lib/shared/utils',
    exports: ['formatEuro']
  },
  // Logger utilities
  {
    from: 'lib/utils/logging',
    to: '@/lib/shared/utils',
    exports: ['ConsoleLogger', 'getLogger', 'securityLogger', 'performanceLogger', 'auditLogger']
  },
  {
    from: 'lib/utils/logging/simple-logger',
    to: '@/lib/shared/utils',
    exports: ['SimpleLogger', 'logger', 'getLogger', 'Logger']
  },
  {
    from: 'lib/utils/logging/edge-logger',
    to: '@/lib/shared/utils',
    exports: ['edgeLogger', 'EdgeLogger', 'IEdgeLogger']
  },
  // Error handling utilities
  {
    from: 'lib/utils/error-handler',
    to: '@/lib/shared/utils',
    exports: ['ErrorHandler', 'useErrorHandler', 'formatApiError']
  },
  {
    from: 'lib/utils/error-migration-helper',
    to: '@/lib/shared/utils',
    exports: ['ErrorMigrationHelper', 'migrateErrorHandling']
  },
  {
    from: 'lib/services/validation/error-handler',
    to: '@/lib/shared/utils',
    exports: ['ErrorHandler', 'errorHandler']
  },
  {
    from: 'lib/services/database/error-handler',
    to: '@/lib/shared/utils',
    exports: ['DatabaseErrorHandler', 'errorHandler']
  },
  {
    from: 'lib/middleware/error-handling',
    to: '@/lib/shared/utils',
    exports: ['createErrorHandler']
  }
];

/**
 * Files to exclude from migration
 */
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/lib/shared/utils/**', // Don't modify the new consolidated files
  '**/scripts/**', // Don't modify scripts
];

/**
 * Updates import statements in a file
 */
function updateImports(filePath: string, content: string): string {
  let updatedContent = content;

  for (const mapping of IMPORT_MAPPINGS) {
    // Handle different import patterns
    const patterns = [
      // Named imports: import { export1, export2 } from 'module'
      new RegExp(`import\\s*{([^}]+)}\\s*from\\s*['"]${mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
      // Default imports: import module from 'module'
      new RegExp(`import\\s+([\\w]+)\\s+from\\s*['"]${mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
      // Mixed imports: import module, { export1 } from 'module'
      new RegExp(`import\\s+([\\w]+),\\s*{([^}]+)}\\s*from\\s*['"]${mapping.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
    ];

    patterns.forEach(pattern => {
      updatedContent = updatedContent.replace(pattern, (match, ...groups) => {
        // Check if any of the imported items are in our mapping
        const importedItems = groups.join(',').split(',').map(item => item.trim()).filter(Boolean);
        const relevantItems = importedItems.filter(item => 
          mapping.exports.some(exp => item.includes(exp))
        );

        if (relevantItems.length > 0) {
          // Replace with new import
          if (groups.length === 1) {
            // Named imports only
            return `import { ${groups[0]} } from '${mapping.to}'`;
          } else if (groups.length === 2) {
            // Mixed imports
            return `import ${groups[0]}, { ${groups[1]} } from '${mapping.to}'`;
          }
        }
        return match;
      });
    });
  }

  return updatedContent;
}

/**
 * Processes a single file
 */
async function processFile(filePath: string): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const updatedContent = updateImports(filePath, content);

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

/**
 * Main migration function
 */
async function migrateUtilities(): Promise<void> {
  console.log('🚀 Starting utilities consolidation migration...\n');

  // Find all TypeScript and JavaScript files
  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: EXCLUDE_PATTERNS,
    cwd: process.cwd(),
  });

  console.log(`📁 Found ${files.length} files to process\n`);

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  console.log('\n✨ Migration completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run TypeScript compiler to check for any remaining issues');
  console.log('2. Run tests to ensure everything works correctly');
  console.log('3. Update any remaining manual imports');
  console.log('4. Consider removing old utility files after verification');
}

/**
 * Validation function to check for remaining old imports
 */
async function validateMigration(): Promise<void> {
  console.log('🔍 Validating migration...\n');

  const files = await glob('**/*.{ts,tsx,js,jsx}', {
    ignore: EXCLUDE_PATTERNS,
    cwd: process.cwd(),
  });

  const issues: string[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for old import patterns
      for (const mapping of IMPORT_MAPPINGS) {
        if (content.includes(`from '${mapping.from}'`) || content.includes(`from "${mapping.from}"`)) {
          issues.push(`${file}: Still imports from ${mapping.from}`);
        }
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  if (issues.length > 0) {
    console.log('⚠️  Found remaining issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  } else {
    console.log('✅ Migration validation passed!');
  }
}

// Run the migration
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'validate') {
    validateMigration().catch(console.error);
  } else {
    migrateUtilities().catch(console.error);
  }
}

export { migrateUtilities, validateMigration };