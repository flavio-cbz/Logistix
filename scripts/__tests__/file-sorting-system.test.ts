import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileSortingSystem } from '../file-sorting-system';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

// Mocks pour les dépendances
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
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

describe('FileSortingSystem', () => {
  let fileSortingSystem: FileSortingSystem;
  
  beforeEach(() => {
    fileSortingSystem = new FileSortingSystem();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('devrait créer une instance du système de tri de fichiers', () => {
    expect(fileSortingSystem).toBeInstanceOf(FileSortingSystem);
  });
  
  it('devrait analyser les fichiers en mode analyse', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.analyzeMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analyse terminée'));
    consoleSpy.mockRestore();
  });
  
  it('devrait sauvegarder les fichiers en mode sauvegarde', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.backupMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mode sauvegarde terminé'));
    consoleSpy.mockRestore();
  });
  
  it('devrait supprimer les fichiers en mode suppression avec confirmation', async () => {
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
  
  it('devrait exécuter en mode silencieux sans interaction utilisateur', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await fileSortingSystem.silentMode();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mode silencieux terminé'));
    consoleSpy.mockRestore();
  });
});