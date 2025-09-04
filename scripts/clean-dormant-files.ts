import fs from 'fs/promises';
import * as fsSync from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

// Interfaces (pour la clarté)
interface IConfig {
  entryPoints: string[];
  include: string[];
  exclude: string[];
  testCommand: string;
  backupDir: string;
  logFile: string;
  reportFile: string;
  // Optional/advanced
  lockFile?: string;
  neverDelete?: string[];
  groupDeletion?: boolean; // delete by connected component groups
  verificationCommands?: string[]; // extra commands to run besides testCommand
  staleLockMinutes?: number; // consider lock stale after N minutes
  finalizeBackups?: boolean; // if true, delete backups of successful deletions at end
}

interface IAnalysisResult {
  allFiles: Set<string>;
  reachableFiles: Set<string>;
  dormantFiles: string[];
  dormantGroups: string[][]; // connected components among dormant files
}

interface IProcessResult {
  deleted: string[];
  restored: string[];
  errors: { file: string; message: string }[];
  groupResults: Array<{ group: string[]; status: 'deleted' | 'restored'; error?: string }>
}

class DormantFileCleaner {
  private config: IConfig;
  private logger: (message: string) => Promise<void>;
  private processResult: IProcessResult;
  private sessionId: string;
  private sessionBackupRoot: string;
  private lockAcquired = false;

  constructor(config: IConfig) {
    // Correction : valeur par défaut pour logFile si absent ou vide
    // + Validation stricte des champs obligatoires (entryPoints, include, exclude)
    if (!Array.isArray(config.include) || config.include.length === 0) {
      throw new Error("Missing or invalid 'include' array in dormant files config.");
    }
    if (!Array.isArray(config.entryPoints) || config.entryPoints.length === 0) {
      throw new Error("Missing or invalid 'entryPoints' array in dormant files config.");
    }
    if (!Array.isArray(config.exclude)) {
      throw new Error("Missing or invalid 'exclude' array in dormant files config.");
    }
    this.config = {
      ...config,
      logFile: config.logFile && config.logFile.trim() !== '' ? config.logFile : 'logs/clean-dormant.log',
      lockFile: config.lockFile ?? 'logs/clean-dormant.lock',
      groupDeletion: config.groupDeletion ?? true,
      staleLockMinutes: config.staleLockMinutes ?? 240,
      finalizeBackups: config.finalizeBackups ?? true,
      neverDelete: config.neverDelete ?? [
        // conservative defaults
        'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
        'tsconfig.json', 'eslint.config.*', 'next.config.*', 'tailwind.config.*',
        'postcss.config.*', 'drizzle.config.*', 'vitest.config.*', 'jest.config.*',
        '.env*', 'Dockerfile', 'docker-compose.*',
        '**/README.md', '**/*.md',
        '.next/**', 'node_modules/**', 'public/**', 'docs/**', 'logs/**', 'backups/**',
        'coverage/**', 'drizzle/**', 'scripts/**', 'tests/**', 'types/**/*.d.ts',
      ],
      verificationCommands: config.verificationCommands && config.verificationCommands.length > 0
        ? config.verificationCommands
        : [config.testCommand],
    };
    this.logger = async () => {}; // Sera initialisé plus tard
    this.processResult = {
      deleted: [],
      restored: [],
      errors: [],
      groupResults: [],
    };
    this.sessionId = new Date().toISOString().replace(/[:.]/g, '-');
    this.sessionBackupRoot = path.resolve(process.cwd(), this.config.backupDir, this.sessionId);
  }

