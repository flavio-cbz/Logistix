#!/usr/bin/env tsx

/**
 * Script de test et nettoyage pour l'intégration Vinted
 * 
 * Ce script :
 * 1. Teste la logique de renouvellement automatique des tokens
 * 2. Teste la recherche de produits avec le token renouvelé
 * 3. Nettoie les fichiers de test obsolètes
 * 4. Vérifie l'intégrité de l'implémentation
 */

import { VintedAuthService } from '../../lib/services/auth/vinted-auth-service';
import { vintedMarketAnalysisService } from '../../lib/services/vinted-market-analysis';
import { vintedCredentialService } from '../../lib/services/auth/vinted-credential-service';
import { db } from '../../lib/services/database/drizzle-client';
import { vintedSessions } from '../../lib/services/database/drizzle-schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../lib/utils/logging/logger';
import fs from 'fs/promises';
import path from 'path';

// Configuration de test
const TEST_USER_ID = '6b8acaf0-9f56-4d90-b3e0-2c226b67059c'; // admin user
const TEST_PRODUCT_NAME = 'Nike Air Max';
const TEST_CATALOG_ID = 1904; // Exemple de catalogue pour les chaussures

// Cookie de test (remplacer par un vrai cookie pour les tests)
const TEST_COOKIE = process.env.VINTED_TEST_COOKIE || '';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

class VintedIntegrationTester {
  private results: TestResult[] = [];

