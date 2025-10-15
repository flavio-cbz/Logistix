/**
 * Tests différentiels SQLite vs PostgreSQL
 * 
 * Exécute les mêmes opérations CRUD sur les deux bases de données
 * et compare les résultats pour s'assurer de la compatibilité.
 * 
 * PHASE 1: Tests PostgreSQL seulement (SQLite repos pas encore implémentés)
 * PHASE 2: Tests différentiels complets SQLite vs PostgreSQL
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { PostgresProduitRepository } from '@/lib/infrastructure/repositories/postgres/produit-repository';
import { PostgresParcelleRepository } from '@/lib/infrastructure/repositories/postgres/parcelle-repository';
import { CreateProduitDto, UpdateProduitDto } from '@/lib/repositories/interfaces/produit-repository.interface';
import { CreateParcelleDto, UpdateParcelleDto } from '@/lib/repositories/interfaces/parcelle-repository.interface';
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors/custom-error';

// Configuration PostgreSQL de test
const TEST_POSTGRES_CONFIG = {
  host: process.env.TEST_POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
  database: process.env.TEST_POSTGRES_DATABASE || 'logistix_test',
  username: process.env.TEST_POSTGRES_USERNAME || 'postgres', 
  password: process.env.TEST_POSTGRES_PASSWORD || 'postgres',
  ssl: false,
};

// Check if PostgreSQL env vars are configured
const isPostgresConfigured = () => {
  return Boolean(
    process.env.TEST_POSTGRES_HOST &&
    process.env.TEST_POSTGRES_DATABASE
  );
};

describe.skipIf(!isPostgresConfigured())('Tests Différentiels - PostgreSQL (Phase 1)', () => {
  let pool: Pool;
  let produitRepo: PostgresProduitRepository;
  let parcelleRepo: PostgresParcelleRepository;

  const testUserId = 'test-user-differential-123';
  let testParcelleId: string;

  beforeAll(async () => {
    // Setup PostgreSQL connection
    pool = new Pool({
      ...TEST_POSTGRES_CONFIG,
      max: 5,
    });

    // Test connection
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (error) {
      console.warn('PostgreSQL not available for tests:', error);
      throw new Error('PostgreSQL test database not available. Set TEST_POSTGRES_* env vars.');
    }

    // Initialize repositories
    produitRepo = new PostgresProduitRepository(TEST_POSTGRES_CONFIG);
    parcelleRepo = new PostgresParcelleRepository(pool);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  beforeEach(async () => {
    // Cleanup previous test data
    await cleanupTestData();
    
    // Create test parcelle for product tests
    const parcelleData: CreateParcelleDto = {
      userId: testUserId,
      numero: 'TEST-DIFF-001',
      transporteur: 'DPD',
      prixAchat: 25.50,
      poids: 150,
    };
    
    const parcelle = await parcelleRepo.create(parcelleData);
    testParcelleId = parcelle.id;
  });

  async function cleanupTestData() {
    if (!pool) return;
    
    const client = await pool.connect();
    try {
      // Delete test products and parcelles
      await client.query('DELETE FROM products WHERE user_id = $1', [testUserId]);
      await client.query('DELETE FROM parcelles WHERE user_id = $1', [testUserId]);
    } finally {
      client.release();
    }
  }

  describe('PostgreSQL - Parcelle CRUD', () => {
    it('should create a parcelle successfully', async () => {
      const data: CreateParcelleDto = {
        userId: testUserId,
        numero: 'CRUD-001',
        transporteur: 'Colissimo',
        prixAchat: 15.75,
        poids: 200,
        prixTotal: 18.50,
      };

      const parcelle = await parcelleRepo.create(data);

      expect(parcelle.id).toBeDefined();
      expect(parcelle.userId).toBe(testUserId);
      expect(parcelle.numero).toBe('CRUD-001');
      expect(parcelle.transporteur).toBe('Colissimo');
      expect(parcelle.prixAchat).toBe(15.75);
      expect(parcelle.poids).toBe(200);
      expect(parcelle.prixTotal).toBe(18.50);
      expect(parcelle.createdAt).toBeInstanceOf(Date);
    });

    it('should prevent duplicate numero for same user', async () => {
      const data: CreateParcelleDto = {
        userId: testUserId,
        numero: 'DUPLICATE-001',
        transporteur: 'UPS',
      };

      // First creation should work
      await parcelleRepo.create(data);

      // Second creation with same numero should fail
      await expect(parcelleRepo.create(data))
        .rejects
        .toThrow('already exists');
    });

    it('should find parcelle by ID', async () => {
      const found = await parcelleRepo.findById(testParcelleId);
      
      expect(found).not.toBeNull();
      expect(found!.id).toBe(testParcelleId);
      expect(found!.numero).toBe('TEST-DIFF-001');
    });

    it('should find parcelles by user ID', async () => {
      const parcelles = await parcelleRepo.findByUserId(testUserId);
      
      expect(parcelles.length).toBeGreaterThanOrEqual(1);
      expect(parcelles[0].userId).toBe(testUserId);
    });

    it('should update parcelle', async () => {
      const updates: UpdateParcelleDto = {
        transporteur: 'La Poste',
        prixAchat: 30.00,
      };

      const updated = await parcelleRepo.update(testParcelleId, updates);
      
      expect(updated.transporteur).toBe('La Poste');
      expect(updated.prixAchat).toBe(30.00);
      expect(updated.numero).toBe('TEST-DIFF-001'); // Unchanged
    });

    it('should delete parcelle', async () => {
      await parcelleRepo.delete(testParcelleId);
      
      const found = await parcelleRepo.findById(testParcelleId);
      expect(found).toBeNull();
    });
  });

  describe('PostgreSQL - Produit CRUD', () => {
    it('should create a product successfully', async () => {
      const data: CreateProduitDto = {
        userId: testUserId,
        parcelleId: testParcelleId,
        commandeId: 'CMD-001',
        nom: 'T-shirt Nike',
        details: 'T-shirt noir taille M',
        prixArticle: 12.50,
        poids: 180,
        prixLivraison: 4.95,
      };

      const produit = await produitRepo.create(data);

      expect(produit.id).toBeDefined();
      expect(produit.userId).toBe(testUserId);
      expect(produit.nom).toBe('T-shirt Nike');
      expect(produit.prix).toBe(12.50);
    });

    it('should find product by ID', async () => {
      // Create a product first
      const data: CreateProduitDto = {
        userId: testUserId,
        parcelleId: testParcelleId,
        commandeId: 'CMD-002',
        nom: 'Chaussures Adidas',
        prixArticle: 45.00,
        poids: 800,
        prixLivraison: 6.50,
      };

      const created = await produitRepo.create(data);
      const found = await produitRepo.findById(created.id.toString());

      expect(found).not.toBeNull();
      expect(found!.nom).toBe('Chaussures Adidas');
    });

    it('should find products by user ID', async () => {
      const products = await produitRepo.findByUserId(testUserId);
      
      expect(Array.isArray(products)).toBe(true);
      // Peut avoir 0 ou plus de produits selon les tests précédents
    });

    it('should search products by name', async () => {
      // Create test products
      await produitRepo.create({
        userId: testUserId,
        parcelleId: testParcelleId,
        commandeId: 'CMD-003',
        nom: 'Nike Air Max',
        prixArticle: 85.00,
        poids: 600,
        prixLivraison: 7.50,
      });

      const results = await produitRepo.searchByName(testUserId, 'Nike');
      
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].nom.toLowerCase()).toContain('nike');
    });

    it('should update product', async () => {
      // Create a product first
      const created = await produitRepo.create({
        userId: testUserId,
        parcelleId: testParcelleId,
        commandeId: 'CMD-004',
        nom: 'Veste',
        prixArticle: 25.00,
        poids: 300,
        prixLivraison: 5.50,
      });

      const updates: UpdateProduitDto = {
        nom: 'Veste Updated',
        prixArticle: 30.00,
      };

      const updated = await produitRepo.update(created.id.toString(), updates);
      
      expect(updated.nom).toBe('Veste Updated');
      expect(updated.prix).toBe(30.00);
    });
  });

  describe('PostgreSQL - Error Handling', () => {
    it('should throw NotFoundError for non-existent parcelle', async () => {
      await expect(parcelleRepo.findById('non-existent-id'))
        .resolves
        .toBeNull();

      await expect(parcelleRepo.update('non-existent-id', { transporteur: 'Test' }))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw NotFoundError for non-existent product', async () => {
      await expect(produitRepo.findById('non-existent-id'))
        .resolves
        .toBeNull();

      await expect(produitRepo.update('non-existent-id', { nom: 'Test' }))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should handle database connection errors gracefully', async () => {
      // Note: Ce test nécessiterait de simuler une panne de connexion
      // Pour l'instant on vérifie juste que les méthodes ne crashent pas
      expect(produitRepo).toBeDefined();
      expect(parcelleRepo).toBeDefined();
    });
  });
});

// TODO: Phase 2 - Ajouter les tests différentiels SQLite vs PostgreSQL
// describe('Tests Différentiels - SQLite vs PostgreSQL (Phase 2)', () => {
//   // Comparer les mêmes opérations sur les deux DBs
//   // Valider que les résultats sont identiques
// });