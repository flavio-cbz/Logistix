/**
 * Tests unitaires pour lib/utils.ts
 */

import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDate, sleep, capitalize, truncate } from '../../lib/utils';

describe('Utilitaires de base', () => {
  describe('cn (class names merger)', () => {
    it('devrait combiner des classes simples', () => {
      const result = cn('text-red-500', 'bg-blue-200');
      expect(result).toContain('text-red-500');
      expect(result).toContain('bg-blue-200');
    });

    it('devrait gérer les classes conditionnelles', () => {
      const result = cn('base-class', true && 'conditional-class');
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
    });

    it('devrait ignorer les valeurs falsy', () => {
      const result = cn('base-class', false && 'ignored-class', null, undefined);
      expect(result).toContain('base-class');
      expect(result).not.toContain('ignored-class');
    });

    it('devrait fusionner les classes Tailwind en conflit', () => {
      const result = cn('text-red-500', 'text-blue-500');
      // tailwind-merge devrait garder seulement la dernière classe de couleur
      expect(result).toBe('text-blue-500');
    });
  });

  describe('formatCurrency', () => {
    it('devrait formater les montants en euros', () => {
      const result = formatCurrency(25.50);
      expect(result).toContain('25,50');
      expect(result).toContain('€');
    });

    it('devrait formater les nombres entiers', () => {
      const result = formatCurrency(100);
      expect(result).toContain('100,00');
      expect(result).toContain('€');
    });

    it('devrait gérer les nombres négatifs', () => {
      const result = formatCurrency(-15.75);
      expect(result).toContain('-15,75');
      expect(result).toContain('€');
    });

    it('devrait gérer zéro', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0,00');
      expect(result).toContain('€');
    });

    it('devrait gérer les gros nombres avec séparateurs', () => {
      expect(formatCurrency(1234.56)).toContain('1');
      expect(formatCurrency(1234.56)).toContain('€');
    });
  });

  describe('formatDate', () => {
    it('devrait formater une date en français', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toContain('janvier');
      expect(result).toContain('2024');
    });

    it('devrait accepter une chaîne de date ISO', () => {
      const result = formatDate('2024-12-25');
      expect(result).toContain('décembre');
      expect(result).toContain('2024');
    });

    it('devrait gérer les dates avec heures', () => {
      const result = formatDate('2024-06-15T14:30:00Z');
      expect(result).toContain('juin');
      expect(result).toContain('2024');
    });
  });

  describe('sleep', () => {
    it('devrait attendre le délai spécifié', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      // Tolérance pour les variations de timing
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThan(100);
    });

    it('devrait retourner une Promise', () => {
      const result = sleep(10);
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('capitalize', () => {
    it('devrait capitaliser le premier caractère', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('devrait mettre en minuscule le reste', () => {
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('devrait gérer les chaînes mixtes', () => {
      expect(capitalize('hELLo WoRLD')).toBe('Hello world');
    });

    it('devrait gérer les chaînes vides', () => {
      expect(capitalize('')).toBe('');
    });

    it('devrait gérer un seul caractère', () => {
      expect(capitalize('a')).toBe('A');
    });

    it('devrait gérer les caractères spéciaux', () => {
      expect(capitalize('éric')).toBe('Éric');
    });
  });

  describe('truncate', () => {
    it('devrait tronquer les textes longs', () => {
      const longText = 'Ceci est un texte très long qui devrait être tronqué';
      const result = truncate(longText, 20);
      expect(result).toBe('Ceci est un texte tr...');
      expect(result.length).toBe(23); // 20 + "..."
    });

    it('devrait retourner le texte original si plus court', () => {
      const shortText = 'Court';
      const result = truncate(shortText, 20);
      expect(result).toBe('Court');
    });

    it('devrait gérer la longueur exacte', () => {
      const text = 'Exactement vingt car';
      const result = truncate(text, 20);
      expect(result).toBe('Exactement vingt car');
    });

    it('devrait gérer la longueur zéro', () => {
      const result = truncate('Hello', 0);
      expect(result).toBe('...');
    });
  });
});