  public async run(dryRun = false): Promise<void> {
    console.log('Starting dormant file cleanup...');
    await this.initializeLogger();
    await this.acquireLock();
    try {

    await this.logger(`--- Session started at ${new Date().toISOString()} ---`);
    await this.logger(`Mode: ${dryRun ? 'Dry Run' : 'Live'}`);

    // Étape 2: Analyse des dépendances
    const analysisResult = await this.analyzeDependencies();
    if (!analysisResult) {
      await this.logger('Dependency analysis failed. Aborting.');
      await this.releaseLock();
      return;
    }

    const { dormantFiles, dormantGroups, allFiles, reachableFiles } = analysisResult;
    await this.logger(`Found ${dormantFiles.length} potential dormant files in ${dormantGroups.length} groups.`);
    console.log(`Found ${dormantFiles.length} potential dormant files in ${dormantGroups.length} groups.`);

    if (dryRun) {
      console.log('Dry Run Results (groups that would be deleted):');
      dormantGroups.forEach((group, idx) => {
        console.log(`Group #${idx + 1} (${group.length} files):`);
        group.forEach(file => console.log(`  - ${file}`));
      });
      await this.logger('Dry run finished.');
      await this.generateReport({
        totalAnalyzed: allFiles.size,
        totalReachable: reachableFiles.size,
        dormantCount: dormantFiles.length,
        dormantGroups,
      });
      await this.releaseLock();
      return;
    }

    // Étape 3-5: Processus de nettoyage sécurisé
    if (this.config.groupDeletion) {
      await this.processGroups(dormantGroups);
    } else {
      await this.processFiles(dormantFiles);
    }

    // Étape 6: Génération du rapport
    await this.generateReport({
      totalAnalyzed: allFiles.size,
      totalReachable: reachableFiles.size,
      dormantCount: dormantFiles.length,
      dormantGroups,
    });

    await this.logger(`--- Session finished at ${new Date().toISOString()} ---`);
    console.log('Cleanup process finished. Check the report file for details.');
    } finally {
      await this.releaseLock();
    }
  }

  private async initializeLogger(): Promise<void> {
    const logDir = path.dirname(this.config.logFile);
    await fs.mkdir(logDir, { recursive: true });
    this.logger = async (message: string) => {
      const timestamp = new Date().toISOString();
      await fs.appendFile(this.config.logFile, `[${timestamp}] ${message}\n`);
    };
  }

