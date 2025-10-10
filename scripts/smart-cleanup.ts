// @ts-nocheck - Script needs refactoring for new DB adapter
#!/usr/bin/env ts-node
/**
 * Script intelligent de nettoyage pour Logistix
 * 
 * Ce script supprime les fichiers inutilisés (dormants) en se basant sur une analyse de dépendances.
 * 
 * Fonctionnalités:
 * - Utilise dependency-cruiser pour une analyse précise du graphe de dépendances.
 * - Identifie les fichiers non atteignables depuis les points d'entrée.
 * - Sauvegarde les fichiers avant suppression.
 * - Exécute des tests de vérification après chaque suppression.
 * - Restaure automatiquement les fichiers si les tests échouent.
 * - Mode dry-run pour simuler les changements.
 * - Génère un rapport détaillé.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'fs';
import fs from 'fs/promises';
import { join, dirname, basename, extname, resolve, relative } from 'path';
import { exec } from 'child_process';
import os from 'os';

// Interfaces
interface SmartCleanupConfig {
  entryPoints: string[];
  include: string[];
  exclude: string[];
  testCommand: string;
  backupDir: string;
  logFile: string;
  reportFile: string;
  lockFile?: string;
  neverDelete?: string[];
  verificationCommands?: string[];
  staleLockMinutes?: number;
}

interface AnalysisResult {
  allFiles: Set<string>;
  reachableFiles: Set<string>;
  dormantFiles: string[];
}

interface ProcessResult {
  deleted: string[];
  restored: string[];
  errors: { file: string; message: string }[];
}

const DEFAULT_CONFIG: SmartCleanupConfig = {
  entryPoints: [
    'app/layout.tsx',
    'app/page.tsx',
    'middleware.ts',
    'next.config.mjs',
  ],
  include: ['app/**/*', 'components/**/*', 'lib/**/*', 'scripts/**/*'],
  exclude: [
    'node_modules/**',
    '.next/**',
    'coverage/**',
    'drizzle/**',
    'public/**',
    'docs/**',
    'logs/**',
    'backups/**',
  ],
  testCommand: 'npm test',
  backupDir: 'backups/smart-cleanup',
  logFile: 'logs/smart-cleanup.log',
  reportFile: 'reports/smart-cleanup-report.md',
  lockFile: 'logs/smart-cleanup.lock',
  neverDelete: [
    'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
    'tsconfig.json', 'eslint.config.*', 'next.config.*', 'tailwind.config.*',
    'postcss.config.*', 'drizzle.config.*', 'vitest.config.*', 'jest.config.*',
    '.env*', 'Dockerfile', 'docker-compose.*',
    '**/README.md', '**/*.md',
  ],
  staleLockMinutes: 240,
};

class SmartCleanupSystem {
  private config: SmartCleanupConfig;
  private logger: (message: string) => Promise<void>;
  private processResult: ProcessResult;
  private sessionId: string;
  private sessionBackupRoot: string;
  private lockAcquired = false;
  private projectRoot: string;

  constructor(config?: Partial<SmartCleanupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = process.cwd();
    this.logger = async () => {}; // Initialized later
    this.processResult = { deleted: [], restored: [], errors: [] };
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.sessionBackupRoot = resolve(this.projectRoot, this.config.backupDir, this.sessionId);
  }

  public async run(dryRun = false): Promise<void> {
    await this.initializeLogger();
    await this.acquireLock();
    try {
      await this.logger(`--- Session started at ${new Date().toISOString()} ---`);
      await this.logger(`Mode: ${dryRun ? 'Dry Run' : 'Live'}`);

      const analysisResult = await this.analyzeDependencies();
      if (!analysisResult) {
        await this.logger('Dependency analysis failed. Aborting.');
        return;
      }

      const { dormantFiles, allFiles, reachableFiles } = analysisResult;
      await this.logger(`Found ${dormantFiles.length} potential dormant files.`);

      if (dryRun) {
        console.log('--- DRY RUN ---');
        console.log(`Would process ${dormantFiles.length} dormant files:`);
        dormantFiles.forEach(f => console.log(`- ${f}`));
        await this.generateReport({
          totalAnalyzed: allFiles.size,
          totalReachable: reachableFiles.size,
          dormantCount: dormantFiles.length,
        });
        return;
      }

      await this.processFiles(dormantFiles);

      await this.generateReport({
        totalAnalyzed: allFiles.size,
        totalReachable: reachableFiles.size,
        dormantCount: dormantFiles.length,
      });

      await this.logger(`--- Session finished at ${new Date().toISOString()} ---`);
    } finally {
      await this.releaseLock();
    }
  }

