#!/usr/bin/env ts-node

/**
 * File Cleanup Manager
 * Analyzes project files to identify orphaned files and safely remove them
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

interface FileAnalysis {
  totalFiles: number;
  referencedFiles: string[];
  orphanedFiles: string[];
  testFiles: string[];
  documentationFiles: string[];
}

interface OrphanedFiles {
  safeToRemove: string[];
  requiresReview: string[];
  protected: string[];
}

interface RemovalReport {
  removed: string[];
  failed: string[];
  backupPath: string;
}

interface FileReference {
  file: string;
  referencedBy: string[];
  type: 'source' | 'test' | 'documentation' | 'config' | 'asset';
}

class FileCleanupManager {
  private projectRoot: string;
  private fileReferences: Map<string, FileReference> = new Map();
  private protectedPatterns: string[] = [
    // Core files
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'next.config.*',
    'tailwind.config.*',
    'tsconfig.json',
    'vitest.config.*',
    'playwright.config.*',
    'middleware.*',

    // Environment and config
    '.env*',
    '.gitignore',
    '.gitattributes',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',

    // Docker and deployment
    'Dockerfile*',
    'docker-compose.*',
    'deploy.sh',

    // IDE and editor
    '.vscode/**',
    '.idea/**',
    '*.code-workspace',

    // Build outputs (should be in .gitignore but protect anyway)
    '.next/**',
    'dist/**',
    'out/**',
    'build/**',
    'node_modules/**',

    // Database and data
    'data/**',
    '*.db',
    '*.sqlite',

    // Logs
    'logs/**',
    '*.log'
  ];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async scanProject(): Promise<FileAnalysis> {
    console.log('🔍 Scanning project files...');

    // Get all files in the project
    const allFiles = await this.getAllFiles();
    console.log(`📁 Found ${allFiles.length} total files`);

    // Build reference graph
    await this.buildReferenceGraph(allFiles);

    // Categorize files
    const categorized = this.categorizeFiles(allFiles);

    return {
      totalFiles: allFiles.length,
      referencedFiles: categorized.referenced,
      orphanedFiles: categorized.orphaned,
      testFiles: categorized.tests,
      documentationFiles: categorized.docs
    };
  }

  private async getAllFiles(): Promise<string[]> {
    const patterns = [
      '**/*',
      '**/.*' // Include hidden files
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.projectRoot,
        ignore: [
          'node_modules/**',
          '.git/**',
          '.next/**',
          'dist/**',
          'out/**',
          'build/**',
          '**/*.log'
        ],
        dot: true
      });
      files.push(...matches);
    }

    // Filter out directories and get unique files
    const uniqueFiles = [...new Set(files)];
    const actualFiles: string[] = [];

    for (const file of uniqueFiles) {
      try {
        const fullPath = path.join(this.projectRoot, file);
        const stat = await fs.stat(fullPath);
        if (stat.isFile()) {
          actualFiles.push(file);
        }
      } catch (error) {
        // File might not exist or be inaccessible
        console.warn(`⚠️  Cannot access file: ${file}`);
      }
    }

    return actualFiles;
  }

  private async buildReferenceGraph(files: string[]): Promise<void> {
    console.log('🔗 Building file reference graph...');

    // Initialize all files in the reference map
    for (const file of files) {
      this.fileReferences.set(file, {
        file,
        referencedBy: [],
        type: this.getFileType(file)
      });
    }

    // Scan source files for references
    const sourceFiles = files.filter(f => this.isSourceFile(f));

    for (const sourceFile of sourceFiles) {
      try {
        const references = await this.extractFileReferences(sourceFile);

        for (const ref of references) {
          const referencedFile = this.fileReferences.get(ref);
          if (referencedFile) {
            referencedFile.referencedBy.push(sourceFile);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to analyze references in ${sourceFile}: ${error}`);
      }
    }
  }

  private async extractFileReferences(filePath: string): Promise<string[]> {
    const references: string[] = [];

    try {
      const content = await fs.readFile(path.join(this.projectRoot, filePath), 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        // Extract import/require references
        const importMatches = [
          // ES6 imports
          /import.*from\s+['"]([^'"]+)['"]/g,
          /import\s+['"]([^'"]+)['"]/g,
          // Dynamic imports
          /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
          // CommonJS requires
          /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
          // Next.js specific
          /next\/dynamic\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
        ];

        for (const pattern of importMatches) {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const importPath = match[1];
            if (this.isLocalFile(importPath)) {
              const resolvedPath = this.resolveImportPath(importPath, filePath);
              if (resolvedPath) {
                references.push(resolvedPath);
              }
            }
          }
        }

        // Extract asset references (images, fonts, etc.)
        const assetMatches = [
          // Image sources
          /src\s*=\s*['"]([^'"]+\.(png|jpg|jpeg|gif|svg|webp|ico))['"]/gi,
          // CSS/SCSS imports
          /@import\s+['"]([^'"]+)['"]/g,
          // Font references
          /url\s*\(\s*['"]?([^'"]+\.(woff|woff2|ttf|otf|eot))['"]?\s*\)/gi
        ];

        for (const pattern of assetMatches) {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const assetPath = match[1];
            if (this.isLocalFile(assetPath)) {
              const resolvedPath = this.resolveAssetPath(assetPath, filePath);
              if (resolvedPath) {
                references.push(resolvedPath);
              }
            }
          }
        }
      }
    } catch (error) {
      // File might be binary or inaccessible
    }

    return references;
  }

  private isLocalFile(importPath: string): boolean {
    return importPath.startsWith('./') ||
      importPath.startsWith('../') ||
      importPath.startsWith('@/') ||
      importPath.startsWith('/');
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    try {
      let resolvedPath: string;

      if (importPath.startsWith('@/')) {
        // Handle path aliases
        resolvedPath = importPath.replace('@/', '');
      } else if (importPath.startsWith('/')) {
        // Absolute path from project root
        resolvedPath = importPath.substring(1);
      } else {
        // Relative path
        const fromDir = path.dirname(fromFile);
        resolvedPath = path.normalize(path.join(fromDir, importPath));
      }

      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
      for (const ext of extensions) {
        const candidate = resolvedPath + ext;
        if (this.fileReferences.has(candidate)) {
          return candidate;
        }

        // Try index files
        const indexCandidate = path.join(resolvedPath, 'index' + ext);
        if (this.fileReferences.has(indexCandidate)) {
          return indexCandidate;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private resolveAssetPath(assetPath: string, fromFile: string): string | null {
    try {
      let resolvedPath: string;

      if (assetPath.startsWith('/')) {
        // Absolute path from public directory
        resolvedPath = path.join('public', assetPath.substring(1));
      } else {
        // Relative path
        const fromDir = path.dirname(fromFile);
        resolvedPath = path.normalize(path.join(fromDir, assetPath));
      }

      return this.fileReferences.has(resolvedPath) ? resolvedPath : null;
    } catch (error) {
      return null;
    }
  }

  private isSourceFile(filePath: string): boolean {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.less'];
    return sourceExtensions.some(ext => filePath.endsWith(ext));
  }

  private getFileType(filePath: string): 'source' | 'test' | 'documentation' | 'config' | 'asset' {
    if (this.isTestFile(filePath)) return 'test';
    if (this.isDocumentationFile(filePath)) return 'documentation';
    if (this.isConfigFile(filePath)) return 'config';
    if (this.isAssetFile(filePath)) return 'asset';
    return 'source';
  }

  private isTestFile(filePath: string): boolean {
    return filePath.includes('/test/') ||
      filePath.includes('/tests/') ||
      filePath.includes('/__tests__/') ||
      filePath.includes('/e2e/') ||
      filePath.endsWith('.test.ts') ||
      filePath.endsWith('.test.tsx') ||
      filePath.endsWith('.test.js') ||
      filePath.endsWith('.test.jsx') ||
      filePath.endsWith('.spec.ts') ||
      filePath.endsWith('.spec.tsx') ||
      filePath.endsWith('.spec.js') ||
      filePath.endsWith('.spec.jsx');
  }

  private isDocumentationFile(filePath: string): boolean {
    return filePath.includes('/docs/') ||
      filePath.endsWith('.md') ||
      filePath.endsWith('.mdx') ||
      filePath.endsWith('.txt') ||
      filePath === 'README.md' ||
      filePath === 'CHANGELOG.md' ||
      filePath === 'LICENSE' ||
      filePath === 'CONTRIBUTING.md';
  }

  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      /^\..*rc$/,
      /^\..*rc\./,
      /\.config\./,
      /^package\.json$/,
      /^tsconfig/,
      /^next\.config/,
      /^tailwind\.config/,
      /^vitest\.config/,
      /^playwright\.config/,
      /^\.env/,
      /^\.git/,
      /^docker/i,
      /^deploy/
    ];

    return configPatterns.some(pattern => pattern.test(path.basename(filePath)));
  }

  private isAssetFile(filePath: string): boolean {
    const assetExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
      '.woff', '.woff2', '.ttf', '.otf', '.eot',
      '.mp4', '.webm', '.ogg', '.mp3', '.wav',
      '.pdf', '.zip', '.tar', '.gz'
    ];

    return assetExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private categorizeFiles(allFiles: string[]): {
    referenced: string[];
    orphaned: string[];
    tests: string[];
    docs: string[];
  } {
    const referenced: string[] = [];
    const orphaned: string[] = [];
    const tests: string[] = [];
    const docs: string[] = [];

    for (const file of allFiles) {
      const fileRef = this.fileReferences.get(file);
      if (!fileRef) continue;

      if (fileRef.type === 'test') {
        tests.push(file);
      } else if (fileRef.type === 'documentation') {
        docs.push(file);
      }

      if (fileRef.referencedBy.length > 0 || this.isProtectedFile(file)) {
        referenced.push(file);
      } else {
        orphaned.push(file);
      }
    }

    return { referenced, orphaned, tests, docs };
  }

  private isProtectedFile(filePath: string): boolean {
    return this.protectedPatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\./g, '\\.');
        return new RegExp(`^${regexPattern}$`).test(filePath);
      }
      return filePath === pattern || filePath.endsWith('/' + pattern);
    });
  }

  async identifyOrphans(): Promise<OrphanedFiles> {
    const analysis = await this.scanProject();

    const safeToRemove: string[] = [];
    const requiresReview: string[] = [];
    const protectedFiles: string[] = [];

    for (const file of analysis.orphanedFiles) {
      if (this.isProtectedFile(file)) {
        protectedFiles.push(file);
      } else if (this.isSafeToRemove(file)) {
        safeToRemove.push(file);
      } else {
        requiresReview.push(file);
      }
    }

    return { safeToRemove, requiresReview, protected: protectedFiles };
  }

  private isSafeToRemove(filePath: string): boolean {
    // Files that are generally safe to remove if not referenced
    const safePatterns = [
      // Temporary files
      /\.tmp$/,
      /\.temp$/,
      /~$/,

      // Backup files
      /\.bak$/,
      /\.backup$/,
      /\.orig$/,

      // IDE files
      /\.DS_Store$/,
      /Thumbs\.db$/,

      // Old/unused scripts
      /scripts\/old\//,
      /scripts\/unused\//,
      /scripts\/deprecated\//,

      // Test artifacts
      /coverage\//,
      /\.nyc_output\//,

      // Build artifacts that shouldn't be in source
      /\.map$/
    ];

    return safePatterns.some(pattern => pattern.test(filePath));
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.projectRoot, `backup-${timestamp}`);

    console.log(`💾 Creating backup at ${backupDir}...`);

    try {
      await fs.mkdir(backupDir, { recursive: true });

      // Copy important files to backup
      const importantFiles = await glob('**/*', {
        cwd: this.projectRoot,
        ignore: [
          'node_modules/**',
          '.git/**',
          '.next/**',
          'dist/**',
          'out/**',
          'backup-*/**'
        ]
      });

      for (const file of importantFiles) {
        const srcPath = path.join(this.projectRoot, file);
        const destPath = path.join(backupDir, file);

        try {
          const stat = await fs.stat(srcPath);
          if (stat.isFile()) {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
          }
        } catch (error) {
          console.warn(`⚠️  Failed to backup ${file}: ${error}`);
        }
      }

      console.log(`✅ Backup created successfully`);
      return backupDir;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async safeRemove(files: string[]): Promise<RemovalReport> {
    console.log(`🗑️  Removing ${files.length} files...`);

    const removed: string[] = [];
    const failed: string[] = [];

    // Create backup first
    const backupPath = await this.createBackup();

    for (const file of files) {
      try {
        const fullPath = path.join(this.projectRoot, file);
        await fs.unlink(fullPath);
        removed.push(file);
        console.log(`✅ Removed: ${file}`);
      } catch (error) {
        failed.push(file);
        console.warn(`❌ Failed to remove ${file}: ${error}`);
      }
    }

    return { removed, failed, backupPath };
  }
}

// CLI execution
async function main() {
  try {
    const manager = new FileCleanupManager();

    console.log('🚀 Starting file cleanup analysis...\n');

    const analysis = await manager.scanProject();

    console.log('\n📊 File Analysis Results:');
    console.log('========================');
    console.log(`Total files: ${analysis.totalFiles}`);
    console.log(`Referenced files: ${analysis.referencedFiles.length}`);
    console.log(`Orphaned files: ${analysis.orphanedFiles.length}`);
    console.log(`Test files: ${analysis.testFiles.length}`);
    console.log(`Documentation files: ${analysis.documentationFiles.length}`);

    if (analysis.orphanedFiles.length > 0) {
      console.log('\n🔍 Analyzing orphaned files...');
      const orphans = await manager.identifyOrphans();

      console.log(`\nSafe to remove: ${orphans.safeToRemove.length}`);
      if (orphans.safeToRemove.length > 0) {
        console.log('  -', orphans.safeToRemove.join('\n  - '));
      }

      console.log(`\nRequires review: ${orphans.requiresReview.length}`);
      if (orphans.requiresReview.length > 0) {
        console.log('  -', orphans.requiresReview.join('\n  - '));
      }

      console.log(`\nProtected files: ${orphans.protected.length}`);
      if (orphans.protected.length > 0) {
        console.log('  -', orphans.protected.join('\n  - '));
      }

      // Auto-remove safe files
      if (orphans.safeToRemove.length > 0) {
        console.log('\n🧹 Auto-removing safe files...');
        const report = await manager.safeRemove(orphans.safeToRemove);
        console.log(`✅ Removed ${report.removed.length} files`);
        if (report.failed.length > 0) {
          console.log(`❌ Failed to remove ${report.failed.length} files`);
        }
        console.log(`💾 Backup created at: ${report.backupPath}`);
      }
    }

    console.log('\n✅ File cleanup analysis completed!');

  } catch (error) {
    console.error('❌ Error during file cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { FileCleanupManager, type FileAnalysis, type OrphanedFiles, type RemovalReport };