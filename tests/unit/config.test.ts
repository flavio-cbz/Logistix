/**
 * Tests unitaires pour les utilitaires de base
 */

import { describe, it, expect } from 'vitest';
import { validateUrl, buildApiUrl } from '../config/test-config';

describe('Configuration de test', () => {
  describe('validateUrl', () => {
    it('devrait valider une URL HTTP correcte', () => {
      expect(validateUrl('http://localhost:3000')).toBe(true);
    });

    it('devrait valider une URL HTTPS correcte', () => {
      expect(validateUrl('https://example.com')).toBe(true);
    });

    it('devrait invalider une URL malformée', () => {
      expect(validateUrl('not-a-url')).toBe(false);
    });

    it('devrait invalider une URL vide', () => {
      expect(validateUrl('')).toBe(false);
    });

    it('devrait invalider une URL avec protocole HTTP manquant', () => {
      expect(validateUrl('www.example.com')).toBe(false);
    });
  });

  describe('buildApiUrl', () => {
    it('devrait construire une URL API correcte avec slash initial', () => {
      const url = buildApiUrl('/api/test');
      expect(url).toBe('http://localhost:3000/api/test');
      expect(validateUrl(url)).toBe(true);
    });

    it('devrait construire une URL API correcte sans slash initial', () => {
      const url = buildApiUrl('api/test');
      expect(url).toBe('http://localhost:3000/api/test');
      expect(validateUrl(url)).toBe(true);
    });

    it('devrait gérer les endpoints complexes', () => {
      const url = buildApiUrl('/api/v1/parcelles/123/products');
      expect(url).toBe('http://localhost:3000/api/v1/parcelles/123/products');
      expect(validateUrl(url)).toBe(true);
    });

    it('devrait nettoyer les doubles slashes', () => {
      const url = buildApiUrl('//api/test');
      expect(url).toBe('http://localhost:3000/api/test');
      expect(validateUrl(url)).toBe(true);
    });
  });
});