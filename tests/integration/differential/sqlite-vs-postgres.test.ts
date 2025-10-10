/**
 * Tests Différentiels - SQLite vs PostgreSQL
 * 
 * Valide que les implémentations SQLite et PostgreSQL des repositories
 * produisent des résultats identiques pour les mêmes opérations.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseFactory, DatabaseType } from '@/lib/config/database-factory';
import { IProduitRepository } from '@/lib/repositories/interfaces/produit-repository.interface';
import { IParcelleRepository } from '@/lib/repositories/interfaces/parcelle-repository.interface';

describe('Differential Testing: SQLite vs PostgreSQL', () => {
  let sqliteFactory: DatabaseFactory;
  let postgresFactory: DatabaseFactory;
  
  let sqliteProduitRepo: IProduitRepository;
  let postgresProduitRepo: IProduitRepository;
  
  let sqliteParcelleRepo: IParcelleRepository;
  let postgresParcelleRepo: IParcelleRepository;

  const testUserId = 'test-user-diff-001';
  const testParcelles = [
    {
      userId: testUserId,
      numero: 'DIFF-001',
      transporteur: 'DHL',
      prixAchat: 100.50,
      poids: 500,
    },
    {
      userId: testUserId,
      numero: 'DIFF-002', 
      transporteur: 'UPS',
      prixAchat: 75.25,
      poids: 300,
    },
  ];

  const testProduits = [
    {
      userId: testUserId,
      commandeId: 'CMD-DIFF-001',
      nom: 'Test Product A',
      details: 'Description produit A',
      prixArticle: 50.00,
      poids: 150,
      prixLivraison: 5.99,
    },
    {
      userId: testUserId,
      commandeId: 'CMD-DIFF-002',
      nom: 'Test Product B',
      prixArticle: 25.50,
      poids: 80,
      prixLivraison: 3.50,
      vendu: true,
      prixVente: 35.00,
    },
  ];

  beforeEach(async () => {
    // Initialiser SQLite
    sqliteFactory = DatabaseFactory.getInstance({
      type: DatabaseType.SQLITE,
      sqlite: { path: ':memory:' }, // Base en mémoire pour les tests
    });
    
    const sqliteRepos = await sqliteFactory.getRepositories();
    sqliteProduitRepo = sqliteRepos.produitRepository;
    sqliteParcelleRepo = sqliteRepos.parcelleRepository;

    // PostgreSQL seulement si disponible
    if (process.env.POSTGRES_HOST) {
      postgresFactory = DatabaseFactory.getInstance({
        type: DatabaseType.POSTGRES,
        postgres: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_TEST_DATABASE || 'logistix_test',
          username: process.env.POSTGRES_USERNAME || 'postgres',
          password: process.env.POSTGRES_PASSWORD || '',
          ssl: false,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          max: 5,
        },
      });
      
      const postgresRepos = await postgresFactory.getRepositories();
      postgresProduitRepo = postgresRepos.produitRepository;
      postgresParcelleRepo = postgresRepos.parcelleRepository;
    }
  });

  afterEach(async () => {
    // Cleanup
    try {
      // Nettoyer les données de test SQLite
      // Note: en mémoire, la base est automatiquement supprimée
      
      // Nettoyer PostgreSQL si disponible
      if (postgresFactory) {
        // Supprimer les données de test
        await postgresFactory.close();
      }
      
      await sqliteFactory.close();
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });

  describe('Parcelles Repository Differential', () => {
    test.skipIf(!process.env.POSTGRES_HOST)('CREATE - SQLite vs PostgreSQL produce identical results', async () => {
      // Créer dans SQLite
      const sqliteParcelle1 = await sqliteParcelleRepo.create(testParcelles[0]);
      const sqliteParcelle2 = await sqliteParcelleRepo.create(testParcelles[1]);

      // Créer dans PostgreSQL
      const postgresParcelle1 = await postgresParcelleRepo.create(testParcelles[0]);
      const postgresParcelle2 = await postgresParcelleRepo.create(testParcelles[1]);

      // Comparer les résultats (ignorer les IDs générés)
      expect(sqliteParcelle1.getNumero()).toBe(postgresParcelle1.getNumero());
      expect(sqliteParcelle1.getTransporteur()).toBe(postgresParcelle1.getTransporteur());
      expect(sqliteParcelle1.getPrixAchat()).toBe(postgresParcelle1.getPrixAchat());
      
      expect(sqliteParcelle2.getNumero()).toBe(postgresParcelle2.getNumero());
      expect(sqliteParcelle2.getTransporteur()).toBe(postgresParcelle2.getTransporteur());
    });

    test.skipIf(!process.env.POSTGRES_HOST)('FIND_BY_USER_ID - Both return same count and data', async () => {
      // Créer des données dans les deux DBs
      await sqliteParcelleRepo.create(testParcelles[0]);
      await sqliteParcelleRepo.create(testParcelles[1]);
      
      await postgresParcelleRepo.create(testParcelles[0]);
      await postgresParcelleRepo.create(testParcelles[1]);

      // Récupérer par userId
      const sqliteParcelles = await sqliteParcelleRepo.findByUserId(testUserId);
      const postgresParcelles = await postgresParcelleRepo.findByUserId(testUserId);

      // Comparer
      expect(sqliteParcelles.length).toBe(postgresParcelles.length);
      expect(sqliteParcelles.length).toBe(2);

      // Trier par numéro pour comparaison stable
      const sqliteSorted = sqliteParcelles.sort((a, b) => a.getNumero().localeCompare(b.getNumero()));
      const postgresSorted = postgresParcelles.sort((a, b) => a.getNumero().localeCompare(b.getNumero()));

      for (let i = 0; i < sqliteSorted.length; i++) {
        expect(sqliteSorted[i].getNumero()).toBe(postgresSorted[i].getNumero());
        expect(sqliteSorted[i].getTransporteur()).toBe(postgresSorted[i].getTransporteur());
      }
    });

    test.skipIf(!process.env.POSTGRES_HOST)('COUNT - Both return same count', async () => {
      // Compter (vide initialement)
      let sqliteCount = await sqliteParcelleRepo.countByUserId(testUserId);
      let postgresCount = await postgresParcelleRepo.countByUserId(testUserId);
      expect(sqliteCount).toBe(postgresCount);
      expect(sqliteCount).toBe(0);

      // Créer des parcelles
      await sqliteParcelleRepo.create(testParcelles[0]);
      await postgresParcelleRepo.create(testParcelles[0]);

      // Recompter
      sqliteCount = await sqliteParcelleRepo.countByUserId(testUserId);
      postgresCount = await postgresParcelleRepo.countByUserId(testUserId);
      expect(sqliteCount).toBe(postgresCount);
      expect(sqliteCount).toBe(1);
    });

    test('SQLite CREATE works independently', async () => {
      const parcelle = await sqliteParcelleRepo.create(testParcelles[0]);
      
      expect(parcelle).toBeDefined();
      expect(parcelle.getNumero()).toBe(testParcelles[0].numero);
      expect(parcelle.getTransporteur()).toBe(testParcelles[0].transporteur);
      expect(parcelle.getUserId()).toBe(testUserId);
    });
  });

  describe('Produits Repository Differential', () => {
    test.skipIf(!process.env.POSTGRES_HOST)('CREATE - SQLite vs PostgreSQL produce identical results', async () => {
      // Créer dans SQLite
      const sqliteProduit1 = await sqliteProduitRepo.create(testProduits[0]);
      const sqliteProduit2 = await sqliteProduitRepo.create(testProduits[1]);

      // Créer dans PostgreSQL
      const postgresProduit1 = await postgresProduitRepo.create(testProduits[0]);
      const postgresProduit2 = await postgresProduitRepo.create(testProduits[1]);

      // Comparer les résultats
      expect(sqliteProduit1.getNom()).toBe(postgresProduit1.getNom());
      expect(sqliteProduit1.getPrixArticle()).toBe(postgresProduit1.getPrixArticle());
      expect(sqliteProduit1.getPoids()).toBe(postgresProduit1.getPoids());
      
      expect(sqliteProduit2.getNom()).toBe(postgresProduit2.getNom());
      expect(sqliteProduit2.isVendu()).toBe(postgresProduit2.isVendu());
      expect(sqliteProduit2.getPrixVente()).toBe(postgresProduit2.getPrixVente());
    });

    test.skipIf(!process.env.POSTGRES_HOST)('SEARCH_BY_NAME - Both return same results', async () => {
      // Créer des produits dans les deux DBs
      await sqliteProduitRepo.create(testProduits[0]);
      await sqliteProduitRepo.create(testProduits[1]);
      
      await postgresProduitRepo.create(testProduits[0]);
      await postgresProduitRepo.create(testProduits[1]);

      // Rechercher par nom
      const sqliteResults = await sqliteProduitRepo.searchByName(testUserId, 'Test');
      const postgresResults = await postgresProduitRepo.searchByName(testUserId, 'Test');

      // Comparer
      expect(sqliteResults.length).toBe(postgresResults.length);
      expect(sqliteResults.length).toBe(2);

      // Trier par nom pour comparaison stable
      const sqliteSorted = sqliteResults.sort((a, b) => a.getNom().localeCompare(b.getNom()));
      const postgresSorted = postgresResults.sort((a, b) => a.getNom().localeCompare(b.getNom()));

      for (let i = 0; i < sqliteSorted.length; i++) {
        expect(sqliteSorted[i].getNom()).toBe(postgresSorted[i].getNom());
        expect(sqliteSorted[i].getPrixArticle()).toBe(postgresSorted[i].getPrixArticle());
      }
    });

    test('SQLite CREATE and SEARCH work independently', async () => {
      const produit = await sqliteProduitRepo.create(testProduits[0]);
      
      expect(produit).toBeDefined();
      expect(produit.getNom()).toBe(testProduits[0].nom);
      expect(produit.getUserId()).toBe(testUserId);
      
      // Test de recherche
      const searchResults = await sqliteProduitRepo.searchByName(testUserId, 'Test');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].getNom()).toBe(testProduits[0].nom);
    });
  });

  describe('Error Handling Consistency', () => {
    test.skipIf(!process.env.POSTGRES_HOST)('NOT_FOUND errors are consistent', async () => {
      const nonExistentId = 'non-existent-id';

      // Test SQLite
      const sqliteProduit = await sqliteProduitRepo.findById(nonExistentId);
      const sqliteParcelle = await sqliteParcelleRepo.findById(nonExistentId);

      // Test PostgreSQL
      const postgresProduit = await postgresProduitRepo.findById(nonExistentId);
      const postgresParcelle = await postgresParcelleRepo.findById(nonExistentId);

      // Les deux doivent retourner null pour un ID inexistant
      expect(sqliteProduit).toBe(postgresProduit); // null
      expect(sqliteParcelle).toBe(postgresParcelle); // null
    });

    test('SQLite handles non-existent IDs correctly', async () => {
      const nonExistentId = 'non-existent-id';
      
      const produit = await sqliteProduitRepo.findById(nonExistentId);
      const parcelle = await sqliteParcelleRepo.findById(nonExistentId);
      
      expect(produit).toBeNull();
      expect(parcelle).toBeNull();
    });
  });
});

/**
 * Helper pour lancer les tests différentiels avec configuration
 */
export function runDifferentialTests(config: {
  enablePostgresTests: boolean;
  testDatabaseUrl?: string;
}) {
  if (!config.enablePostgresTests) {
    console.log('🔄 Running SQLite-only tests (PostgreSQL tests skipped)');
  } else {
    console.log('🔄 Running full differential tests (SQLite + PostgreSQL)');
  }
}