  private async initializeLogger(): Promise<void> {
    const logDir = dirname(this.config.logFile);
    await fs.mkdir(logDir, { recursive: true });
    this.logger = async (message: string) => {
      const timestamp = new Date().toISOString();
      await fs.appendFile(this.config.logFile, `[${timestamp}] ${message}\n`);
    };
  }

  private async acquireLock(): Promise<void> {
    const lockFile = resolve(this.projectRoot, this.config.lockFile!);
    const lockDir = dirname(lockFile);
    await fs.mkdir(lockDir, { recursive: true });
    try {
      if (existsSync(lockFile)) {
        const stat = await fs.stat(lockFile);
        const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
        if (ageMinutes < (this.config.staleLockMinutes ?? 240)) {
          throw new Error(`Another cleanup is running (lock file present: ${lockFile})`);
        }
        await fs.unlink(lockFile).catch(() => {});
      }
      const payload = JSON.stringify({ pid: process.pid, host: os.hostname(), startedAt: new Date().toISOString(), sessionId: this.sessionId }, null, 2);
      await fs.writeFile(lockFile, payload, { flag: 'wx' });
      this.lockAcquired = true;
      await this.logger(`Lock acquired: ${lockFile}`);
    } catch (err) {
      await this.logger(`Failed to acquire lock: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  private async releaseLock(): Promise<void> {
    if (!this.lockAcquired) return;
    const lockFile = resolve(this.projectRoot, this.config.lockFile!);
    await fs.unlink(lockFile).catch(() => {});
    this.lockAcquired = false;
    await this.logger(`Lock released: ${lockFile}`);
  }

  private async executeCommand(command: string): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      exec(command, { maxBuffer: 1024 * 1024 * 64, windowsHide: true }, (error, stdout, stderr) => {
        resolve({ success: !error, output: stdout, error: stderr || (error ? error.message : '') });
      });
    });
  }

  private toSafeExcludeRegex(pattern: string): string | null {
    const norm = pattern.replace(/\\/g, '/');
    if (norm.endsWith('/**')) {
      return `^${this.escapeRegex(norm.slice(0, -3))}/`;
    }
    if (norm.includes('**')) return null;
    return `^${this.escapeRegex(norm)}`;
  }

  private escapeRegex(lit: string): string {
    return lit.replace(/[\\^$+?.()|{}\[\]]/g, '\\$&');
  }

  private async analyzeDependencies(): Promise<AnalysisResult | null> {
    await this.logger('Starting dependency analysis with dependency-cruiser...');
    try {
      const roots = Array.from(new Set(this.config.include.map(p => p.split('/'))));
      const includeArgs = roots.map(f => `"${f}"`).join(' ');
      
      const excludeRegexes = this.config.exclude.map(p => this.toSafeExcludeRegex(p)).filter(Boolean) as string[];
      const excludeArgs = excludeRegexes.map(rx => `--exclude "${rx}"`).join(' ');

      const depcruiseCmd = `npx --yes dependency-cruiser ${includeArgs} --output-type json ${excludeArgs} --ts-pre-compilation-deps --no-config`;
      await this.logger(`[DEBUG] Running command: ${depcruiseCmd}`);

      const { success, output, error } = await this.executeCommand(depcruiseCmd);
      if (!success) {
        await this.logger(`Error executing dependency-cruiser: ${error}`);
        console.error(`Error executing dependency-cruiser: ${error}`);
        return null;
      }

      const parsed = JSON.parse(output);
      if (!parsed || !parsed.modules) {
        await this.logger('Invalid output from dependency-cruiser.');
        return null;
      }

      interface ModuleInfo {
        source: string;
        dependencies?: string[];
        [key: string]: unknown;
      }

      const allFiles = new Set<string>(parsed.modules.map((m: ModuleInfo) => relative(this.projectRoot, m.source).replace(/\\/g, '/')));
      const reachableFiles = new Set<string>();
      const queue: string[] = [...this.config.entryPoints];
      const visited = new Set<string>();

      const moduleByFile = new Map<string, ModuleInfo>(parsed.modules.map((m: ModuleInfo) => [relative(this.projectRoot, m.source).replace(/\\/g, '/'), m]));

      while (queue.length > 0) {
        const currentFile = queue.shift();
        if (!currentFile || visited.has(currentFile)) continue;

        visited.add(currentFile);
        reachableFiles.add(currentFile);

        const module = moduleByFile.get(currentFile);
        if (module && module.dependencies) {
          for (const dep of module.dependencies) {
            const resolvedDepPath = relative(this.projectRoot, dep.resolved).replace(/\\/g, '/');
            if (!visited.has(resolvedDepPath) && allFiles.has(resolvedDepPath)) {
              queue.push(resolvedDepPath);
            }
          }
        }
      }

      const dormantFiles = Array.from(allFiles).filter(file => !reachableFiles.has(file))
        .filter(file => !this.matchesAnyPattern(file, this.config.neverDelete!));

      await this.logger(`Analysis complete. Found ${dormantFiles.length} dormant files.`);
      return { allFiles, reachableFiles, dormantFiles };

    } catch (e) {
      await this.logger(`Dependency analysis failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private matchesAnyPattern(file: string, patterns: string[]): boolean {
    const norm = file.replace(/\\/g, '/');
    return patterns.some(p => new RegExp(`^${p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')}$`).test(norm));
  }

  private async processFiles(files: string[]): Promise<void> {
    await this.logger(`Processing ${files.length} dormant files...`);
    await fs.mkdir(this.sessionBackupRoot, { recursive: true });

    for (const file of files) {
      const absoluteFilePath = resolve(this.projectRoot, file);
      const backupFilePath = join(this.sessionBackupRoot, file);
      
      try {
        await fs.mkdir(dirname(backupFilePath), { recursive: true });
        await fs.copyFile(absoluteFilePath, backupFilePath);
        await fs.unlink(absoluteFilePath);
        await this.logger(`Deleted and backed up: ${file}`);

        const testResult = await this.runVerifications(`after deleting ${file}`);
        if (testResult.success) {
          this.processResult.deleted.push(file);
          await this.logger(`Tests passed for ${file}.`);
        } else {
          await fs.copyFile(backupFilePath, absoluteFilePath);
          this.processResult.restored.push(file);
          this.processResult.errors.push({ file, message: `Verification failed: ${testResult.error}` });
          await this.logger(`Verification failed for ${file}. Restored. Error: ${testResult.error}`);
        }
      } catch (error) {
        this.processResult.errors.push({ file, message: `Failed to process: ${String(error)}` });
        await this.logger(`Failed to process ${file}: ${String(error)}`);
        try {
          await fs.copyFile(backupFilePath, absoluteFilePath);
          this.processResult.restored.push(file);
        } catch (restoreError) {
          await this.logger(`CRITICAL: Failed to restore ${file} after error: ${String(restoreError)}`);
        }
      }
    }
  }

  private async runVerifications(context: string): Promise<{ success: boolean; output: string; error: string }> {
    const commands = this.config.verificationCommands || [this.config.testCommand];
    let combinedOut = '', combinedErr = '';
    for (const cmd of commands) {
      await this.logger(`Running verification (${context}): ${cmd}`);
      const res = await this.executeCommand(cmd);
      combinedOut += res.output;
      combinedErr += res.error;
      if (!res.success) {
        return { success: false, output: combinedOut, error: combinedErr || `Command failed: ${cmd}` };
      }
    }
    return { success: true, output: combinedOut, error: combinedErr };
  }

  private async generateReport(stats: { totalAnalyzed: number; totalReachable: number; dormantCount: number; }): Promise<void> {
    const reportDir = dirname(this.config.reportFile);
    await fs.mkdir(reportDir, { recursive: true });
    
    let content = `# Smart Cleanup Report\n\n`;
    content += `**Date:** ${new Date().toISOString()}\n`;
    content += `**Total files analyzed:** ${stats.totalAnalyzed}\n`;
    content += `**Reachable files:** ${stats.totalReachable}\n`;
    content += `**Dormant files detected:** ${stats.dormantCount}\n\n`;
    content += `**Files deleted successfully:** ${this.processResult.deleted.length}\n`;
    content += `**Files restored (tests failed or error):** ${this.processResult.restored.length}\n\n`;

    if (this.processResult.deleted.length > 0) {
      content += `## Deleted Files\n- ${this.processResult.deleted.join('\n- ')}\n\n`;
    }
    if (this.processResult.restored.length > 0) {
      content += `## Restored Files\n- ${this.processResult.restored.join('\n- ')}\n\n`;
    }
    if (this.processResult.errors.length > 0) {
      content += `## Errors\n`;
      this.processResult.errors.forEach(e => {
        content += `- **${e.file}**: ${e.message}\n`;
      });
    }

    await fs.writeFile(this.config.reportFile, content);
    await this.logger(`Report generated: ${this.config.reportFile}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--execute');
  
  const system = new SmartCleanupSystem();
  
  try {
    await system.run(dryRun);
    console.log('Smart cleanup process finished.');
    if (dryRun) {
      console.log('This was a dry run. No files were changed. Use --execute to apply changes.');
    }
  } catch (error) {
    console.error('Error during smart cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SmartCleanupSystem };