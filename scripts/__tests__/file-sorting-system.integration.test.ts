import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSortingSystem } from '../file-sorting-system';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// Mocks pour les dépendances
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('../detect-unreferenced-files', () => ({
  detectUnreferencedFiles: vi.fn().mockResolvedValue([
    { path: '/test/file1.ts', score: 50, type: 'leaf', reasons: ['test'] },
    { path: '/test/file2.ts', score: 80, type: 'intermediate', reasons: ['test'] }
  ])
}));

vi.mock('../backup-system', () => ({
  BackupSystem: vi.fn().mockImplementation(() => ({
    selectiveBackup: vi.fn().mockResolvedValue({ success: true })
  }))
}));

describe('FileSortingSystem - Tests d\'Intégration', () => {
  let fileSortingSystem: FileSortingSystem;
  
  beforeEach(() => {
    fileSortingSystem = new FileSortingSystem();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('devrait exécuter le workflow complet en mode analyse', async () => {
    // Mock des dépendances
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      projectRoot: '.',
      excludePatterns: ['node_modules/**'],
      riskThresholds: { low: 30, medium: 70, high: 90 },
      backup: { enabled: true, directory: './backups', maxBackups: 5, compression: true },
      output: { format: 'json', directory: './reports' }
    }));
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.analyzeMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analyse terminée'));
    consoleSpy.mockRestore();
  });
  
  it('devrait exécuter le workflow complet en mode sauvegarde', async () => {
    // Mock des dépendances
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      projectRoot: '.',
      excludePatterns: ['node_modules/**'],
      riskThresholds: { low: 30, medium: 70, high: 90 },
      backup: { enabled: true, directory: './backups', maxBackups: 5, compression: true },
      output: { format: 'json', directory: './reports' }
    }));
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.backupMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mode sauvegarde terminé'));
    consoleSpy.mockRestore();
  });
  
  it('devrait exécuter le workflow complet en mode suppression avec confirmation', async () => {
    // Mock des dépendances
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      projectRoot: '.',
      excludePatterns: ['node_modules/**'],
      riskThresholds: { low: 30, medium: 70, high: 90 },
      backup: { enabled: true, directory: './backups', maxBackups: 5, compression: true },
      output: { format: 'json', directory: './reports' }
    }));
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const readlineSpy = vi.spyOn(require('readline'), 'createInterface').mockReturnValue({
      question: (query: string, callback: (answer: string) => void) => callback('y'),
      close: vi.fn()
    });
    
    await fileSortingSystem.deleteMode(false);
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mode suppression terminé'));
    readlineSpy.mockRestore();
    consoleSpy.mockRestore();
  });
  
  it('devrait exécuter le workflow complet en mode silencieux', async () => {
    // Mock des dépendances
    (existsSync as jest.Mock).mockReturnValue(true);
    (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      projectRoot: '.',
      excludePatterns: ['node_modules/**'],
      riskThresholds: { low: 30, medium: 70, high: 90 },
      backup: { enabled: true, directory: './backups', maxBackups: 5, compression: true },
      output: { format: 'json', directory: './reports' }
    }));
    
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.silentMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mode silencieux terminé'));
    consoleSpy.mockRestore();
  });
});