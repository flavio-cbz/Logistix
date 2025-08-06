/**
 * File Cleanup Manager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileCleanupManager } from '../file-cleanup-manager';
import fs from 'fs/promises';
import { glob } from 'glob';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('glob');

const mockFs = fs as any;
const mockGlob = glob as any;

describe('FileCleanupManager', () => {
  let fileCleanupManager: FileCleanupManager;

  beforeEach(() => {
    vi.clearAllMocks();
    fileCleanupManager = new FileCleanupManager('/test/project');
  });

  describe('scanProject', () => {
    it('should scan project files successfully', async () => {
      // Mock glob to return test files
      mockGlob.mockResolvedValue([
        'app/page.tsx',
        'lib/utils.ts',
        'components/Button.tsx',
        'README.md',
        'package.json',
        'orphaned-file.js'
      ]);

      // Mock fs.stat to return file stats
      mockFs.stat.mockResolvedValue({ isFile: () => true });

      // Mock file reading for reference analysis
      mockFs.readFile
        .mockResolvedValueOnce(`import { utils } from '../lib/utils';\nimport Button from '../components/Button';`) // app/page.tsx
        .mockResolvedValueOnce(`export const helper = () => {};`) // lib/utils.ts
        .mockResolvedValueOnce(`export default function Button() {}`) // components/Button.tsx
        .mockResolvedValueOnce(`# Project README`) // README.md
        .mockResolvedValueOnce(`{}`) // package.json
        .mockResolvedValueOnce(`// Orphaned file`); // orphaned-file.js

      const analysis = await fileCleanupManager.scanProject();

      expect(analysis).toBeDefined();
      expect(analysis.totalFiles).toBe(6);
      expect(analysis.referencedFiles).toBeInstanceOf(Array);
      expect(analysis.orphanedFiles).toBeInstanceOf(Array);
      expect(analysis.testFiles).toBeInstanceOf(Array);
      expect(analysis.documentationFiles).toBeInstanceOf(Array);
    });

    it('should handle file access errors gracefully', async () => {
      mockGlob.mockResolvedValue(['inaccessible-file.txt']);
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));

      const analysis = await fileCleanupManager.scanProject();

      expect(analysis.totalFiles).toBe(0);
      // Should not throw error, just log warning
    });

    it('should filter out directories', async () => {
      mockGlob.mockResolvedValue(['file.txt', 'directory']);
      mockFs.stat
        .mockResolvedValueOnce({ isFile: () => true })  // file.txt
        .mockResolvedValueOnce({ isFile: () => false }); // directory

      mockFs.readFile.mockResolvedValue('file content');

      const analysis = await fileCleanupManager.scanProject();

      expect(analysis.totalFiles).toBe(1);
    });
  });

  describe('identifyOrphans', () => {
    it('should identify orphaned files correctly', async () => {
      mockGlob.mockResolvedValue([
        'used-file.ts',
        'orphaned-file.js',
        'protected-file.json',
        'test-file.test.ts'
      ]);

      mockFs.stat.mockResolvedValue({ isFile: () => true });
      mockFs.readFile
        .mockResolvedValueOnce(`import './orphaned-file';`) // used-file.ts references orphaned-file
        .mockResolvedValueOnce(`// Orphaned content`) // orphaned-file.js
        .mockResolvedValueOnce(`{}`) // protected-file.json
        .mockResolvedValueOnce(`describe('test', () => {})`); // test-file.test.ts

      const orphans = await fileCleanupManager.identifyOrphans();

      expect(orphans).toBeDefined();
      expect(orphans.safeToRemove).toBeInstanceOf(Array);
      expect(orphans.requiresReview).toBeInstanceOf(Array);
      expect(orphans.protected).toBeInstanceOf(Array);
    });

    it('should protect important files', async () => {
      mockGlob.mockResolvedValue([
        'package.json',
        'README.md',
        'next.config.js',
        '.gitignore'
      ]);

      mockFs.stat.mockResolvedValue({ isFile: () => true });
      mockFs.readFile.mockResolvedValue('content');

      const orphans = await fileCleanupManager.identifyOrphans();

      // These files should be protected even if not referenced
      expect(orphans.protected.length).toBeGreaterThan(0);
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      mockGlob.mockResolvedValue(['file1.txt', 'file2.js']);
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      const backupPath = await fileCleanupManager.createBackup();

      expect(backupPath).toContain('backup-');
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.copyFile).toHaveBeenCalledTimes(2);
    });

    it('should handle backup creation errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(fileCleanupManager.createBackup()).rejects.toThrow('Failed to create backup');
    });

    it('should handle individual file copy errors gracefully', async () => {
      mockGlob.mockResolvedValue(['file1.txt', 'file2.js']);
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile
        .mockResolvedValueOnce(undefined) // file1.txt succeeds
        .mockRejectedValueOnce(new Error('Copy failed')); // file2.js fails

      const backupPath = await fileCleanupManager.createBackup();

      expect(backupPath).toBeDefined();
      // Should complete backup despite individual file failures
    });
  });

  describe('safeRemove', () => {
    it('should remove files and create backup', async () => {
      const filesToRemove = ['file1.txt', 'file2.js'];
      
      // Mock backup creation
      mockGlob.mockResolvedValue(filesToRemove);
      mockFs.stat.mockResolvedValue({ isFile: () => true });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      
      // Mock file removal
      mockFs.unlink.mockResolvedValue(undefined);

      const report = await fileCleanupManager.safeRemove(filesToRemove);

      expect(report.removed).toEqual(filesToRemove);
      expect(report.failed).toEqual([]);
      expect(report.backupPath).toContain('backup-');
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should handle file removal failures', async () => {
      const filesToRemove = ['file1.txt', 'file2.js'];
      
      // Mock backup creation
      mockGlob.mockResolvedValue([]);
      mockFs.mkdir.mockResolvedValue(undefined);
      
      // Mock file removal - first succeeds, second fails
      mockFs.unlink
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Permission denied'));

      const report = await fileCleanupManager.safeRemove(filesToRemove);

      expect(report.removed).toEqual(['file1.txt']);
      expect(report.failed).toEqual(['file2.js']);
    });
  });

  describe('file type detection', () => {
    it('should identify test files correctly', () => {
      const manager = new FileCleanupManager();
      const isTestFile = (manager as any).isTestFile.bind(manager);

      expect(isTestFile('component.test.ts')).toBe(true);
      expect(isTestFile('utils.spec.js')).toBe(true);
      expect(isTestFile('tests/integration.test.tsx')).toBe(true);
      expect(isTestFile('__tests__/unit.js')).toBe(true);
      expect(isTestFile('e2e/login.spec.ts')).toBe(true);
      expect(isTestFile('component.ts')).toBe(false);
    });

    it('should identify documentation files correctly', () => {
      const manager = new FileCleanupManager();
      const isDocumentationFile = (manager as any).isDocumentationFile.bind(manager);

      expect(isDocumentationFile('README.md')).toBe(true);
      expect(isDocumentationFile('CHANGELOG.md')).toBe(true);
      expect(isDocumentationFile('docs/api.md')).toBe(true);
      expect(isDocumentationFile('LICENSE')).toBe(true);
      expect(isDocumentationFile('component.ts')).toBe(false);
    });

    it('should identify config files correctly', () => {
      const manager = new FileCleanupManager();
      const isConfigFile = (manager as any).isConfigFile.bind(manager);

      expect(isConfigFile('package.json')).toBe(true);
      expect(isConfigFile('next.config.js')).toBe(true);
      expect(isConfigFile('tsconfig.json')).toBe(true);
      expect(isConfigFile('.eslintrc')).toBe(true);
      expect(isConfigFile('.env.local')).toBe(true);
      expect(isConfigFile('component.ts')).toBe(false);
    });

    it('should identify asset files correctly', () => {
      const manager = new FileCleanupManager();
      const isAssetFile = (manager as any).isAssetFile.bind(manager);

      expect(isAssetFile('logo.png')).toBe(true);
      expect(isAssetFile('icon.svg')).toBe(true);
      expect(isAssetFile('font.woff2')).toBe(true);
      expect(isAssetFile('video.mp4')).toBe(true);
      expect(isAssetFile('document.pdf')).toBe(true);
      expect(isAssetFile('component.ts')).toBe(false);
    });
  });

  describe('import resolution', () => {
    it('should resolve relative imports correctly', () => {
      const manager = new FileCleanupManager();
      const resolveImportPath = (manager as any).resolveImportPath.bind(manager);

      // Mock file references map
      (manager as any).fileReferences = new Map([
        ['lib/utils.ts', {}],
        ['components/Button.tsx', {}],
        ['lib/index.ts', {}]
      ]);

      expect(resolveImportPath('./utils', 'lib/index.ts')).toBe('lib/utils.ts');
      expect(resolveImportPath('../components/Button', 'lib/utils.ts')).toBe('components/Button.tsx');
    });

    it('should resolve path aliases correctly', () => {
      const manager = new FileCleanupManager();
      const resolveImportPath = (manager as any).resolveImportPath.bind(manager);

      (manager as any).fileReferences = new Map([
        ['lib/utils.ts', {}]
      ]);

      expect(resolveImportPath('@/lib/utils', 'app/page.tsx')).toBe('lib/utils.ts');
    });

    it('should handle non-existent imports', () => {
      const manager = new FileCleanupManager();
      const resolveImportPath = (manager as any).resolveImportPath.bind(manager);

      (manager as any).fileReferences = new Map();

      expect(resolveImportPath('./non-existent', 'app/page.tsx')).toBe(null);
    });
  });

  describe('safe removal patterns', () => {
    it('should identify safe-to-remove patterns', () => {
      const manager = new FileCleanupManager();
      const isSafeToRemove = (manager as any).isSafeToRemove.bind(manager);

      expect(isSafeToRemove('temp.tmp')).toBe(true);
      expect(isSafeToRemove('backup.bak')).toBe(true);
      expect(isSafeToRemove('file.orig')).toBe(true);
      expect(isSafeToRemove('.DS_Store')).toBe(true);
      expect(isSafeToRemove('scripts/old/legacy.js')).toBe(true);
      expect(isSafeToRemove('important-file.ts')).toBe(false);
    });
  });

  describe('protected file patterns', () => {
    it('should identify protected files', () => {
      const manager = new FileCleanupManager();
      const isProtectedFile = (manager as any).isProtectedFile.bind(manager);

      expect(isProtectedFile('package.json')).toBe(true);
      expect(isProtectedFile('README.md')).toBe(true);
      expect(isProtectedFile('.gitignore')).toBe(true);
      expect(isProtectedFile('next.config.js')).toBe(true);
      expect(isProtectedFile('node_modules/package/index.js')).toBe(true);
      expect(isProtectedFile('data/database.db')).toBe(true);
      expect(isProtectedFile('regular-file.ts')).toBe(false);
    });
  });
});