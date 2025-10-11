#!/usr/bin/env tsx
/**
 * 🧹 Script de Nettoyage Interactif Logistix
 * 
 * Utilise le rapport Knip pour supprimer intelligemment le code inutilisé
 * avec confirmations utilisateur et backups automatiques.
 * 
 * Usage: npx tsx scripts/smart-cleanup-with-knip.ts
 */

import { readFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, relative, dirname, basename } from 'path';

interface KnipIssue {
  file: string;
  dependencies?: Array<{ name: string; line: number }>;
  devDependencies?: Array<{ name: string; line: number }>;
  exports?: Array<{ name: string; line: number }>;
  types?: Array<{ name: string; line: number }>;
  duplicates?: Array<{ name: string; line: number }>;
}

interface KnipReport {
  files: string[];
  issues: KnipIssue[];
}

// Catégories de fichiers par risque
const FILE_CATEGORIES = {
  scripts: {
    name: '🟢 Scripts de Maintenance',
    risk: 0,
    pattern: /^scripts\/(?!db\/|production\/|__tests__|backup-system|smart-cleanup)/,
    action: 'archive' as const,
  },
  barrels: {
    name: '🟡 Barrel Exports (index.ts)',
    risk: 5,
    pattern: /\/index\.ts$/,
    action: 'delete' as const,
  },
  uiComponents: {
    name: '🟠 Composants UI shadcn/ui',
    risk: 10,
    pattern: /^components\/ui\/(breadcrumb|calendar|card-stats|chart|enhanced-|live-region|sheet|slider|toggle)/,
    action: 'delete' as const,
  },
  featureComponents: {
    name: '🟠 Composants Features',
    risk: 15,
    pattern: /^components\/features\/(market-analysis|statistiques|notifications|profile)/,
    action: 'review' as const, // Nécessite validation manuelle
  },
  services: {
    name: '🔴 Services Redondants',
    risk: 25,
    pattern: /^lib\/(analytics|cache|services|monitoring)\//,
    action: 'review' as const,
  },
  ddd: {
    name: '🔴 Architecture DDD Incomplète',
    risk: 30,
    pattern: /^lib\/(application|domain|infrastructure)\//,
    action: 'review' as const,
  },
  utils: {
    name: '🟢 Utils Redondants',
    risk: 10,
    pattern: /^lib\/utils\/(accessibility|api-route-optimization|chart-utils|duplication)/,
    action: 'delete' as const,
  },
};

// Fichiers critiques à ne JAMAIS supprimer
const CRITICAL_FILES = [
  'middleware.ts',
  'app/layout.tsx',
  'lib/database/schema.ts',
  'tailwind.config.ts',
  'next.config.mjs',
];

class CleanupManager {
  private report: KnipReport;
  private projectRoot: string;
  
  constructor(reportPath: string) {
    this.projectRoot = process.cwd();
    
    if (!existsSync(reportPath)) {
      console.error(`❌ Rapport Knip introuvable : ${reportPath}`);
      console.log('💡 Exécutez d\'abord : npx knip --reporter json > knip-report.json');
      process.exit(1);
    }
    
    this.report = JSON.parse(readFileSync(reportPath, 'utf-8'));
    console.log('✅ Rapport Knip chargé\n');
  }
  
  async run() {
    console.log('🧹 Nettoyage Intelligent Logistix\n');
    console.log('📊 Statistiques Knip:');
    console.log(`  - Fichiers inutilisés détectés : ${this.report.files.length}`);
    
    const packageIssue = this.report.issues.find(i => i.file === 'package.json');
    if (packageIssue) {
      const totalDeps = (packageIssue.dependencies?.length || 0) + 
                        (packageIssue.devDependencies?.length || 0);
      console.log(`  - Dépendances npm inutilisées : ${totalDeps}`);
    }
    
    console.log('\n⚠️  Mode interactif : vous validerez chaque suppression\n');
    
    // Créer backup Git avant de commencer
    await this.createGitBackup();
    
    // Phase 1 : Scripts de maintenance
    await this.cleanCategory('scripts');
    
    // Phase 2 : Barrel exports
    await this.cleanCategory('barrels');
    
    // Phase 3 : Composants UI
    await this.cleanCategory('uiComponents');
    
    // Phase 4 : Utils redondants
    await this.cleanCategory('utils');
    
    // Phase 5 : Dépendances npm
    await this.cleanDependencies();
    
    // Résumé final
    this.showSummary();
  }
  
  private async createGitBackup() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupBranch = `backup/before-cleanup-${timestamp}`;
      
