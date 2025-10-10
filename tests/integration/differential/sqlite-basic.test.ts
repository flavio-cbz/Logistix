/**
 * Test différentiel simple - SQLite seulement
 * 
 * Ce test valide que nos repositories SQLite fonctionnent indépendamment
 * avant d'ajouter la comparaison avec PostgreSQL.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseFactory } from '@/lib/config/database-factory';

describe('SQLite Repository - Tests basiques', () => {
  let factory: DatabaseFactory | null = null;

  beforeEach(async () => {
    // Force l'utilisation de SQLite pour ces tests
    process.env.DATABASE_TYPE = 'sqlite';
    
    // Configuration basique pour les tests
    const config = {
      databasePath: ':memory:',
      databaseType: 'sqlite' as const,
    };
    
    factory = DatabaseFactory.getInstance(config);
  });

  afterEach(async () => {
    if (factory) {
      await factory.cleanup();
      factory = null;
    }
  });

  it('devrait instancier les repositories SQLite sans erreur', async () => {
    expect(factory).toBeDefined();
    const { produitRepository, parcelleRepository } = await factory!.getRepositories();
    
    expect(produitRepository).toBeDefined();
    expect(parcelleRepository).toBeDefined();
    
    // Vérifier le type des repositories
    expect(produitRepository.constructor.name).toContain('SQLite');
    expect(parcelleRepository.constructor.name).toContain('SQLite');
  });

  it('devrait pouvoir compter les produits (même si zéro)', async () => {
    expect(factory).toBeDefined();
    const { produitRepository } = await factory!.getRepositories();
    
    // Ce test simple vérifie juste que la méthode peut être appelée
    const count = await produitRepository.countByUserId('test-user-id');
    
    // Le résultat peut être 0 ou plus, l'important est qu'il ne lance pas d'erreur
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('devrait pouvoir rechercher des parcelles vides pour un utilisateur', async () => {
    expect(factory).toBeDefined();
    const { parcelleRepository } = await factory!.getRepositories();
    
    // Ce test simple vérifie juste que la méthode peut être appelée
    const parcelles = await parcelleRepository.findByUserId('test-user-id');
    
    // Le résultat peut être vide, l'important est qu'il ne lance pas d'erreur
    expect(Array.isArray(parcelles)).toBe(true);
  });
});