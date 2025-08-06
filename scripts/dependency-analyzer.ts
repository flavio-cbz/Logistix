#!/usr/bin/env ts-node

/**
 * Dependency Analyzer Script
 * Analyzes all TypeScript/JavaScript files for import statements
 * and validates against package.json dependencies
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const NODE_BUILTIN_MODULES = [
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
    'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain', 'events',
    'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net', 'os', 'path',
    'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
    'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty',
    'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
];

interface MissingDependency {
    pkg: string;
    file: string;
    line: number;
}

interface DependencyAnalysis {
  missing: MissingDependency[];
  unused: string[];
  outdated: string[];
  devDependencies: string[];
}

/*
interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
  usage: FileReference[];
  isUsed: boolean;
}
*/

interface FileReference {
  file: string;
  line: number;
  importPath: string;
  importType: 'default' | 'named' | 'namespace';
}

interface UsageReport {
  totalImports: number;
  uniquePackages: number;
  missingPackages: string[];
  unusedPackages: string[];
}

class DependencyManager {
  private projectRoot: string;
  private packageJsonPath: string;
  private packageJson: any;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.packageJsonPath = path.join(projectRoot, 'package.json');
  }

  async analyzeDependencies(): Promise<DependencyAnalysis> {
    console.log('🔍 Analyzing project dependencies...');
    
    // Load package.json
    await this.loadPackageJson();
    
    // Find all TypeScript/JavaScript files
    const files = await this.findSourceFiles();
    console.log(`📁 Found ${files.length} source files`);
    
    // Extract all imports
    const imports = await this.extractImports(files);
    console.log(`📦 Found ${imports.length} import statements`);
    
    // Analyze dependencies
    const analysis = await this.performAnalysis(imports);
    
    return analysis;
  }

  private async loadPackageJson(): Promise<void> {
    try {
      const content = await fs.readFile(this.packageJsonPath, 'utf-8');
      this.packageJson = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load package.json: ${error}`);
    }
  }

  private async findSourceFiles(): Promise<string[]> {
    const patterns = [
      'app/**/*.{ts,tsx,js,jsx}',
      'components/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.{ts,tsx,js,jsx}',
      'hooks/**/*.{ts,tsx,js,jsx}',
      'types/**/*.{ts,tsx,js,jsx}',
      'scripts/**/*.{ts,tsx,js,jsx}',
      'tests/**/*.{ts,tsx,js,jsx}',
      'modules/**/*.{ts,tsx,js,jsx}',
      '*.{ts,tsx,js,jsx}'
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        cwd: this.projectRoot,
        ignore: ['node_modules/**', '.next/**', 'dist/**', 'out/**']
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async extractImports(files: string[]): Promise<FileReference[]> {
    const imports: FileReference[] = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8');
        const fileImports = this.parseImports(content, file);
        imports.push(...fileImports);
      } catch (error) {
        console.warn(`⚠️  Failed to read file ${file}: ${error}`);
      }
    }

    return imports;
  }

  private parseImports(content: string, filePath: string): FileReference[] {
    const imports: FileReference[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Match various import patterns
      const importPatterns = [
        /^import\s+.*\s+from\s+['"]([^'"]+)['"]/,  // import ... from 'package'
        /^import\s+['"]([^'"]+)['"]/,              // import 'package'
        /require\(['"]([^'"]+)['"]\)/,             // require('package')
        /^import\s*\(\s*['"]([^'"]+)['"]\s*\)/     // import('package')
      ];

      for (const pattern of importPatterns) {
        const match = line.trim().match(pattern);
        if (match && match[1]) {
          const importPath = match[1];
          if (!this.isRelativeImport(importPath)) {
            imports.push({
              file: filePath,
              line: index + 1,
              importPath: importPath,
              importType: this.getImportType(line)
            });
          }
        }
      }
    });

    return imports;
  }

  private extractPackageName(importPath: string): string | null {
    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;
    }
    
    // Handle regular packages
    const parts = importPath.split('/');
    return parts[0] ?? null;
  }

  private isRelativeImport(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/');
  }

  private getImportType(line: string): 'default' | 'named' | 'namespace' {
    if (line.includes('import * as')) return 'namespace';
    if (line.includes('{') && line.includes('}')) return 'named';
    return 'default';
  }

  private async performAnalysis(imports: FileReference[]): Promise<DependencyAnalysis> {
    const currentDeps = {
      ...this.packageJson.dependencies || {},
      ...this.packageJson.devDependencies || {}
    };

    const importedPackages = new Map<string, FileReference>();
    imports.forEach(imp => {
      const packageName = this.extractPackageName(imp.importPath);
      if (packageName && !NODE_BUILTIN_MODULES.includes(packageName)) {
        if (!importedPackages.has(packageName)) {
            importedPackages.set(packageName, imp);
        }
      }
    });

    // Find missing dependencies
    const missing: MissingDependency[] = [];
    for (const [pkg, imp] of importedPackages.entries()) {
        if (!currentDeps[pkg]) {
            missing.push({ pkg, file: imp.file, line: imp.line });
        }
    }

    // Find unused dependencies
    const unused = Object.keys(currentDeps).filter(pkg => !importedPackages.has(pkg));

    // Categorize dev dependencies
    const devDependencies = this.categorizeDevDependencies(Array.from(importedPackages.keys()));

    return {
      missing,
      unused,
      outdated: [], // TODO: Implement version checking
      devDependencies
    };
  }

  private categorizeDevDependencies(packages: string[]): string[] {
    const devPatterns = [
      '@types/',
      '@testing-library/',
      '@playwright/',
      'vitest',
      'playwright',
      'eslint',
      'typescript',
      'autoprefixer',
      'postcss',
      'tailwindcss',
      '@next/bundle-analyzer',
      'dotenv',
      'ts-node',
      'supertest'
    ];

    return packages.filter(pkg => 
      devPatterns.some(pattern => pkg.startsWith(pattern) || pkg === pattern.replace('/', ''))
    );
  }

  async validateUsage(): Promise<UsageReport> {
    const analysis = await this.analyzeDependencies();
    
    return {
      totalImports: 0, // Will be calculated from actual imports
      uniquePackages: analysis.missing.length + Object.keys(this.packageJson.dependencies || {}).length,
      missingPackages: analysis.missing.map(m => m.pkg),
      unusedPackages: analysis.unused
    };
  }

  async updatePackageJson(updates: { add: Record<string, string>, remove: string[] }): Promise<void> {
    console.log('📝 Updating package.json...');
    
    // Add missing dependencies
    for (const [pkg, version] of Object.entries(updates.add)) {
      if (this.categorizeDevDependencies([pkg]).includes(pkg)) {
        this.packageJson.devDependencies = this.packageJson.devDependencies || {};
        this.packageJson.devDependencies[pkg] = version;
      } else {
        this.packageJson.dependencies = this.packageJson.dependencies || {};
        this.packageJson.dependencies[pkg] = version;
      }
    }

    // Remove unused dependencies
    for (const pkg of updates.remove) {
      delete this.packageJson.dependencies?.[pkg];
      delete this.packageJson.devDependencies?.[pkg];
    }

    // Sort dependencies alphabetically
    if (this.packageJson.dependencies) {
      const sorted = Object.keys(this.packageJson.dependencies).sort().reduce((acc, key) => {
        acc[key] = this.packageJson.dependencies[key];
        return acc;
      }, {} as Record<string, string>);
      this.packageJson.dependencies = sorted;
    }

    if (this.packageJson.devDependencies) {
      const sorted = Object.keys(this.packageJson.devDependencies).sort().reduce((acc, key) => {
        acc[key] = this.packageJson.devDependencies[key];
        return acc;
      }, {} as Record<string, string>);
      this.packageJson.devDependencies = sorted;
    }

    // Write updated package.json
    await fs.writeFile(
      this.packageJsonPath, 
      JSON.stringify(this.packageJson, null, 2) + '\n'
    );
    
    console.log('✅ package.json updated successfully');
  }

  async cleanupUnused(): Promise<{ removed: string[], kept: string[] }> {
    const analysis = await this.analyzeDependencies();
    
    // Keep certain packages even if they appear unused
    const keepPackages = [
      'next',
      'react',
      'react-dom',
      'typescript',
      '@types/node',
      '@types/react',
      '@types/react-dom'
    ];

    const toRemove = analysis.unused.filter(pkg => !keepPackages.includes(pkg));
    const toKeep = analysis.unused.filter(pkg => keepPackages.includes(pkg));

    if (toRemove.length > 0) {
      await this.updatePackageJson({ add: {}, remove: toRemove });
    }

    return { removed: toRemove, kept: toKeep };
  }
}

// CLI execution
async function main() {
  try {
    const manager = new DependencyManager();
    
    console.log('🚀 Starting dependency analysis...\n');
    
    const analysis = await manager.analyzeDependencies();
    
    console.log('\n📊 Analysis Results:');
    console.log('==================');
    console.log(`Missing dependencies: ${analysis.missing.length}`);
    if (analysis.missing.length > 0) {
        analysis.missing.forEach(m => {
            console.log(`  - ${m.pkg} (in ${m.file}:${m.line})`);
        });
    }
    
    console.log(`\nUnused dependencies: ${analysis.unused.length}`);
    if (analysis.unused.length > 0) {
      console.log('  -', analysis.unused.join('\n  - '));
    }
    
    console.log(`\nDev dependencies: ${analysis.devDependencies.length}`);
    if (analysis.devDependencies.length > 0) {
      console.log('  -', analysis.devDependencies.join('\n  - '));
    }

    /*
    // Auto-fix missing dependencies
    if (analysis.missing.length > 0) {
      console.log('\n🔧 Auto-fixing missing dependencies...');
      const updates: Record<string, string> = {};
      
      // Add version resolution logic here
      for (const m of analysis.missing) {
        updates[m.pkg] = 'latest'; // TODO: Implement proper version resolution
      }
      
      await manager.updatePackageJson({ add: updates, remove: [] });
    }
    */

    console.log('\n✅ Dependency analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during dependency analysis:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DependencyManager, type DependencyAnalysis, type UsageReport };