      console.log(`📦 Création backup Git : ${backupBranch}`);
      execSync(`git branch ${backupBranch}`, { stdio: 'inherit' });
      console.log(`✅ Backup créé sur branche ${backupBranch}\n`);
    } catch (error) {
      console.warn('⚠️  Impossible de créer backup Git (dépôt non initialisé?)\n');
    }
  }
  
  private async cleanCategory(categoryKey: keyof typeof FILE_CATEGORIES) {
    const category = FILE_CATEGORIES[categoryKey];
    const matchingFiles = this.report.files.filter(file => 
      category.pattern.test(file) && !this.isCriticalFile(file)
    );
    
    if (matchingFiles.length === 0) {
      console.log(`✨ ${category.name}: Aucun fichier à nettoyer\n`);
      return;
    }
    
    console.log(`\n${category.name} (Risque: ${category.risk}%)`);
    console.log(`${matchingFiles.length} fichiers détectés :`);
    matchingFiles.slice(0, 5).forEach(file => console.log(`  - ${file}`));
    if (matchingFiles.length > 5) {
      console.log(`  ... et ${matchingFiles.length - 5} autres`);
    }
    
    const answer = await this.prompt(
      `\n${category.action === 'delete' ? 'Supprimer' : 'Archiver'} ces fichiers ? (y/n) `
    );
    
    if (answer.toLowerCase() === 'y') {
      for (const file of matchingFiles) {
        if (category.action === 'delete') {
          this.deleteFile(file);
        } else {
          this.archiveFile(file);
        }
      }
      console.log(`✅ ${matchingFiles.length} fichiers ${category.action === 'delete' ? 'supprimés' : 'archivés'}\n`);
      
      // Commit après chaque phase
      await this.gitCommit(`chore: cleanup ${categoryKey} - removed ${matchingFiles.length} files`);
    } else {
      console.log('⏭️  Phase ignorée\n');
    }
  }
  
  private async cleanDependencies() {
    const packageIssue = this.report.issues.find(i => i.file === 'package.json');
    if (!packageIssue) {
      console.log('✨ Aucune dépendance npm inutilisée détectée\n');
      return;
    }
    
    const deps = packageIssue.dependencies || [];
    const devDeps = packageIssue.devDependencies || [];
    
    if (deps.length === 0 && devDeps.length === 0) return;
    
    console.log('\n📦 Dépendances npm Inutilisées\n');
    
    if (deps.length > 0) {
      console.log('Dependencies:');
      deps.forEach(dep => console.log(`  - ${dep.name}`));
    }
    
    if (devDeps.length > 0) {
      console.log('\nDevDependencies:');
      devDeps.forEach(dep => console.log(`  - ${dep.name}`));
    }
    
    const answer = await this.prompt(
      `\nDésinstaller ces ${deps.length + devDeps.length} packages ? (y/n) `
    );
    
    if (answer.toLowerCase() === 'y') {
      const allDeps = [...deps, ...devDeps].map(d => d.name);
      
      // Uninstall en batch (plus rapide)
      console.log('🔄 Désinstallation en cours...');
      try {
        execSync(`npm uninstall ${allDeps.join(' ')}`, { 
          stdio: 'inherit',
          cwd: this.projectRoot 
        });
        console.log('✅ Dépendances désinstallées\n');
        
        await this.gitCommit(`chore: remove ${allDeps.length} unused npm dependencies`);
      } catch (error) {
        console.error('❌ Erreur lors de la désinstallation');
      }
    } else {
      console.log('⏭️  Désinstallation ignorée\n');
    }
  }
  
  private deleteFile(file: string) {
    const fullPath = resolve(this.projectRoot, file);
    try {
      if (existsSync(fullPath)) {
        rmSync(fullPath, { force: true });
        console.log(`  ✅ Supprimé: ${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Erreur suppression ${file}:`, error);
    }
  }
  
  private archiveFile(file: string) {
    const fullPath = resolve(this.projectRoot, file);
    const archivePath = resolve(this.projectRoot, 'archive', file);
    
    try {
      if (existsSync(fullPath)) {
        // Créer dossier archive si nécessaire
        const archiveDir = dirname(archivePath);
        if (!existsSync(archiveDir)) {
          mkdirSync(archiveDir, { recursive: true });
        }
        
        renameSync(fullPath, archivePath);
        console.log(`  📦 Archivé: ${file} → archive/${file}`);
      }
    } catch (error) {
      console.error(`  ❌ Erreur archivage ${file}:`, error);
    }
  }
  
  private isCriticalFile(file: string): boolean {
    return CRITICAL_FILES.some(critical => file.endsWith(critical));
  }
  
  private async gitCommit(message: string) {
    try {
      execSync('git add -A', { cwd: this.projectRoot });
      execSync(`git commit -m "${message}"`, { 
        cwd: this.projectRoot,
        stdio: 'pipe' 
      });
      console.log(`📝 Git commit: ${message}\n`);
    } catch (error) {
      console.warn('⚠️  Pas de changements à committer\n');
    }
  }
  
  private prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      process.stdout.write(question);
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });
  }
  
  private showSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Nettoyage Terminé !');
    console.log('='.repeat(60));
    console.log('\n✅ Prochaines étapes recommandées:\n');
    console.log('1. Vérifier compilation TypeScript:');
    console.log('   npm run checks\n');
    console.log('2. Lancer les tests:');
    console.log('   npm run test:unit\n');
    console.log('3. Vérifier le build Next.js:');
    console.log('   npm run build\n');
    console.log('4. Re-générer rapport Knip:');
    console.log('   npx knip --reporter json > knip-report-after.json\n');
    console.log('💡 Si problèmes, restaurez le backup:');
    console.log('   git log --oneline -n 10  # Trouver le commit avant cleanup');
    console.log('   git reset --hard <commit-hash>\n');
  }
}

// Point d'entrée
async function main() {
  const reportPath = resolve(process.cwd(), 'knip-report.json');
  const manager = new CleanupManager(reportPath);
  
  // Activer mode interactif stdin
  process.stdin.setRawMode(false);
  process.stdin.resume();
  
  await manager.run();
  
  process.stdin.pause();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
