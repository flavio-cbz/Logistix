import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync, statSync } from 'fs';

export interface CleanupResult {
  filesRemoved: string[];
  directoriesRemoved: string[];
  errors: string[];
  totalSizeFreed: number;
}

export interface CleanupOptions {
  dryRun?: boolean;
  verbose?: boolean;
  backupBeforeDelete?: boolean;
}

export class FileCleanupService {
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Identifies and removes obsolete files and directories
   */
  async cleanupObsoleteFiles(options: CleanupOptions = {}): Promise<CleanupResult> {
    const { dryRun = false, verbose = false } = options;
    
    const result: CleanupResult = {
      filesRemoved: [],
      directoriesRemoved: [],
      errors: [],
      totalSizeFreed: 0
    };

    try {
      // 1. Identify temporary and cache files
      const tempFiles = await this.identifyTemporaryFiles();
      
      // 2. Identify obsolete documentation
      const obsoleteDocs = await this.identifyObsoleteDocumentation();
      
      // 3. Identify old backup files (keep only the most recent)
      const oldBackups = await this.identifyOldBackupFiles();
      
      // 4. Identify test artifacts that can be regenerated
      const testArtifacts = await this.identifyTestArtifacts();

      const allFilesToRemove = [
        ...tempFiles,
        ...obsoleteDocs,
        ...oldBackups,
        ...testArtifacts
      ];

      // Remove files
      for (const filePath of allFilesToRemove) {
        try {
          const fullPath = join(this.projectRoot, filePath);
          if (existsSync(fullPath)) {
            const stats = statSync(fullPath);
            result.totalSizeFreed += stats.size;

            if (!dryRun) {
              await fs.unlink(fullPath);
            }
            
            result.filesRemoved.push(filePath);
            
            if (verbose) {
              console.log(`${dryRun ? '[DRY RUN] Would remove' : 'Removed'}: ${filePath}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to remove ${filePath}: ${error}`;
          result.errors.push(errorMsg);
          if (verbose) {
            console.error(errorMsg);
          }
        }
      }

      // 5. Remove empty directories
      const emptyDirs = await this.identifyEmptyDirectories();
      for (const dirPath of emptyDirs) {
        try {
          const fullPath = join(this.projectRoot, dirPath);
          if (existsSync(fullPath)) {
            if (!dryRun) {
              await fs.rmdir(fullPath);
            }
            
            result.directoriesRemoved.push(dirPath);
            
            if (verbose) {
              console.log(`${dryRun ? '[DRY RUN] Would remove directory' : 'Removed directory'}: ${dirPath}`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to remove directory ${dirPath}: ${error}`;
          result.errors.push(errorMsg);
          if (verbose) {
            console.error(errorMsg);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Cleanup failed: ${error}`);
    }

    return result;
  }

  /**
   * Identifies temporary and cache files
   */
  private async identifyTemporaryFiles(): Promise<string[]> {
    const tempFiles: string[] = [];
    
    // TypeScript build info
    if (existsSync(join(this.projectRoot, '.tsbuildinfo'))) {
      tempFiles.push('.tsbuildinfo');
    }

    // SQLite WAL and SHM files (can be regenerated)
    const sqliteFiles = [
      'data/logistix.db-shm',
      'data/logistix.db-wal',
      'logistix.db' // Duplicate database file in root
    ];

    for (const file of sqliteFiles) {
      if (existsSync(join(this.projectRoot, file))) {
        tempFiles.push(file);
      }
    }

    return tempFiles;
  }

  /**
   * Identifies obsolete documentation files
   */
  private async identifyObsoleteDocumentation(): Promise<string[]> {
    const obsoleteDocs: string[] = [];
    
    // Analysis reports that are no longer needed
    const analysisFiles = [
      'lib/audit-report-structure-analysis.md',
      'lib/circular-dependencies-analysis.md',
      'lib/file-utility-analysis-matrix.md',
      'lib/inventory-duplicated-files.json',
      'CLEANUP-SUMMARY.md',
      'DEEP-CLEANUP-REPORT.md'
    ];

    for (const file of analysisFiles) {
      if (existsSync(join(this.projectRoot, file))) {
        obsoleteDocs.push(file);
      }
    }

    return obsoleteDocs;
  }

  /**
   * Identifies old backup files (keeps only the most recent)
   */
  private async identifyOldBackupFiles(): Promise<string[]> {
    const oldBackups: string[] = [];
    
    try {
      const backupsDir = join(this.projectRoot, 'backups');
      if (existsSync(backupsDir)) {
        const files = await fs.readdir(backupsDir);
        const backupFiles = files
          .filter(file => file.startsWith('logistix-backup-') && file.endsWith('.db.gz'))
          .map(file => ({
            name: file,
            path: join('backups', file),
            stats: statSync(join(backupsDir, file))
          }))
          .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

        // Keep only the most recent backup, mark others for deletion
        if (backupFiles.length > 1) {
          for (let i = 1; i < backupFiles.length; i++) {
            oldBackups.push(backupFiles[i]?.path || "");
          }
        }
      }
    } catch (error) {
      console.warn('Could not process backup files:', error);
    }

    return oldBackups;
  }

  /**
   * Identifies test artifacts that can be regenerated
   */
  private async identifyTestArtifacts(): Promise<string[]> {
    const testArtifacts: string[] = [];
    
    // Playwright test results
    const testDirs = [
      'test-results',
      'playwright-report'
    ];

    for (const dir of testDirs) {
      const fullPath = join(this.projectRoot, dir);
      if (existsSync(fullPath)) {
        try {
          const files = await this.getAllFilesInDirectory(fullPath);
          testArtifacts.push(...files.map(file => file.replace(this.projectRoot + '/', '')));
        } catch (error) {
          console.warn(`Could not process test directory ${dir}:`, error);
        }
      }
    }

    // Specific test result files
    const testFiles = [
      'test-results/.last-run.json'
    ];

    for (const file of testFiles) {
      if (existsSync(join(this.projectRoot, file))) {
        testArtifacts.push(file);
      }
    }

    return testArtifacts;
  }

  /**
   * Identifies empty directories
   */
  private async identifyEmptyDirectories(): Promise<string[]> {
    const emptyDirs: string[] = [];
    
    // Check specific directories that might become empty after cleanup
    const dirsToCheck = [
      'test-results',
      'playwright-report'
    ];

    for (const dir of dirsToCheck) {
      const fullPath = join(this.projectRoot, dir);
      if (existsSync(fullPath)) {
        try {
          const files = await fs.readdir(fullPath);
          if (files.length === 0) {
            emptyDirs.push(dir);
          }
        } catch (error) {
          console.warn(`Could not check directory ${dir}:`, error);
        }
      }
    }

    return emptyDirs;
  }

  /**
   * Recursively gets all files in a directory
   */
  private async getAllFilesInDirectory(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.getAllFilesInDirectory(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Formats file size in human readable format
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}