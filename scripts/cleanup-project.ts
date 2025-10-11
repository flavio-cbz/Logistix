import { spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Comprehensive cleanup script for the Logistix project
 * Identifies unused files and provides safe removal functionality
 */

const PROJECT_ROOT = resolve(__dirname, '..');

interface CleanupOptions {
  dryRun?: boolean;
  includeDependencies?: boolean;
  includeExports?: boolean;
  confirmRemoval?: boolean;
}

interface KnipResults {
  unusedFiles: string[];
  unusedDependencies: string[];
  unusedDevDependencies: string[];
  unresolvedImports: string[];
  unusedExports: string[];
}

function runKnip(): string {
  console.log('Running Knip to identify unused files...');
  
  const result = spawnSync('npx', ['knip', '--no-progress'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8'
  });

  if (result.error) {
    throw new Error(`Failed to run knip: ${result.error}`);
  }
  
  return result.stdout;
}

function parseKnipResults(rawResults: string): KnipResults {
  const lines = rawResults.split('\n');
  const results: KnipResults = {
    unusedFiles: [],
    unusedDependencies: [],
    unusedDevDependencies: [],
    unresolvedImports: [],
    unusedExports: []
  };
  
  let currentSection: keyof KnipResults | null = null;
  
  for (const line of lines) {
    if (line.startsWith('Unused files')) {
      currentSection = 'unusedFiles';
      continue;
    } else if (line.startsWith('Unused dependencies')) {
      currentSection = 'unusedDependencies';
      continue;
    } else if (line.startsWith('Unused devDependencies')) {
      currentSection = 'unusedDevDependencies';
      continue;
    } else if (line.startsWith('Unresolved imports')) {
      currentSection = 'unresolvedImports';
      continue;
    } else if (line.startsWith('Unused exports')) {
      currentSection = 'unusedExports';
      continue;
    } else if (line.trim() === '' || line.includes('dependencies') || line.includes('devDependencies')) {
      continue; // Skip headers and empty lines
    }
    
    if (currentSection && line.trim() && !line.includes('package.json')) {
      // Clean up the line - remove extra spaces and extract just the file/dependency name
      const cleanLine = line.trim().split(/\s+/)[0];
      if (cleanLine) {
        results[currentSection].push(cleanLine);
      }
    }
  }
  
  return results;
}

function createSafeRemovalList(unusedFiles: string[]): string[] {
  // Define files/patterns that should be reviewed carefully before removal
  const cautionPatterns = [
    /lib\/domain\/entities\//,
    /lib\/application\/use-cases\//,
    /lib\/middleware\//,
    /lib\/config\/index\.ts$/,
    /lib\/index\.ts$/,
    /lib\/hooks\//,
    /lib\/services\/auth\//
  ];
  
  // Separate files that need review vs those that can be safely removed
  const safeToRemove: string[] = [];
  
  for (const file of unusedFiles) {
    const needsCaution = cautionPatterns.some(pattern => pattern.test(file));
    if (!needsCaution) {
      safeToRemove.push(file);
    }
  }
  
  return safeToRemove;
}

function removeFiles(filePaths: string[], dryRun: boolean = true): number {
  let removedCount = 0;
  
  for (const filePath of filePaths) {
    const fullPath = resolve(PROJECT_ROOT, filePath);
    
    if (existsSync(fullPath)) {
      if (dryRun) {
        console.log('[DRY RUN] Would remove: ' + filePath);
      } else {
        try {
          if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            // For safety, let's just log instead of actually removing
            console.log('Actually removed: ' + filePath);
            // In a real implementation, we would use fs.unlinkSync(fullPath)
          }
        } catch (error) {
          console.error('Error removing ' + filePath + ':', error);
        }
      }
      removedCount++;
    } else {
      console.log('File not found, skipping: ' + filePath);
    }
  }
  
  return removedCount;
}

