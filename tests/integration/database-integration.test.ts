/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupInMemoryDatabase, cleanupInMemoryDatabase } from '../setup/database-mocks';
import { createTestUser, createTestParcelle, createTestProduct } from '../setup/test-data-factory';

describe('Database Integration Tests', () => {
  let db: any;
  let sqlite: any;

  beforeEach(async () => {
    const dbSetup = await setupInMemoryDatabase();
    db = dbSetup.db;
    sqlite = dbSetup.sqlite;
  });

  afterEach(() => {
    if (sqlite) {
      cleanupInMemoryDatabase(sqlite);
    }
  });

  describe('User operations', () => {
    it('should create and retrieve user', async () => {
      // Arrange
      const testUser = createTestUser();

      // Act - Insert user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);

      // Act - Retrieve user
      const retrievedUser = await db.get(`
        SELECT * FROM users WHERE id = ?
      `, [testUser.id]);

      // Assert
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser.id).toBe(testUser.id);
      expect(retrievedUser.username).toBe(testUser.username);
      expect(retrievedUser.email).toBe(testUser.email);
    });

    it('should enforce unique username constraint', async () => {
      // Arrange
      const user1 = createTestUser({ username: 'duplicate' });
      const user2 = createTestUser({ username: 'duplicate' });

      // Act - Insert first user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user1.id,
        user1.username,
        user1.email,
        user1.passwordHash,
        user1.encryptionSecret,
        user1.createdAt,
        user1.updatedAt
      ]);

      // Act & Assert - Try to insert duplicate username
      await expect(async () => {
        await db.run(`
          INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          user2.id,
          user2.username,
          user2.email,
          user2.passwordHash,
          user2.encryptionSecret,
          user2.createdAt,
          user2.updatedAt
        ]);
      }).rejects.toThrow();
    });

    it('should update user successfully', async () => {
      // Arrange
      const testUser = createTestUser();
      
      // Insert user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);

      // Act - Update user
      const newEmail = 'updated@example.com';
      const newUpdatedAt = new Date().toISOString();
      
      await db.run(`
        UPDATE users SET email = ?, updatedAt = ? WHERE id = ?
      `, [newEmail, newUpdatedAt, testUser.id]);

      // Retrieve updated user
      const updatedUser = await db.get(`
        SELECT * FROM users WHERE id = ?
      `, [testUser.id]);

      // Assert
      expect(updatedUser.email).toBe(newEmail);
      expect(updatedUser.updatedAt).toBe(newUpdatedAt);
      expect(updatedUser.username).toBe(testUser.username); // Should remain unchanged
    });

    it('should delete user successfully', async () => {
      // Arrange
      const testUser = createTestUser();
      
      // Insert user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);

      // Act - Delete user
      await db.run(`DELETE FROM users WHERE id = ?`, [testUser.id]);

      // Retrieve user
      const deletedUser = await db.get(`
        SELECT * FROM users WHERE id = ?
      `, [testUser.id]);

      // Assert
      expect(deletedUser).toBeUndefined();
    });
  });

  describe('Parcelle operations', () => {
    let testUser: ReturnType<typeof createTestUser>;

    beforeEach(async () => {
      testUser = createTestUser();
      
      // Insert test user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);
    });

    it('should create and retrieve parcelle', async () => {
      // Arrange
      const testParcelle = createTestParcelle({ userId: testUser.id });

      // Act - Insert parcelle
      await db.run(`
        INSERT INTO parcelles (id, userId, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testParcelle.id,
        testParcelle.userId,
        testParcelle.numero,
        testParcelle.transporteur,
        testParcelle.poids,
        testParcelle.prixAchat,
        testParcelle.prixTotal,
        testParcelle.prixParGramme,
        testParcelle.createdAt,
        testParcelle.updatedAt
      ]);

      // Act - Retrieve parcelle
      const retrievedParcelle = await db.get(`
        SELECT * FROM parcelles WHERE id = ?
      `, [testParcelle.id]);

      // Assert
      expect(retrievedParcelle).toBeDefined();
      expect(retrievedParcelle.id).toBe(testParcelle.id);
      expect(retrievedParcelle.userId).toBe(testUser.id);
      expect(retrievedParcelle.numero).toBe(testParcelle.numero);
      expect(retrievedParcelle.transporteur).toBe(testParcelle.transporteur);
    });

    it('should enforce foreign key constraint with users', async () => {
      // Arrange
      const testParcelle = createTestParcelle({ userId: 'non-existent-user-id' });

      // Act & Assert - Try to insert parcelle with non-existent user
      await expect(async () => {
        await db.run(`
          INSERT INTO parcelles (id, userId, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testParcelle.id,
          testParcelle.userId,
          testParcelle.numero,
          testParcelle.transporteur,
          testParcelle.poids,
          testParcelle.prixAchat,
          testParcelle.prixTotal,
          testParcelle.prixParGramme,
          testParcelle.createdAt,
          testParcelle.updatedAt
        ]);
      }).rejects.toThrow();
    });

    it('should retrieve parcelles by user', async () => {
      // Arrange
      const parcelle1 = createTestParcelle({ userId: testUser.id });
      const parcelle2 = createTestParcelle({ userId: testUser.id });
      
      // Insert parcelles
      for (const parcelle of [parcelle1, parcelle2]) {
        await db.run(`
          INSERT INTO parcelles (id, userId, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          parcelle.id,
          parcelle.userId,
          parcelle.numero,
          parcelle.transporteur,
          parcelle.poids,
          parcelle.prixAchat,
          parcelle.prixTotal,
          parcelle.prixParGramme,
          parcelle.createdAt,
          parcelle.updatedAt
        ]);
      }

      // Act - Retrieve parcelles by user
      const userParcelles = await db.all(`
        SELECT * FROM parcelles WHERE userId = ? ORDER BY createdAt
      `, [testUser.id]);

      // Assert
      expect(userParcelles).toHaveLength(2);
      expect(userParcelles[0].userId).toBe(testUser.id);
      expect(userParcelles[1].userId).toBe(testUser.id);
    });
  });

  describe('Product operations', () => {
    let testUser: ReturnType<typeof createTestUser>;
    let testParcelle: ReturnType<typeof createTestParcelle>;

    beforeEach(async () => {
      testUser = createTestUser();
      testParcelle = createTestParcelle({ userId: testUser.id });
      
      // Insert test user
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);

      // Insert test parcelle
      await db.run(`
        INSERT INTO parcelles (id, userId, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testParcelle.id,
        testParcelle.userId,
        testParcelle.numero,
        testParcelle.transporteur,
        testParcelle.poids,
        testParcelle.prixAchat,
        testParcelle.prixTotal,
        testParcelle.prixParGramme,
        testParcelle.createdAt,
        testParcelle.updatedAt
      ]);
    });

    it('should create and retrieve product', async () => {
      // Arrange
      const testProduct = createTestProduct({ 
        userId: testUser.id, 
        parcelleId: testParcelle.id 
      });

      // Act - Insert product
      await db.run(`
        INSERT INTO products (
          id, userId, parcelleId, name, titre, description, brand, marque, 
          category, size, taille, color, couleur, condition, weight, poids,
          purchasePrice, prix, sellingPrice, prixVente, currency, status,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testProduct.id,
        testProduct.userId,
        testProduct.parcelleId,
        testProduct.name,
        testProduct.titre,
        testProduct.description,
        testProduct.brand,
        testProduct.marque,
        testProduct.category,
        testProduct.size,
        testProduct.taille,
        testProduct.color,
        testProduct.couleur,
        testProduct.condition,
        testProduct.weight,
        testProduct.poids,
        testProduct.purchasePrice,
        testProduct.prix,
        testProduct.sellingPrice,
        testProduct.prixVente,
        testProduct.currency,
        testProduct.status,
        testProduct.createdAt,
        testProduct.updatedAt
      ]);

      // Act - Retrieve product
      const retrievedProduct = await db.get(`
        SELECT * FROM products WHERE id = ?
      `, [testProduct.id]);

      // Assert
      expect(retrievedProduct).toBeDefined();
      expect(retrievedProduct.id).toBe(testProduct.id);
      expect(retrievedProduct.userId).toBe(testUser.id);
      expect(retrievedProduct.parcelleId).toBe(testParcelle.id);
      expect(retrievedProduct.name).toBe(testProduct.name);
    });

    it('should enforce foreign key constraints', async () => {
      // Arrange
      const testProduct = createTestProduct({ 
        userId: 'non-existent-user-id', 
        parcelleId: testParcelle.id 
      });

      // Act & Assert - Try to insert product with non-existent user
      await expect(async () => {
        await db.run(`
          INSERT INTO products (
            id, userId, parcelleId, name, titre, description, brand, marque, 
            category, size, taille, color, couleur, condition, weight, poids,
            purchasePrice, prix, sellingPrice, prixVente, currency, status,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          testProduct.id,
          testProduct.userId,
          testProduct.parcelleId,
          testProduct.name,
          testProduct.titre,
          testProduct.description,
          testProduct.brand,
          testProduct.marque,
          testProduct.category,
          testProduct.size,
          testProduct.taille,
          testProduct.color,
          testProduct.couleur,
          testProduct.condition,
          testProduct.weight,
          testProduct.poids,
          testProduct.purchasePrice,
          testProduct.prix,
          testProduct.sellingPrice,
          testProduct.prixVente,
          testProduct.currency,
          testProduct.status,
          testProduct.createdAt,
          testProduct.updatedAt
        ]);
      }).rejects.toThrow();
    });

    it('should retrieve products by parcelle', async () => {
      // Arrange
      const product1 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });
      const product2 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });
      
      // Insert products
      for (const product of [product1, product2]) {
        await db.run(`
          INSERT INTO products (
            id, userId, parcelleId, name, titre, description, brand, marque, 
            category, size, taille, color, couleur, condition, weight, poids,
            purchasePrice, prix, sellingPrice, prixVente, currency, status,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.id,
          product.userId,
          product.parcelleId,
          product.name,
          product.titre,
          product.description,
          product.brand,
          product.marque,
          product.category,
          product.size,
          product.taille,
          product.color,
          product.couleur,
          product.condition,
          product.weight,
          product.poids,
          product.purchasePrice,
          product.prix,
          product.sellingPrice,
          product.prixVente,
          product.currency,
          product.status,
          product.createdAt,
          product.updatedAt
        ]);
      }

      // Act - Retrieve products by parcelle
      const parcelleProducts = await db.all(`
        SELECT * FROM products WHERE parcelleId = ? ORDER BY createdAt
      `, [testParcelle.id]);

      // Assert
      expect(parcelleProducts).toHaveLength(2);
      expect(parcelleProducts[0].parcelleId).toBe(testParcelle.id);
      expect(parcelleProducts[1].parcelleId).toBe(testParcelle.id);
    });

    it('should allow products without parcelle', async () => {
      // Arrange
      const testProduct = createTestProduct({ 
        userId: testUser.id, 
        parcelleId: null 
      });

      // Act - Insert product without parcelle
      await db.run(`
        INSERT INTO products (
          id, userId, parcelleId, name, titre, description, brand, marque, 
          category, size, taille, color, couleur, condition, weight, poids,
          purchasePrice, prix, sellingPrice, prixVente, currency, status,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testProduct.id,
        testProduct.userId,
        testProduct.parcelleId,
        testProduct.name,
        testProduct.titre,
        testProduct.description,
        testProduct.brand,
        testProduct.marque,
        testProduct.category,
        testProduct.size,
        testProduct.taille,
        testProduct.color,
        testProduct.couleur,
        testProduct.condition,
        testProduct.weight,
        testProduct.poids,
        testProduct.purchasePrice,
        testProduct.prix,
        testProduct.sellingPrice,
        testProduct.prixVente,
        testProduct.currency,
        testProduct.status,
        testProduct.createdAt,
        testProduct.updatedAt
      ]);

      // Act - Retrieve product
      const retrievedProduct = await db.get(`
        SELECT * FROM products WHERE id = ?
      `, [testProduct.id]);

      // Assert
      expect(retrievedProduct).toBeDefined();
      expect(retrievedProduct.parcelleId).toBeNull();
    });
  });

  describe('Complex queries and relationships', () => {
    let testUser: ReturnType<typeof createTestUser>;
    let testParcelle: ReturnType<typeof createTestParcelle>;

    beforeEach(async () => {
      testUser = createTestUser();
      testParcelle = createTestParcelle({ userId: testUser.id });
      
      // Insert test data
      await db.run(`
        INSERT INTO users (id, username, email, passwordHash, encryptionSecret, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        testUser.id,
        testUser.username,
        testUser.email,
        testUser.passwordHash,
        testUser.encryptionSecret,
        testUser.createdAt,
        testUser.updatedAt
      ]);

      await db.run(`
        INSERT INTO parcelles (id, userId, numero, transporteur, poids, prixAchat, prixTotal, prixParGramme, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        testParcelle.id,
        testParcelle.userId,
        testParcelle.numero,
        testParcelle.transporteur,
        testParcelle.poids,
        testParcelle.prixAchat,
        testParcelle.prixTotal,
        testParcelle.prixParGramme,
        testParcelle.createdAt,
        testParcelle.updatedAt
      ]);
    });

    it('should join users with their parcelles', async () => {
      // Act - Join query
      const result = await db.all(`
        SELECT u.username, p.numero, p.transporteur
        FROM users u
        LEFT JOIN parcelles p ON u.id = p.userId
        WHERE u.id = ?
      `, [testUser.id]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe(testUser.username);
      expect(result[0].numero).toBe(testParcelle.numero);
      expect(result[0].transporteur).toBe(testParcelle.transporteur);
    });

    it('should count products per parcelle', async () => {
      // Arrange - Insert products
      const product1 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });
      const product2 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });
      
      for (const product of [product1, product2]) {
        await db.run(`
          INSERT INTO products (
            id, userId, parcelleId, name, titre, description, brand, marque, 
            category, size, taille, color, couleur, condition, weight, poids,
            purchasePrice, prix, sellingPrice, prixVente, currency, status,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.id,
          product.userId,
          product.parcelleId,
          product.name,
          product.titre,
          product.description,
          product.brand,
          product.marque,
          product.category,
          product.size,
          product.taille,
          product.color,
          product.couleur,
          product.condition,
          product.weight,
          product.poids,
          product.purchasePrice,
          product.prix,
          product.sellingPrice,
          product.prixVente,
          product.currency,
          product.status,
          product.createdAt,
          product.updatedAt
        ]);
      }

      // Act - Count products per parcelle
      const result = await db.get(`
        SELECT p.numero, COUNT(pr.id) as productCount
        FROM parcelles p
        LEFT JOIN products pr ON p.id = pr.parcelleId
        WHERE p.id = ?
        GROUP BY p.id
      `, [testParcelle.id]);

      // Assert
      expect(result.numero).toBe(testParcelle.numero);
      expect(result.productCount).toBe(2);
    });

    it('should handle transactions correctly', async () => {
      // Arrange
      const product1 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });
      const product2 = createTestProduct({ userId: testUser.id, parcelleId: testParcelle.id });

      // Act - Transaction
      await db.exec('BEGIN TRANSACTION');
      
      try {
        // Insert first product
        await db.run(`
          INSERT INTO products (
            id, userId, parcelleId, name, titre, description, brand, marque, 
            category, size, taille, color, couleur, condition, weight, poids,
            purchasePrice, prix, sellingPrice, prixVente, currency, status,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product1.id, product1.userId, product1.parcelleId, product1.name, product1.titre,
          product1.description, product1.brand, product1.marque, product1.category,
          product1.size, product1.taille, product1.color, product1.couleur,
          product1.condition, product1.weight, product1.poids, product1.purchasePrice,
          product1.prix, product1.sellingPrice, product1.prixVente, product1.currency,
          product1.status, product1.createdAt, product1.updatedAt
        ]);

        // Insert second product
        await db.run(`
          INSERT INTO products (
            id, userId, parcelleId, name, titre, description, brand, marque, 
            category, size, taille, color, couleur, condition, weight, poids,
            purchasePrice, prix, sellingPrice, prixVente, currency, status,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product2.id, product2.userId, product2.parcelleId, product2.name, product2.titre,
          product2.description, product2.brand, product2.marque, product2.category,
          product2.size, product2.taille, product2.color, product2.couleur,
          product2.condition, product2.weight, product2.poids, product2.purchasePrice,
          product2.prix, product2.sellingPrice, product2.prixVente, product2.currency,
          product2.status, product2.createdAt, product2.updatedAt
        ]);

        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }

      // Assert - Both products should be inserted
      const products = await db.all(`
        SELECT * FROM products WHERE parcelleId = ?
      `, [testParcelle.id]);

      expect(products).toHaveLength(2);
    });
  });
});