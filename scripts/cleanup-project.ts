#!/usr/bin/env tsx

/**
 * Script de nettoyage du projet LogistiX
 * Supprime les fichiers de test obsolètes et organise le projet
 */

import fs from 'fs/promises';
import path from 'path';

interface CleanupResult {
  removed: string[];
  errors: string[];
  kept: string[];
}

class ProjectCleaner {
  private result: CleanupResult = {
    removed: [],
    errors: [],
    kept: []
  };

  /**
   * Nettoie les logs anciens (plus de 7 jours)
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const logsDir = 'logs';
      const files = await fs.readdir(logsDir);
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneWeekAgo) {
            await fs.unlink(filePath);
            this.result.removed.push(filePath);
          } else {
            this.result.kept.push(filePath);
          }
        }
      }
    } catch (error: any) {
      this.result.errors.push(`Erreur lors du nettoyage des logs: ${error.message}`);
    }
  }

  /**
   * Nettoie les fichiers temporaires et de cache
   */
  async cleanupTempFiles(): Promise<void> {
    const tempPatterns = [
      '.next',
      'node_modules/.cache',
      '.turbo',
      'dist',
      '*.tmp',
      '*.temp'
    ];

    for (const pattern of tempPatterns) {
      try {
        // Vérifier si le fichier/dossier existe
        try {
          await fs.access(pattern);
          // S'il existe, le supprimer
          const stats = await fs.stat(pattern);
          if (stats.isDirectory()) {
            await fs.rm(pattern, { recursive: true, force: true });
          } else {
            await fs.unlink(pattern);
          }
          this.result.removed.push(pattern);
        } catch (accessError) {
          // Le fichier n'existe pas, c'est normal
        }
      } catch (error: any) {
        this.result.errors.push(`Erreur lors de la suppression de ${pattern}: ${error.message}`);
      }
    }
  }

  /**
   * Nettoie les fichiers de test spécifiques restants
   */
  async cleanupRemainingTestFiles(): Promise<void> {
    const testFilesToRemove = [
      'scripts/manual-cookie-extraction.ts',
      // Ajouter d'autres fichiers spécifiques si nécessaire
    ];

    for (const filePath of testFilesToRemove) {
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        this.result.removed.push(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          this.result.errors.push(`Erreur lors de la suppression de ${filePath}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Vérifie l'intégrité des fichiers importants
   */
  async verifyImportantFiles(): Promise<void> {
    const importantFiles = [
      'package.json',
      'next.config.mjs',
      'tailwind.config.ts',
      'tsconfig.json',
      '.env.local',
      'app/(dashboard)/analyse-marche/page.tsx',
      'lib/services/vinted-market-analysis.ts',
      'lib/services/auth/vinted-auth-service.ts',
      'scripts/tests/test-vinted-services-direct.ts'
    ];

    for (const filePath of importantFiles) {
      try {
        await fs.access(filePath);
        this.result.kept.push(filePath);
      } catch (error) {
        this.result.errors.push(`Fichier important manquant: ${filePath}`);
      }
    }
  }

  /**
   * Exécute le nettoyage complet
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Début du nettoyage du projet LogistiX\n');

    await this.cleanupOldLogs();
    await this.cleanupTempFiles();
    await this.cleanupRemainingTestFiles();
    await this.verifyImportantFiles();

    this.printSummary();
  }

  /**
   * Affiche le résumé du nettoyage
   */
  private printSummary(): void {
    console.log('\n📊 Résumé du nettoyage\n');
    
    console.log(`🗑️  Fichiers supprimés: ${this.result.removed.length}`);
    this.result.removed.forEach(file => console.log(`   - ${file}`));
    
    console.log(`\n✅ Fichiers conservés: ${this.result.kept.length}`);
    
    if (this.result.errors.length > 0) {
      console.log(`\n❌ Erreurs: ${this.result.errors.length}`);
      this.result.errors.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n🎉 Nettoyage terminé!');
    
    if (this.result.errors.length === 0) {
      console.log('✨ Projet nettoyé avec succès!');
    } else {
      console.log('⚠️  Nettoyage terminé avec quelques erreurs.');
    }

    // Recommandations
    console.log('\n💡 Recommandations:');
    console.log('   - Redémarrez le serveur de développement');
    console.log('   - Vérifiez que les tests fonctionnent: tsx scripts/tests/test-vinted-services-direct.ts');
    console.log('   - Mettez à jour votre cookie Vinted si nécessaire');
  }
}

// Exécution du script
async function main() {
  const cleaner = new ProjectCleaner();
  
  try {
    await cleaner.cleanup();
  } catch (error) {
    console.error('❌ Erreur fatale lors du nettoyage:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ProjectCleaner };