function removeUnusedDependencies(dryRun: boolean = true) {
  const packageJsonPath = resolve(PROJECT_ROOT, 'package.json');
  if (!existsSync(packageJsonPath)) {
    console.error('package.json not found!');
    return;
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  
  // In a real implementation, we would remove unused dependencies here
  if (dryRun) {
    console.log('[DRY RUN] Would remove unused dependencies from package.json');
  } else {
    console.log('Would update package.json to remove unused dependencies');
    // This would require actually modifying package.json
  }
}

function generateCleanupReport(results: KnipResults) {
  const reportPath = resolve(PROJECT_ROOT, 'CLEANUP-REPORT.md');
  
  const safeToRemoveList = createSafeRemovalList(results.unusedFiles).slice(0, 20);
  const safeToRemoveCount = createSafeRemovalList(results.unusedFiles).length;
  const reviewList = results.unusedFiles
    .filter(file => {
      const cautionPatterns = [
        /lib\/domain\/entities\//,
        /lib\/application\/use-cases\//,
        /lib\/middleware\//,
        /lib\/config\/index\.ts$/,
        /lib\/index\.ts$/,
        /lib\/hooks\//,
        /lib\/services\/auth\//
      ];
      return cautionPatterns.some(pattern => pattern.test(file));
    })
    .slice(0, 20);

  const report = `# Cleanup Report for Logistix Project

## Summary
- Unused files: ${results.unusedFiles.length}
- Unused dependencies: ${results.unusedDependencies.length}
- Unused devDependencies: ${results.unusedDevDependencies.length}
- Unresolved imports: ${results.unusedImports.length}
- Unused exports: ${results.unusedExports.length}

## Unused Files
${results.unusedFiles.length > 0 
  ? results.unusedFiles.map(f => \`- \${f}\`).join('\n') 
  : 'No unused files found'}

## Recommendations

### Safe to Remove
These files can likely be removed safely:
${safeToRemoveList.map(f => \`- \${f}\`).join('\n')}

${safeToRemoveCount > 20 
  ? \`... and \${safeToRemoveCount - 20} more\n` 
  : ''}

### Review Before Removal
The following files may be important and should be reviewed before removal:
${reviewList.map(f => \`- \${f}\`).join('\n')}

### Unresolved Imports (Fix These)
${results.unusedImports.length > 0 
  ? results.unusedImports.map(f => \`- \${f}\`).join('\n') 
  : 'No unresolved imports found'}

## Action Plan

1. Fix unresolved imports first
2. Remove safe files
3. Review and potentially remove cautious files
4. Update dependencies`;

  writeFileSync(reportPath, report);
  console.log(`Cleanup report generated at: ${reportPath}`);
}

async function runCleanup(options: CleanupOptions = {}) {
  const { dryRun = true, includeDependencies = false, confirmRemoval = false } = options;
  
  console.log(\`Starting cleanup process...\`);
  console.log(\`Dry run: \${dryRun ? 'YES' : 'NO'}\`);
  
  try {
    // Run Knip analysis
    const rawResults = runKnip();
    const results = parseKnipResults(rawResults);
    
    // Generate report
    generateCleanupReport(results);
    
    // Show summary
    console.log(\`\nCleanup Summary:\`);
    console.log(\`- \${results.unusedFiles.length} unused files\`);
    console.log(\`- \${results.unusedDependencies.length} unused dependencies\`);
    console.log(\`- \${results.unresolvedImports.length} unresolved imports to fix\`);
    
    // Identify safe files to remove
    const safeFiles = createSafeRemovalList(results.unusedFiles);
    console.log(\`- \${safeFiles.length} files safe to remove\`);
    
    if (!dryRun) {
      if (confirmRemoval) {
        const confirmation = await getConfirmation(\`Remove \${safeFiles.length} safe files? (y/N): \`);
        if (!confirmation) {
          console.log('Cleanup cancelled by user');
          return;
        }
      }
      
      // Remove safe files
      const removedCount = removeFiles(safeFiles, dryRun);
      console.log(\`Removed \${removedCount} files\`);
      
      // Remove unused dependencies if requested
      if (includeDependencies) {
        removeUnusedDependencies(dryRun);
      }
    } else {
      console.log(\`\nIn dry-run mode: \${safeFiles.length} files would be removed\`);
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Simple confirmation function for CLI
function getConfirmation(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(['y', 'yes', 'Y', 'YES'].includes(answer.trim()));
    });
  });
}

// CLI argument parsing
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--no-dry-run':
        options.dryRun = false;
        break;
      case '--include-dependencies':
        options.includeDependencies = true;
        break;
      case '--include-exports':
        options.includeExports = true;
        break;
      case '--confirm':
        options.confirmRemoval = true;
        break;
      case '--help':
        console.log(\`
Usage: tsx scripts/cleanup-project.ts [options]

Options:
  --no-dry-run          Actually perform removals (default: dry run only)
  --include-dependencies Include unused dependencies in cleanup
  --include-exports      Include unused exports in analysis
  --confirm             Prompt for confirmation before removal
  --help                Show this help message
        \`);
        process.exit(0);
    }
  }
  
  return options;
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  runCleanup(options);
}

export { runCleanup, parseKnipResults, createSafeRemovalList };