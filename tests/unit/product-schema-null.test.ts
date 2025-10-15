/**
 * Tests pour vérifier que les schémas acceptent bien null
 */

import { describe, it, expect } from 'vitest';
import { updateProductSchema } from '@/lib/schemas/product';

describe('Product Schema - Null Handling', () => {
  it('devrait accepter null pour les champs optionnels', () => {
    const data = {
      name: 'Test Product',
      price: 100,
      poids: 500,
      url: null,
      photoUrl: null,
      brand: null,
      category: null,
      color: null,
      size: null,
      subcategory: null,
      coutLivraison: null,
      parcelleId: null,
  vintedItemId: null, // allowed, platform-agnostic
      plateforme: null,
      dateMiseEnLigne: null,
      dateVente: null,
      prixVente: null,
      vendu: '0' as const,
    };

    const result = updateProductSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Validation errors:', result.error.format());
    }
    
    expect(result.success).toBe(true);
  });

  it('devrait accepter des chaînes vides pour url et photoUrl', () => {
    const data = {
      name: 'Test Product',
      price: 100,
      poids: 500,
      url: '',
      photoUrl: '',
      vendu: '0' as const,
    };

    const result = updateProductSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Validation errors:', result.error.format());
    }
    
    expect(result.success).toBe(true);
  });

  it('devrait valider un produit complet avec tous les champs null', () => {
    const data = {
      name: 'Produit Test',
      price: 45.0,
      poids: 800,
      vendu: '0' as const,
      currency: 'EUR',
      brand: 'Test Brand',
      category: 'Test Category',
      // Tous les autres champs sont null
      url: null,
      photoUrl: null,
      color: null,
      size: null,
      subcategory: null,
      coutLivraison: null,
      parcelleId: null,
  vintedItemId: null, // allowed
      plateforme: null,
      dateMiseEnLigne: null,
      dateVente: null,
      prixVente: null,
    };

    const result = updateProductSchema.safeParse(data);
    
    if (!result.success) {
      console.error('Validation errors:', result.error.format());
    }
    
    expect(result.success).toBe(true);
  });

  it('devrait échouer si url est invalide (non null)', () => {
    const data = {
      name: 'Test Product',
      price: 100,
      url: 'invalid-url',
      vendu: '0' as const,
    };

    const result = updateProductSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('url'))).toBe(true);
    }
  });
});
