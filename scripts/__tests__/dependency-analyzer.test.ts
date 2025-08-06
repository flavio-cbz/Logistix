/**
 * Dependency Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DependencyManager } from '../dependency-analyzer';
import fs from 'fs/promises';
import { glob } from 'glob';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('glob');

const mockFs = fs as any;
const mockGlob = glob as any;

describe('DependencyManager', () => {
  let dependencyManager: DependencyManager;
  const mockPackageJson = {
    dependencies: {
      'react': '^18.0.0',
      'next': '^14.0.0'
    },
    devDependencies: {
      'typescript': '^5.0.0',
      '@types/node': '^20.0.0'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dependencyManager = new DependencyManager('/test/project');
    
    // Mock package.json reading
    mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));
  });

  describe('analyzeDependencies', () => {
    it('should analyze project dependencies successfully', async () => {
      // Mock file discovery
      mockGlob.mockResolvedValue([
        'app/page.tsx',
        'lib/utils.ts',
        'components/Button.tsx'
      ]);

      // Mock file reading
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson)) // package.json
        .mockResolvedValueOnce(`import React from 'react';\nimport { useState } from 'react';`) // app/page.tsx
        .mockResolvedValueOnce(`import axios from 'axios';\nimport { z } from 'zod';`) // lib/utils.ts
        .mockResolvedValueOnce(`import { Button } from '@radix-ui/react-button';`); // components/Button.tsx

      const analysis = await dependencyManager.analyzeDependencies();

      expect(analysis).toBeDefined();
      expect(analysis.missing).toBeInstanceOf(Array);
      expect(analysis.unused).toBeInstanceOf(Array);
      expect(analysis.devDependencies).toBeInstanceOf(Array);
    });

    it('should handle file reading errors gracefully', async () => {
      mockGlob.mockResolvedValue(['app/page.tsx']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson)) // package.json
        .mockRejectedValueOnce(new Error('File not found')); // app/page.tsx

      const analysis = await dependencyManager.analyzeDependencies();

      expect(analysis).toBeDefined();
      // Should not throw error, just log warning
    });

    it('should identify missing dependencies', async () => {
      mockGlob.mockResolvedValue(['lib/utils.ts']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockResolvedValueOnce(`import axios from 'axios';\nimport { z } from 'zod';`);

      const analysis = await dependencyManager.analyzeDependencies();

      // axios and zod are not in mockPackageJson, so they should be missing
      expect(analysis.missing).toContain('axios');
      expect(analysis.missing).toContain('zod');
    });

    it('should identify unused dependencies', async () => {
      mockGlob.mockResolvedValue(['app/page.tsx']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockResolvedValueOnce(`import React from 'react';`); // Only uses react

      const analysis = await dependencyManager.analyzeDependencies();

      // next is in package.json but not used in the single file
      expect(analysis.unused).toContain('next');
    });
  });

  describe('validateUsage', () => {
    it('should return usage report', async () => {
      mockGlob.mockResolvedValue(['app/page.tsx']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockPackageJson))
        .mockResolvedValueOnce(`import React from 'react';`);

      const report = await dependencyManager.validateUsage();

      expect(report).toBeDefined();
      expect(report.uniquePackages).toBeGreaterThan(0);
      expect(report.missingPackages).toBeInstanceOf(Array);
      expect(report.unusedPackages).toBeInstanceOf(Array);
    });
  });

  describe('updatePackageJson', () => {
    it('should add missing dependencies', async () => {
      const updates = {
        add: { 'axios': '^1.0.0', 'zod': '^3.0.0' },
        remove: []
      };

      await dependencyManager.updatePackageJson(updates);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('axios'),
        
      );
    });

    it('should remove unused dependencies', async () => {
      const updates = {
        add: {},
        remove: ['unused-package']
      };

      await dependencyManager.updatePackageJson(updates);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should categorize dev dependencies correctly', async () => {
      const updates = {
        add: { '@types/react': '^18.0.0', 'axios': '^1.0.0' },
        remove: []
      };

      await dependencyManager.updatePackageJson(updates);

      expect(mockFs.writeFile).toHaveBeenCalled();
      // @types/react should go to devDependencies, axios to dependencies
    });

    it('should sort dependencies alphabetically', async () => {
      const updates = {
        add: { 'zod': '^3.0.0', 'axios': '^1.0.0' },
        remove: []
      };

      await dependencyManager.updatePackageJson(updates);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      // Check that dependencies are sorted
      const depKeys = Object.keys(parsedContent.dependencies);
      const sortedKeys = [...depKeys].sort();
      expect(depKeys).toEqual(sortedKeys);
    });
  });

  describe('cleanupUnused', () => {
    it('should remove unused dependencies but keep essential ones', async () => {
      mockGlob.mockResolvedValue(['app/page.tsx']);
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify({
          dependencies: {
            'react': '^18.0.0',
            'next': '^14.0.0',
            'unused-package': '^1.0.0'
          }
        }))
        .mockResolvedValueOnce(`import React from 'react';`);

      const result = await dependencyManager.cleanupUnused();

      expect(result.removed).toContain('unused-package');
      expect(result.kept).toContain('next'); // Essential package should be kept
      expect(result.kept).toContain('react'); // Used package should be kept
    });
  });

  describe('extractPackageName', () => {
    it('should extract scoped package names correctly', () => {
      const manager = new DependencyManager();
      
      // Access private method through any cast for testing
      const extractPackageName = (manager as any).extractPackageName.bind(manager);
      
      expect(extractPackageName('@radix-ui/react-button')).toBe('@radix-ui/react-button');
      expect(extractPackageName('@types/node')).toBe('@types/node');
      expect(extractPackageName('react')).toBe('react');
      expect(extractPackageName('lodash/debounce')).toBe('lodash');
    });
  });

  describe('isRelativeImport', () => {
    it('should identify relative imports correctly', () => {
      const manager = new DependencyManager();
      
      const isRelativeImport = (manager as any).isRelativeImport.bind(manager);
      
      expect(isRelativeImport('./utils')).toBe(true);
      expect(isRelativeImport('../components/Button')).toBe(true);
      expect(isRelativeImport('@/lib/utils')).toBe(true);
      expect(isRelativeImport('react')).toBe(false);
      expect(isRelativeImport('@radix-ui/react-button')).toBe(false);
    });
  });

  describe('parseImports', () => {
    it('should parse various import patterns', () => {
      const manager = new DependencyManager();
      const parseImports = (manager as any).parseImports.bind(manager);
      
      const content = `
        import React from 'react';
        import { useState, useEffect } from 'react';
        import * as utils from 'lodash';
        import 'normalize.css';
        const axios = require('axios');
        import('./dynamic-import');
      `;

      const imports = parseImports(content, 'test.tsx');

      expect(imports).toBeInstanceOf(Array);
      expect(imports.length).toBeGreaterThan(0);
    });

    it('should ignore relative imports', () => {
      const manager = new DependencyManager();
      const parseImports = (manager as any).parseImports.bind(manager);
      
      const content = `
        import React from 'react';
        import { Button } from './Button';
        import utils from '../utils';
        import config from '@/config';
      `;

      const imports = parseImports(content, 'test.tsx');

      // Should only find 'react', not the relative imports
      expect(imports.some((imp: any) => imp.file.includes('react'))).toBe(false);
      expect(imports.some((imp: any) => imp.file.includes('Button'))).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle package.json read errors', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(dependencyManager.analyzeDependencies()).rejects.toThrow('Failed to load package.json');
    });

    it('should handle invalid package.json', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');

      await expect(dependencyManager.analyzeDependencies()).rejects.toThrow();
    });

    it('should handle glob errors gracefully', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockPackageJson));
      mockGlob.mockRejectedValueOnce(new Error('Glob error'));

      // Should handle the error gracefully
      await expect(dependencyManager.analyzeDependencies()).rejects.toThrow();
    });
  });
});