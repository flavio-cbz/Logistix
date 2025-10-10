#!/usr/bin/env tsx

/**
 * Gestionnaire consolidé pour les opérations Vinted
 * Regroupe les fonctionnalités de test, rafraîchissement et vérification
 */

import { Command } from 'commander';

const program = new Command();

// Some TypeScript typings for the installed commander version may not expose `name` on Command;
// call it via a safe cast to avoid the compile error while keeping fluent API for description/version.
;(program as unknown as { name: (name: string) => Command }).name('vinted-manager');

program
  .description('Gestionnaire consolidé pour les opérations Vinted')
  .version('1.0.0');

program
  .command('init')
  .description('Initialiser une nouvelle session Vinted')
  .action(async () => {
    const mod = await import('./development/init-vinted-session') as { default?: Function; initVintedSession?: Function };
    const initSession = mod.default ?? mod.initVintedSession;
    if (typeof initSession !== 'function') {
      throw new Error("Module './development/init-vinted-session' does not export a callable 'default' or 'initVintedSession'");
    }
    await initSession();
  });

program
  .command('test')
  .description('Tester une session Vinted existante')
  .action(async () => {
    const mod = await import('./development/test-vinted-session') as { 
      default?: Function; 
      testVintedSession?: Function; 
      testSession?: Function; 
      runTest?: Function 
    };
    const testSession = mod.default ?? mod.testVintedSession ?? mod.testSession ?? mod.runTest;
    if (typeof testSession !== 'function') {
      throw new Error("Module './development/test-vinted-session' does not export a callable 'default' or a known test function");
    }
    await testSession();
  });

program
  .command('refresh')
  .description('Rafraîchir les tokens expirés depuis la base de données')
  .action(async () => {
    const mod = await import('./development/refresh-vinted-token') as { 
      default?: Function; 
      refreshVintedToken?: Function; 
      refreshToken?: Function 
    };
    const refreshToken = mod.default ?? mod.refreshVintedToken ?? mod.refreshToken;
    if (typeof refreshToken !== 'function') {
      throw new Error("Module './development/refresh-vinted-token' does not export a callable 'default' or 'refreshVintedToken'");
    }
    await refreshToken();
  });

program
  .command('verify')
  .description('Vérifier l\'intégration du système Vinted')
  .action(async () => {
    const { verifyIntegration } = await import('./development/verify-vinted-integration');
    await verifyIntegration();
  });

program
  .command('report')
  .description('Générer un rapport du système Vinted')
  .action(async () => {
    const mod = await import('./development/vinted-system-report') as { 
      default?: Function; 
      generateReport?: Function 
    };
    const generateReport = mod.default ?? mod.generateReport;
    if (typeof generateReport !== 'function') {
      throw new Error("Module './development/vinted-system-report' does not export a callable 'default' or 'generateReport'");
    }
    await generateReport();
  });

program.parse();