  private async executeCommand(command: string): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      exec(command, { maxBuffer: 1024 * 1024 * 64, windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, output: stdout, error: stderr || error.message });
        } else {
          resolve({ success: true, output: stdout, error: stderr });
        }
      });
    });
  }

  private async acquireLock(): Promise<void> {
    const lockFile = path.resolve(process.cwd(), this.config.lockFile!);
    const lockDir = path.dirname(lockFile);
    await fs.mkdir(lockDir, { recursive: true });
    try {
      // If file exists and is not stale -> abort
      if (fsSync.existsSync(lockFile)) {
        const stat = await fs.stat(lockFile);
        const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
        if (ageMinutes < (this.config.staleLockMinutes ?? 240)) {
          throw new Error(`Another cleanup is running (lock file present: ${lockFile})`);
        } else {
          await fs.unlink(lockFile).catch(() => {});
        }
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
    const lockFile = path.resolve(process.cwd(), this.config.lockFile!);
    await fs.unlink(lockFile).catch(() => {});
    this.lockAcquired = false;
    await this.logger(`Lock released: ${lockFile}`);
  }

  private async analyzeDependencies(): Promise<IAnalysisResult | null> {
    await this.logger('Starting dependency analysis...');
    console.log('Starting dependency analysis...');

    // LOG CONFIGURATION
    await this.logger(`[DEBUG] Config utilisée: ${JSON.stringify(this.config, null, 2)}`);
    console.log('[DEBUG] Config utilisée:', this.config);

    try {
      // Utilisation de la CLI dependency-cruiser via npx
      // Derive input roots from include patterns to keep command short
      const roots = this.getInputRootsFromInclude(this.config.include);
      if (roots.length === 0) {
        await this.logger('No input roots derived from include patterns. Aborting.');
        return null;
      }
      const includeArgs = roots.map(f => `"${f}"`).join(' ');

      // Générer des regex --exclude sûres pour dependency-cruiser (qui attend des regex)
      const augmentedExclude = [
        ...this.config.exclude,
        '.next/**', 'coverage/**', 'public/**', 'logs/**', 'backups/**', 'drizzle/**', 'docs/**'
      ];
      const excludeRegexes = Array.from(new Set(augmentedExclude.map(p => this.toSafeExcludeRegex(p)).filter(Boolean) as string[]));
      const excludeArgs = excludeRegexes.length > 0
        ? excludeRegexes.map(rx => `--exclude "${rx}"`).join(' ')
        : '';
      // Correction : utiliser le bon binaire et options compatibles
      const depcruiseCmd = `npx --yes dependency-cruiser ${includeArgs} --output-type json ${excludeArgs} --ts-pre-compilation-deps --no-config`;

      // LOG COMMANDE
      await this.logger(`[DEBUG] Commande dependency-cruiser: ${depcruiseCmd}`);
      console.log('[DEBUG] Commande dependency-cruiser:', depcruiseCmd);

      const { success, output, error } = await this.executeCommand(depcruiseCmd);

      // LOG RESULTAT BRUT
      await this.logger(`[DEBUG] Résultat brut dependency-cruiser (success=${success}):\n${output}\n[stderr]:\n${error}`);
      console.log('[DEBUG] Résultat brut dependency-cruiser:', { success, output, error });

      if (!success) {
        await this.logger(`Erreur lors de l'exécution de dependency-cruiser: ${error}`);
        console.error(`Erreur lors de l'exécution de dependency-cruiser: ${error}`);
        return null;
      }

      let parsed: any;
      if (!output || output.trim() === "") {
        await this.logger("dependency-cruiser CLI returned empty output. Command output:\n" + output);
        console.error("dependency-cruiser CLI returned empty output. Command output:\n" + output);
        throw new Error("dependency-cruiser n'a rien retourné. Vérifiez la configuration et la présence du binaire.");
      }
      try {
        parsed = JSON.parse(output);
      } catch (e) {
        await this.logger('[DEBUG] Failed to parse dependency-cruiser CLI output as JSON. Raw output:\n' + output);
        console.warn('[DEBUG] Failed to parse dependency-cruiser CLI output as JSON. Raw output:\n' + output);
        return null;
      }

      if (!parsed || !parsed.modules) {
        await this.logger('[DEBUG] Dependency-cruiser did not return any modules. Raw output:\n' + output);
        console.warn('[DEBUG] Dependency-cruiser did not return any modules. Raw output:\n' + output);
        return null;
      }

      // LOG NB MODULES
      await this.logger(`[DEBUG] Modules trouvés: ${parsed.modules.length}`);
      console.log('[DEBUG] Modules trouvés:', parsed.modules.length);

      const allFiles = new Set<string>();
      const reachableFiles = new Set<string>();
      const moduleByFile = new Map<string, any>();

  // build alias resolvers from tsconfig.json paths
      const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
      let aliasMap: Array<{ prefix: string; replaceWith: string }> = [];
      try {
        const tsRaw = await fs.readFile(tsconfigPath, 'utf-8');
        const ts = JSON.parse(tsRaw);
        const baseUrl = path.resolve(process.cwd(), ts.compilerOptions?.baseUrl ?? '.');
        const paths: any = ts.compilerOptions?.paths ?? {};
        aliasMap = Object.entries(paths).flatMap(([k, arr]: [string, any]) => {
          const prefix = k.replace(/\*$|\*$/g, '');
          const targets: string[] = Array.isArray(arr) ? arr as string[] : [];
          return targets.map(p => ({ prefix, replaceWith: path.resolve(baseUrl, (p as string).replace(/\*$|\*$/g, '')) }));
        });
      } catch {}

      const resolveAlias = (maybeAliased: string): string => {
        if (maybeAliased.startsWith('.') || maybeAliased.startsWith('/') || maybeAliased.match(/^[A-Za-z]:/)) {
          return maybeAliased;
        }
        for (const { prefix, replaceWith } of aliasMap) {
          if (maybeAliased.startsWith(prefix)) {
            const rest = maybeAliased.slice(prefix.length);
            return path.relative(process.cwd(), path.join(replaceWith, rest)).split(path.sep).join(path.posix.sep);
          }
        }
        return maybeAliased; // leave as-is
      };

      const tryResolveFile = (relPathNoExt: string): string | null => {
        const candidates = [
          relPathNoExt,
          `${relPathNoExt}.ts`, `${relPathNoExt}.tsx`, `${relPathNoExt}.js`, `${relPathNoExt}.jsx`, `${relPathNoExt}.mjs`, `${relPathNoExt}.cjs`,
          `${relPathNoExt}/index.ts`, `${relPathNoExt}/index.tsx`, `${relPathNoExt}/index.js`, `${relPathNoExt}/index.jsx`,
        ];
        for (const cand of candidates) {
          const abs = path.resolve(process.cwd(), cand);
          if (fsSync.existsSync(abs) && fsSync.statSync(abs).isFile()) {
            return cand.split(path.sep).join(path.posix.sep);
          }
        }
        return null;
      };

      parsed.modules.forEach((module: any) => {
        let source = module.source as string;
        source = resolveAlias(source);
        const rel = path.relative(process.cwd(), source);
        const filePath = rel.split(path.sep).join(path.posix.sep); // normalize to posix separators
        const abs = path.resolve(process.cwd(), filePath);
        if (fsSync.existsSync(abs)) {
          allFiles.add(filePath);
          // Also normalize module dependencies to resolved alias when possible
          if (Array.isArray(module.dependencies)) {
            module.dependencies = module.dependencies.map((d: any) => {
              let resolved = d.resolved as string | undefined;
              if (resolved) {
                const aliasRel = resolveAlias(resolved);
                const relNoExt = path.relative(process.cwd(), aliasRel).split(path.sep).join(path.posix.sep);
                const found = tryResolveFile(relNoExt);
                if (found) {
                  resolved = path.resolve(process.cwd(), found);
                } else if (fsSync.existsSync(path.resolve(process.cwd(), relNoExt))) {
                  resolved = path.resolve(process.cwd(), relNoExt);
                } else {
                  // leave as-is (could be npm package)
                }
              }
              return { ...d, resolved };
            });
          }
          moduleByFile.set(filePath, module);
        }
      });

      // LOG NB FICHIERS TOTAUX
      await this.logger(`[DEBUG] Fichiers analysés (allFiles): ${allFiles.size}`);
      console.log('[DEBUG] Fichiers analysés (allFiles):', allFiles.size);

      // Seed reachable with modules under entryPoint paths
      const queue: string[] = [];
      const visited = new Set<string>();
      const entryRoots = this.config.entryPoints.map(p => path.relative(process.cwd(), path.resolve(process.cwd(), p)).split(path.sep).join(path.posix.sep));

      for (const [filePath] of moduleByFile) {
        if (entryRoots.some(root => filePath.startsWith(root))) {
          queue.push(filePath);
        }
      }

      // LOG NB ENTRYPOINTS ET FILES ENQUEUE
      await this.logger(`[DEBUG] Entrypoints: ${JSON.stringify(this.config.entryPoints)} | Fichiers initialement en queue: ${queue.length}`);
      console.log('[DEBUG] Entrypoints:', this.config.entryPoints, '| Fichiers initialement en queue:', queue.length);

      while (queue.length > 0) {
        const currentFile = queue.shift();
        if (!currentFile || visited.has(currentFile)) {
          continue;
        }

        visited.add(currentFile);
        reachableFiles.add(currentFile);

    const module = moduleByFile.get(currentFile);
        if (module && module.dependencies) {
          for (const dep of module.dependencies) {
      const resolvedDepPath = path.relative(process.cwd(), dep.resolved).split(path.sep).join(path.posix.sep);
            if (!visited.has(resolvedDepPath) && allFiles.has(resolvedDepPath)) {
              queue.push(resolvedDepPath);
            }
          }
        }
      }

      // LOG NB FICHIERS ATTEIGNABLES
      await this.logger(`[DEBUG] Fichiers atteignables (reachableFiles): ${reachableFiles.size}`);
      console.log('[DEBUG] Fichiers atteignables (reachableFiles):', reachableFiles.size);

      // Apply neverDelete blacklist and compute dormant files
      const dormantFiles: string[] = Array.from(allFiles).filter(file => !reachableFiles.has(file))
        .filter(file => !this.matchesAnyPattern(file, this.config.neverDelete!));

      // Build graph among dormant files to find connected components (groups)
      const dormantSet = new Set(dormantFiles);
      const adj = new Map<string, Set<string>>();
      // Initialize adjacency
      for (const f of dormantFiles) adj.set(f, new Set());
      for (const f of dormantFiles) {
        const m = moduleByFile.get(f);
        if (m && Array.isArray(m.dependencies)) {
          for (const dep of m.dependencies) {
            const depPath = path.relative(process.cwd(), dep.resolved).split(path.sep).join(path.posix.sep);
            if (dormantSet.has(depPath)) {
              adj.get(f)!.add(depPath);
              // Also add reverse edge when we traverse
            }
          }
        }
      }
      // compute groups via BFS/DFS considering undirected edges (dependencies both ways)
      const visitedDormant = new Set<string>();
      const dormantGroups: string[][] = [];
      // To include reverse edges, precompute reverse adjacency
      const rev = new Map<string, Set<string>>();
      for (const f of dormantFiles) rev.set(f, new Set());
      for (const [src, deps] of adj) {
        for (const d of deps) rev.get(d)!.add(src);
      }
      for (const f of dormantFiles) {
        if (visitedDormant.has(f)) continue;
        const group: string[] = [];
        const q = [f];
        visitedDormant.add(f);
        while (q.length) {
          const cur = q.shift()!;
          group.push(cur);
          const neighbors = new Set([...(adj.get(cur) ?? []), ...(rev.get(cur) ?? [])]);
          for (const nb of neighbors) {
            if (!visitedDormant.has(nb)) {
              visitedDormant.add(nb);
              q.push(nb);
            }
          }
        }
        dormantGroups.push(group.sort());
      }

      // LOG NB FICHIERS DORMANTS
      await this.logger(`[DEBUG] Fichiers dormants détectés: ${dormantFiles.length}`);
      console.log('[DEBUG] Fichiers dormants détectés:', dormantFiles.length);

  await this.logger(`Dependency analysis completed. Found ${dormantFiles.length} dormant files in ${dormantGroups.length} groups.`);
  return { allFiles, reachableFiles, dormantFiles, dormantGroups };

    } catch (error) {
      console.error('Error during dependency analysis:', error);
      await this.logger(`[DEBUG] Error during dependency analysis: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private getInputRootsFromInclude(patterns: string[]): string[] {
    const roots = new Set<string>();
    for (const p of patterns) {
      const norm = p.split(path.sep).join(path.posix.sep);
      const idx = norm.search(/[\*\?\[\{]/);
      const base = idx === -1 ? norm : norm.slice(0, idx);
      const root = base.endsWith('/') ? base.slice(0, -1) : base;
      if (root) {
        // only keep first segment or full root dir
        const first = root.split('/')[0];
        roots.add(first || root);
      }
    }
    return Array.from(roots);
  }

  private escapeRegex(lit: string): string {
    return lit.replace(/[\\^$+?.()|{}\[\]]/g, '\\$&');
  }
  private toSafeExcludeRegex(pattern: string): string | null {
    // dependency-cruiser treats --exclude as regex. Convert common glob-ish patterns to anchored regex.
    const norm = pattern.split(path.sep).join(path.posix.sep);
    // top-level directory prefixes like dir/**
    const m = norm.match(/^(.+?)\/(\*\*)\/?$/);
    if (m) {
      const base = m[1];
      return `^${this.escapeRegex(base)}/`;
    }
    // simple dir/ pattern
    if (/^[^*?]+\/$/.test(norm)) {
      return `^${this.escapeRegex(norm)}`;
    }
    // **/something or patterns with many wildcards are risky - skip to avoid slow regex errors
    if (norm.includes('**')) {
      return null;
    }
    // fallback: escape and anchor start
    return `^${this.escapeRegex(norm)}`;
  }

  private async processFiles(files: string[]): Promise<void> {
    await this.logger('Starting file processing loop...');
    console.log('Processing files for deletion...');

    const backupDirPath = this.sessionBackupRoot;
    await fs.mkdir(backupDirPath, { recursive: true });

    for (const file of files) {
      const absoluteFilePath = path.resolve(process.cwd(), file);
      const backupFilePath = path.join(backupDirPath, file); // preserve relative path
      await fs.mkdir(path.dirname(backupFilePath), { recursive: true });

      try {
        await this.logger(`Attempting to process: ${file}`);
        console.log(`Processing: ${file}`);

        // 1. Sauvegarde
        await fs.copyFile(absoluteFilePath, backupFilePath);
        await this.logger(`Backed up: ${file} to ${backupFilePath}`);

        // 2. Suppression
        await fs.unlink(absoluteFilePath);
        await this.logger(`Deleted: ${file}`);

  // 3. Exécution des vérifications
  const testResult = await this.runVerifications(`after deleting ${file}`);

        // 4. Validation
        if (testResult.success) {
          this.processResult.deleted.push(file);
          await this.logger(`Tests passed after deleting ${file}. Marking for final cleanup.`);
          console.log(`Successfully deleted: ${file}`);
        } else {
          // Restaurer le fichier si les tests échouent
          await fs.copyFile(backupFilePath, absoluteFilePath);
          this.processResult.restored.push(file);
          this.processResult.errors.push({ file, message: `Verification failed: ${testResult.error}` });
          await this.logger(`Verification failed after deleting ${file}. Restored file. Error: ${testResult.error}`);
          console.warn(`Tests failed for ${file}. Restored.`);
        }
      } catch (error) {
        this.processResult.errors.push({ file, message: `Failed to process: ${String(error)}` });
        await this.logger(`Failed to process ${file}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Error processing ${file}:`, error);
        // Tenter de restaurer même en cas d'erreur de traitement
        try {
          await fs.copyFile(backupFilePath, absoluteFilePath);
          this.processResult.restored.push(file); // Marquer comme restauré même si l'erreur n'était pas un échec de test
          await this.logger(`Attempted restoration for ${file} after processing error.`);
        } catch (restoreError) {
          await this.logger(`Critical: Failed to restore ${file} after processing error: ${String(restoreError)}`);
        }
      }
    }
    await this.logger('File processing loop finished.');
  }

  private async processGroups(groups: string[][]): Promise<void> {
    await this.logger('Starting group processing loop...');
    console.log('Processing groups for deletion...');

    const backupDirPath = this.sessionBackupRoot;
    await fs.mkdir(backupDirPath, { recursive: true });

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      await this.logger(`Processing group #${i + 1} (${group.length} files)`);
      console.log(`Processing group #${i + 1} (${group.length} files)`);

      // 1. Backup all
      try {
        for (const file of group) {
          const abs = path.resolve(process.cwd(), file);
          const bak = path.join(backupDirPath, file);
          await fs.mkdir(path.dirname(bak), { recursive: true });
          await fs.copyFile(abs, bak);
        }
        await this.logger(`Backed up ${group.length} files in group #${i + 1}`);
      } catch (err) {
        const msg = `Backup failed for group #${i + 1}: ${err instanceof Error ? err.message : String(err)}`;
        await this.logger(msg);
        this.processResult.groupResults.push({ group, status: 'restored', error: msg });
        // Skip this group entirely
        continue;
      }

      // 2. Delete all files
      try {
        for (const file of group) {
          const abs = path.resolve(process.cwd(), file);
          await fs.unlink(abs);
        }
        await this.logger(`Deleted ${group.length} files in group #${i + 1}`);
      } catch (err) {
        await this.logger(`Delete failed for group #${i + 1}, attempting restore: ${err instanceof Error ? err.message : String(err)}`);
        // Restore all in group
        for (const file of group) {
          const abs = path.resolve(process.cwd(), file);
          const bak = path.join(backupDirPath, file);
          await fs.copyFile(bak, abs).catch(() => {});
        }
        this.processResult.groupResults.push({ group, status: 'restored', error: 'Delete failure' });
        continue;
      }

      // 3. Run verifications
      const verify = await this.runVerifications(`after deleting group #${i + 1}`);
      if (verify.success) {
        this.processResult.groupResults.push({ group, status: 'deleted' });
        this.processResult.deleted.push(...group);
        await this.logger(`Verifications passed after group #${i + 1}.`);
      } else {
        // Restore all
        for (const file of group) {
          const abs = path.resolve(process.cwd(), file);
          const bak = path.join(backupDirPath, file);
          await fs.copyFile(bak, abs).catch(() => {});
        }
        this.processResult.groupResults.push({ group, status: 'restored', error: verify.error });
        this.processResult.restored.push(...group);
        await this.logger(`Verifications failed after group #${i + 1}, restored. Error: ${verify.error}`);
      }
    }
    await this.logger('Group processing loop finished.');
  }

  private async runVerifications(context: string): Promise<{ success: boolean; output: string; error: string }>{
    let combinedOut = '';
    let combinedErr = '';
    for (const cmd of this.config.verificationCommands!) {
      await this.logger(`Running verification (${context}): ${cmd}`);
      const res = await this.executeCommand(cmd);
      combinedOut += `\n--- ${cmd} stdout ---\n${res.output}`;
      combinedErr += `\n--- ${cmd} stderr ---\n${res.error}`;
      if (!res.success) {
        return { success: false, output: combinedOut, error: combinedErr || `Command failed: ${cmd}` };
      }
    }
    return { success: true, output: combinedOut, error: combinedErr };
  }

  // Very small glob matcher for blacklist patterns (supports *, **, and suffix/prefix)
  private matchesAnyPattern(file: string, patterns: string[]): boolean {
    const norm = file.split(path.sep).join(path.posix.sep);
    return patterns.some(p => this.globToRegExp(p).test(norm));
  }
  private globToRegExp(globPattern: string): RegExp {
    // Escape regex specials
  let re = globPattern.replace(/[\\^$+?.()|{}\[\]]/g, '\\$&');
    // Replace /**/ or ** with any including separators
    re = re.replace(/\*\*\/|\*\*/g, '::GLOBSTAR::');
    // Replace * with any except '/'
    re = re.replace(/\*/g, '[^/]*');
    // Replace GLOBSTAR with .*
    re = re.replace(/::GLOBSTAR::/g, '.*');
    // Handle leading ./
    re = re.replace(/^\.\//, '');
    return new RegExp(`^${re}$`);
  }

  private async generateReport(stats?: { totalAnalyzed: number; totalReachable: number; dormantCount: number; dormantGroups: string[][] }): Promise<void> {
    await this.logger('Generating final report...');
    console.log('Generating report...');

    let reportContent = `# Dormant Files Cleanup Report\n\n`;
    reportContent += `**Date:** ${new Date().toLocaleString()}\n`;
    if (stats) {
      reportContent += `**Total files analyzed:** ${stats.totalAnalyzed}\n`;
      reportContent += `**Reachable files:** ${stats.totalReachable}\n`;
      reportContent += `**Dormant files detected:** ${stats.dormantCount} in ${stats.dormantGroups.length} groups\n`;
    } else {
      reportContent += `**Total files analyzed:** (n/a)\n`;
    }
    reportContent += `**Files deleted successfully:** ${this.processResult.deleted.length}\n`;
    reportContent += `**Files restored (tests failed or error during processing):** ${this.processResult.restored.length}\n`;
    reportContent += `**Errors encountered:** ${this.processResult.errors.length}\n\n`;

    if (this.processResult.groupResults.length > 0) {
      reportContent += `## Group Results\n`;
      this.processResult.groupResults.forEach((gr, idx) => {
        reportContent += `- Group #${idx + 1} (${gr.group.length} files): ${gr.status.toUpperCase()}${gr.error ? ` — ${gr.error}` : ''}\n`;
      });
      reportContent += `\n`;
    }

    if (this.processResult.deleted.length > 0) {
      reportContent += `## Successfully Deleted Files\n`;
      this.processResult.deleted.forEach(file => {
        reportContent += `- ${file}\n`;
      });
      reportContent += `\n`;
    }

    if (this.processResult.restored.length > 0) {
      reportContent += `## Restored Files (Tests Failed or Processing Error)\n`;
      this.processResult.restored.forEach(file => {
        const error = this.processResult.errors.find(e => e.file === file);
        reportContent += `- ${file} (Reason: ${error ? error.message : 'Unknown error during processing'})\n`;
      });
      reportContent += `\n`;
    }

    if (this.processResult.errors.length > 0) {
      reportContent += `## Processing Errors\n`;
      this.processResult.errors.forEach(err => {
        reportContent += `- ${err.file}: ${err.message}\n`;
      });
      reportContent += `\n`;
    }

    await fs.writeFile(this.config.reportFile, reportContent);
    await this.logger(`Report generated: ${this.config.reportFile}`);

    // Finalize backups if configured
    if (this.config.finalizeBackups) {
      await this.finalizeBackups();
    }
  }

  private async finalizeBackups(): Promise<void> {
    try {
      // Only remove backups for files that were successfully deleted
      for (const file of this.processResult.deleted) {
        const bak = path.join(this.sessionBackupRoot, file);
        await fs.unlink(bak).catch(() => {});
        // remove empty dirs upward
        let dir = path.dirname(bak);
        while (dir.startsWith(this.sessionBackupRoot)) {
          const entries = await fs.readdir(dir).catch(() => [] as string[]);
          if (entries.length === 0) {
            await fs.rmdir(dir).catch(() => {});
            dir = path.dirname(dir);
          } else {
            break;
          }
        }
      }
      // If session backup root empty, remove it
      const remain = await fs.readdir(this.sessionBackupRoot).catch(() => [] as string[]);
      if (remain.length === 0) {
        await fs.rmdir(this.sessionBackupRoot).catch(() => {});
      }
      await this.logger('Backups finalized and cleaned for successfully deleted files.');
    } catch (err) {
      await this.logger(`Error during backup finalization: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// Fonction principale pour exécuter le script
async function main() {
  try {
    const configPath = path.resolve(process.cwd(), '.dormant-files-config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: IConfig = JSON.parse(configContent);

    const cleaner = new DormantFileCleaner(config);
    const isDryRun = process.argv.includes('--dry-run');
    await cleaner.run(isDryRun);

  } catch (error) {
    console.error('Fatal error during cleanup process:', error);
    process.exit(1);
  }
}

main();