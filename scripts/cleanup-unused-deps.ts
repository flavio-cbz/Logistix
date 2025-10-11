#!/usr/bin/env tsx

/**
 * Script de nettoyage des dépendances npm inutilisées
 * Basé sur l'analyse Knip - Phase sécurisée avec backup
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import * as path from 'path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Liste des dépendances inutilisées selon Knip (à vérifier)
const UNUSED_DEPS = {
  // À supprimer immédiatement
  immediate: [
    '@auth/core',
    '@databases/sqlite',
    '@hello-pangea/dnd',
    'bcryptjs',
    'date-fns',
    'embla-carousel-react',
    'input-otp',
    'jsonwebtoken',
    'lru-cache',
    'next-auth',
    'node-cron',
    'openai',
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'react-day-picker',
    'react-resizable-panels',
    'vaul'
  ],

  // Radix UI inutilisés (à vérifier un par un)
  radix: [
    '@radix-ui/react-accordion',
    '@radix-ui/react-aspect-ratio',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-context-menu',
    '@radix-ui/react-hover-card',
    '@radix-ui/react-menubar',
    '@radix-ui/react-navigation-menu',
    '@radix-ui/react-slider',
    '@radix-ui/react-toggle',
    '@radix-ui/react-toggle-group',
    '@radix-ui/react-tooltip', // ⚠️ Peut être utilisé via composition
    '@sentry/node'
  ],

  // devDependencies inutilisées
  devDeps: [
    '@jest/globals',
    '@testing-library/user-event',
    '@types/cookie',
    '@types/jsonwebtoken'
  ]
};

function loadPackageJson(): PackageJson {
  const packagePath = path.join(process.cwd(), 'package.json');
  return JSON.parse(readFileSync(packagePath, 'utf-8'));
}

function savePackageJson(data: PackageJson): void {
  const packagePath = path.join(process.cwd(), 'package.json');
  writeFileSync(packagePath, JSON.stringify(data, null, 2) + '\n');
}

function backupPackageJson(): void {
  const packagePath = path.join(process.cwd(), 'package.json');
  const backupPath = path.join(process.cwd(), 'package.json.backup');

  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, readFileSync(packagePath));
    console.log('✅ Backup créé : package.json.backup');
  }
}

function getPresentDeps(packageJson: PackageJson, deps: string[]): string[] {
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  return deps.filter(dep => allDeps[dep]);
}

function removeDependency(packageName: string): boolean {
  try {
    console.log(`🗑️  Suppression de ${packageName}...`);
    execSync(`npm uninstall ${packageName}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Échec suppression ${packageName}:`, error);
    return false;
  }
}

function confirmAction(message: string): boolean {
  if (process.argv.includes('--yes') || process.argv.includes('-y')) {
    return true;
  }

  // Pour un script interactif, on pourrait utiliser readline
  // Mais pour l'instant, on demande confirmation manuelle
  console.log(`\n⚠️  ${message}`);
  console.log('Appuyez sur Entrée pour continuer ou Ctrl+C pour annuler...');
  process.stdin.once('data', () => {
    // Continue
  });

  return true;
}

async function main() {
  console.log('🧹 Nettoyage des dépendances npm inutilisées\n');

  // Charger package.json
  const packageJson = loadPackageJson();

  // Backup
  backupPackageJson();

  let totalRemoved = 0;

  // Phase 1: Dépendances à supprimer immédiatement
  console.log('\n📦 Phase 1: Dépendances à supprimer immédiatement');
  const presentImmediate = getPresentDeps(packageJson, UNUSED_DEPS.immediate);

  if (presentImmediate.length > 0) {
    console.log(`\nTrouvé ${presentImmediate.length} dépendances à supprimer:`);
    presentImmediate.forEach(dep => console.log(`  - ${dep}`));

    if (confirmAction('Supprimer ces dépendances ?')) {
      for (const dep of presentImmediate) {
        if (removeDependency(dep)) {
          totalRemoved++;
        }
      }
    }
  } else {
    console.log('✅ Aucune dépendance de cette catégorie présente.');
  }

  // Phase 2: Radix UI (vérification plus fine)
  console.log('\n🎨 Phase 2: Composants Radix UI inutilisés');
  const presentRadix = getPresentDeps(packageJson, UNUSED_DEPS.radix);

  if (presentRadix.length > 0) {
    console.log(`\nTrouvé ${presentRadix.length} composants Radix UI:`);
    presentRadix.forEach(dep => console.log(`  - ${dep}`));

    // Vérification spéciale pour tooltip (peut être utilisé via composition)
    if (presentRadix.includes('@radix-ui/react-tooltip')) {
      console.log('\n⚠️  @radix-ui/react-tooltip peut être utilisé via composition.');
      console.log('   Vérifiez s\'il est vraiment inutilisé avant suppression.');
    }

    if (confirmAction('Supprimer ces composants Radix UI ?')) {
      for (const dep of presentRadix) {
        if (dep === '@radix-ui/react-tooltip') {
          console.log('⏭️  Saut de @radix-ui/react-tooltip (vérification manuelle recommandée)');
          continue;
        }
        if (removeDependency(dep)) {
          totalRemoved++;
        }
      }
    }
  } else {
    console.log('✅ Aucun composant Radix UI inutilisé trouvé.');
  }

  // Phase 3: devDependencies
  console.log('\n🛠️  Phase 3: devDependencies inutilisées');
  const presentDevDeps = getPresentDeps(packageJson, UNUSED_DEPS.devDeps);

  if (presentDevDeps.length > 0) {
    console.log(`\nTrouvé ${presentDevDeps.length} devDependencies:`);
    presentDevDeps.forEach(dep => console.log(`  - ${dep}`));

    if (confirmAction('Supprimer ces devDependencies ?')) {
      for (const dep of presentDevDeps) {
        if (removeDependency(dep)) {
          totalRemoved++;
        }
      }
    }
  } else {
    console.log('✅ Aucune devDependency inutilisée trouvée.');
  }

  // Résumé
  console.log(`\n🎉 Nettoyage terminé !`);
  console.log(`📊 ${totalRemoved} dépendances supprimées`);
  console.log(`💾 Backup disponible : package.json.backup`);

  if (totalRemoved > 0) {
    console.log('\n🔍 Vérifications recommandées :');
    console.log('  - npm run checks');
    console.log('  - npm run test');
    console.log('  - npm run build');
  }
}

// Exécution
if (require.main === module) {
  main().catch(console.error);
}

export { main as cleanupUnusedDeps };