  private addResult(name: string, success: boolean, message: string, details?: any) {
    this.results.push({ name, success, message, details });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${name}: ${message}`);
    if (details && !success) {
      console.log('   Détails:', details);
    }
  }

  /**
   * Test 1: Vérification de la structure de la base de données
   */
  async testDatabaseStructure(): Promise<void> {
    try {
      // Vérifier que la table vintedSessions existe et a la bonne structure
      const sessions = await db.select().from(vintedSessions).limit(1);
      this.addResult(
        'Structure de la base de données',
        true,
        'Table vintedSessions accessible'
      );
    } catch (error: any) {
      this.addResult(
        'Structure de la base de données',
        false,
        'Erreur d\'accès à la table vintedSessions',
        error.message
      );
    }
  }

  /**
   * Test 2: Chiffrement/déchiffrement des credentials
   */
  async testCredentialEncryption(): Promise<void> {
    try {
      const testData = 'test_cookie_data=value123';
      const encrypted = await vintedCredentialService.encrypt(testData);
      const decrypted = await vintedCredentialService.decrypt(encrypted);
      
      const success = decrypted === testData;
      this.addResult(
        'Chiffrement des credentials',
        success,
        success ? 'Chiffrement/déchiffrement fonctionnel' : 'Erreur de chiffrement'
      );
    } catch (error: any) {
      this.addResult(
        'Chiffrement des credentials',
        false,
        'Erreur lors du test de chiffrement',
        error.message
      );
    }
  }

  /**
   * Test 3: Extraction des tokens depuis le cookie
   */
  async testTokenExtraction(): Promise<void> {
    if (!TEST_COOKIE) {
      this.addResult(
        'Extraction des tokens',
        false,
        'Aucun cookie de test fourni (VINTED_TEST_COOKIE)'
      );
      return;
    }

    try {
      const accessToken = VintedAuthService.extractAccessTokenFromCookie(TEST_COOKIE);
      const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(TEST_COOKIE);
      
      const hasAccessToken = !!accessToken;
      const hasRefreshToken = !!refreshToken;
      
      this.addResult(
        'Extraction des tokens',
        hasAccessToken && hasRefreshToken,
        `Access token: ${hasAccessToken ? 'trouvé' : 'manquant'}, Refresh token: ${hasRefreshToken ? 'trouvé' : 'manquant'}`,
        {
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0
        }
      );
    } catch (error: any) {
      this.addResult(
        'Extraction des tokens',
        false,
        'Erreur lors de l\'extraction des tokens',
        error.message
      );
    }
  }

  /**
   * Test 4: Validation du token d'accès
   */
  async testTokenValidation(): Promise<void> {
    if (!TEST_COOKIE) {
      this.addResult(
        'Validation du token',
        false,
        'Aucun cookie de test fourni'
      );
      return;
    }

    try {
      const authService = new VintedAuthService(TEST_COOKIE);
      const validationResult = await authService.validateAccessToken();
      
      this.addResult(
        'Validation du token',
        validationResult.valid,
        validationResult.valid ? 'Token valide' : 'Token invalide ou expiré',
        {
          status: validationResult.status,
          error: validationResult.error
        }
      );
    } catch (error: any) {
      this.addResult(
        'Validation du token',
        false,
        'Erreur lors de la validation',
        error.message
      );
    }
  }

  /**
   * Test 5: Renouvellement du token
   */
  async testTokenRefresh(): Promise<void> {
    if (!TEST_COOKIE) {
      this.addResult(
        'Renouvellement du token',
        false,
        'Aucun cookie de test fourni'
      );
      return;
    }

    try {
      const authService = new VintedAuthService(TEST_COOKIE);
      const newTokens = await authService.refreshAccessToken();
      
      const success = !!newTokens?.accessToken && !!newTokens?.refreshToken;
      this.addResult(
        'Renouvellement du token',
        success,
        success ? 'Tokens renouvelés avec succès' : 'Échec du renouvellement',
        success ? {
          newAccessTokenLength: newTokens.accessToken.length,
          newRefreshTokenLength: newTokens.refreshToken.length
        } : null
      );
    } catch (error: any) {
      this.addResult(
        'Renouvellement du token',
        false,
        'Erreur lors du renouvellement',
        error.message
      );
    }
  }

  /**
   * Test 6: Stockage et récupération du cookie en base
   */
  async testCookieStorage(): Promise<void> {
    if (!TEST_COOKIE) {
      this.addResult(
        'Stockage du cookie',
        false,
        'Aucun cookie de test fourni'
      );
      return;
    }

    try {
      // Chiffrer et stocker le cookie
      const encrypted = await vintedCredentialService.encrypt(TEST_COOKIE);
      const now = new Date().toISOString();
      
      await db
        .insert(vintedSessions)
        .values({
          id: crypto.randomUUID(),
          userId: TEST_USER_ID,
          session_cookie: encrypted,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: vintedSessions.userId,
          set: {
            session_cookie: encrypted,
            status: 'active',
            updatedAt: now,
          },
        });

      // Récupérer et déchiffrer
      const session = await db.select().from(vintedSessions)
        .where(eq(vintedSessions.userId, TEST_USER_ID))
        .limit(1);

      if (session[0]?.session_cookie) {
        const decrypted = await vintedCredentialService.decrypt(session[0].session_cookie);
        const success = decrypted === TEST_COOKIE;
        
        this.addResult(
          'Stockage du cookie',
          success,
          success ? 'Cookie stocké et récupéré correctement' : 'Erreur de cohérence des données'
        );
      } else {
        this.addResult(
          'Stockage du cookie',
          false,
          'Cookie non trouvé après insertion'
        );
      }
    } catch (error: any) {
      this.addResult(
        'Stockage du cookie',
        false,
        'Erreur lors du stockage/récupération',
        error.message
      );
    }
  }

  /**
   * Test 7: API d'authentification Vinted
   */
  async testVintedAuthAPI(): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/api/v1/vinted/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const success = response.ok && (data.authenticated || data.tokens?.accessToken);
      
      this.addResult(
        'API d\'authentification Vinted',
        success,
        success ? 'API fonctionnelle' : 'API non fonctionnelle',
        {
          status: response.status,
          authenticated: data.authenticated,
          hasTokens: !!data.tokens
        }
      );
    } catch (error: any) {
      this.addResult(
        'API d\'authentification Vinted',
        false,
        'Erreur lors de l\'appel API',
        error.message
      );
    }
  }

  /**
   * Test 8: Recherche de produit avec token renouvelé
   */
  async testProductSearch(): Promise<void> {
    if (!TEST_COOKIE) {
      this.addResult(
        'Recherche de produit',
        false,
        'Aucun cookie de test fourni'
      );
      return;
    }

    try {
      // Utiliser le service d'analyse de marché
      const result = await vintedMarketAnalysisService.analyzeProduct({
        productName: TEST_PRODUCT_NAME,
        catalogId: TEST_CATALOG_ID,
        token: TEST_COOKIE
      });

      const success = result.salesVolume >= 0 && result.avgPrice >= 0;
      this.addResult(
        'Recherche de produit',
        success,
        success ? `Analyse réussie: ${result.salesVolume} ventes, prix moyen ${result.avgPrice}€` : 'Analyse échouée',
        {
          salesVolume: result.salesVolume,
          avgPrice: result.avgPrice,
          brandInfo: result.brandInfo
        }
      );
    } catch (error: any) {
      this.addResult(
        'Recherche de produit',
        false,
        'Erreur lors de la recherche',
        error.message
      );
    }
  }

  /**
   * Nettoyage des fichiers de test obsolètes
   */
  async cleanupTestFiles(): Promise<void> {
    const testFilesToRemove = [
      'scripts/test-vinted-cookie-cloudscraper.js',
      'scripts/test-vinted-login.ts',
      'scripts/test-vinted-cookie.js',
      'scripts/test-manual-cookie.ts',
      'scripts/test-cookie-validation.ts',
      'scripts/test-vinted-auth-api.ts',
      'scripts/test-db-insert.ts',
      'scripts/test-ip-block.js',
      // Ajouter d'autres fichiers de test obsolètes
    ];

    let removedCount = 0;
    let errorCount = 0;

    for (const filePath of testFilesToRemove) {
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        removedCount++;
        console.log(`🗑️  Supprimé: ${filePath}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          errorCount++;
          console.log(`⚠️  Erreur lors de la suppression de ${filePath}: ${error.message}`);
        }
      }
    }

    this.addResult(
      'Nettoyage des fichiers de test',
      errorCount === 0,
      `${removedCount} fichiers supprimés, ${errorCount} erreurs`
    );
  }

  /**
   * Nettoyage des logs anciens
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const logsDir = 'logs';
      const files = await fs.readdir(logsDir);
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      let removedCount = 0;

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime.getTime() < oneWeekAgo) {
            await fs.unlink(filePath);
            removedCount++;
            console.log(`🗑️  Log supprimé: ${file}`);
          }
        }
      }

      this.addResult(
        'Nettoyage des logs anciens',
        true,
        `${removedCount} fichiers de log anciens supprimés`
      );
    } catch (error: any) {
      this.addResult(
        'Nettoyage des logs anciens',
        false,
        'Erreur lors du nettoyage des logs',
        error.message
      );
    }
  }

  /**
   * Exécute tous les tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Début des tests d\'intégration Vinted\n');

    await this.testDatabaseStructure();
    await this.testCredentialEncryption();
    await this.testTokenExtraction();
    await this.testTokenValidation();
    await this.testTokenRefresh();
    await this.testCookieStorage();
    await this.testVintedAuthAPI();
    await this.testProductSearch();

    console.log('\n🧹 Nettoyage du projet\n');
    
    await this.cleanupTestFiles();
    await this.cleanupOldLogs();

    this.printSummary();
  }

  /**
   * Affiche le résumé des tests
   */
  private printSummary(): void {
    console.log('\n📊 Résumé des tests\n');
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`Total: ${total} tests`);
    console.log(`✅ Réussis: ${passed}`);
    console.log(`❌ Échoués: ${failed}`);
    console.log(`📈 Taux de réussite: ${Math.round((passed / total) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Tests échoués:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
    }

    console.log('\n🎉 Tests terminés!');
    
    if (failed === 0) {
      console.log('✨ Tous les tests sont passés! L\'intégration Vinted fonctionne correctement.');
    } else {
      console.log('⚠️  Certains tests ont échoué. Vérifiez la configuration et les logs.');
    }
  }
}

// Exécution du script
async function main() {
  const tester = new VintedIntegrationTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Erreur fatale lors des tests:', error);
    process.exit(1);
  }
}

// Vérifier si le script est exécuté directement
if (require.main === module) {
  main();
}

export { VintedIntegrationTester };