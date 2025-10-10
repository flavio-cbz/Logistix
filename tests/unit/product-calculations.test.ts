/**
 * Tests unitaires pour les utilitaires de calcul de produits
 * Ces tests documentent le comportement attendu des fonctions de calcul
 */

import { describe, it, expect } from 'vitest';
import {
  calculateShippingCost,
  calculateTotalCost,
  calculateProfit,
  calculateProfitPercentage,
  calculateMargin,
  calculateDaysBetween,
  calculateProductMetrics,
  validateSoldProductFields,
  getMissingSoldFields,
  formatEuro,
  formatWeight,
} from '@/lib/utils/product-calculations';

describe('Product Calculations', () => {
  describe('calculateShippingCost', () => {
    it('devrait calculer correctement le coût de livraison', () => {
      expect(calculateShippingCost(500, 0.05)).toBe(25);
      expect(calculateShippingCost(1000, 0.03)).toBe(30);
    });

    it('devrait retourner 0 si poids ou prix par gramme invalide', () => {
      expect(calculateShippingCost(0, 0.05)).toBe(0);
      expect(calculateShippingCost(500, 0)).toBe(0);
      expect(calculateShippingCost(500, null)).toBe(0);
      expect(calculateShippingCost(500, undefined)).toBe(0);
    });
  });

  describe('calculateTotalCost', () => {
    it('devrait calculer le coût total', () => {
      expect(calculateTotalCost(100, 25)).toBe(125);
      expect(calculateTotalCost(50.5, 12.3)).toBe(62.8);
    });
  });

  describe('calculateProfit', () => {
    it('devrait calculer le bénéfice', () => {
      expect(calculateProfit(150, 125)).toBe(25);
      expect(calculateProfit(100, 80)).toBe(20);
    });

    it('devrait calculer une perte (bénéfice négatif)', () => {
      expect(calculateProfit(100, 150)).toBe(-50);
    });
  });

  describe('calculateProfitPercentage', () => {
    it('devrait calculer le pourcentage de bénéfice', () => {
      expect(calculateProfitPercentage(25, 100)).toBe(25);
      expect(calculateProfitPercentage(50, 200)).toBe(25);
    });

    it('devrait retourner 0 si coût total est 0', () => {
      expect(calculateProfitPercentage(25, 0)).toBe(0);
    });
  });

  describe('calculateMargin', () => {
    it('devrait calculer la marge', () => {
      expect(calculateMargin(25, 125)).toBeCloseTo(20, 1);
      expect(calculateMargin(50, 150)).toBeCloseTo(33.33, 2);
    });

    it('devrait retourner 0 si prix de vente est 0', () => {
      expect(calculateMargin(25, 0)).toBe(0);
    });
  });

  describe('calculateDaysBetween', () => {
    it('devrait calculer le nombre de jours entre deux dates', () => {
      expect(calculateDaysBetween('2025-01-01', '2025-01-08')).toBe(7);
      expect(calculateDaysBetween('2025-01-01', '2025-01-02')).toBe(1);
    });

    it('devrait retourner null si dates invalides', () => {
      expect(calculateDaysBetween(null, '2025-01-01')).toBeNull();
      expect(calculateDaysBetween('2025-01-01', null)).toBeNull();
      expect(calculateDaysBetween('invalid', '2025-01-01')).toBeNull();
    });
  });

  describe('calculateProductMetrics', () => {
    it('devrait calculer toutes les métriques pour un produit non vendu', () => {
      const metrics = calculateProductMetrics(
        100, // prix achat
        500, // poids
        null, // prix vente
        null, // date mise en ligne
        null, // date vente
        { id: '1', prixParGramme: 0.05 } as any // parcelle
      );

      expect(metrics.coutLivraison).toBe(25);
      expect(metrics.coutTotal).toBe(125);
      expect(metrics.benefice).toBeNull();
      expect(metrics.pourcentageBenefice).toBeNull();
      expect(metrics.marge).toBeNull();
      expect(metrics.joursEnVente).toBeNull();
    });

    it('devrait calculer toutes les métriques pour un produit vendu', () => {
      const metrics = calculateProductMetrics(
        100, // prix achat
        500, // poids
        150, // prix vente
        '2025-01-01', // date mise en ligne
        '2025-01-08', // date vente
        { id: '1', prixParGramme: 0.05 } as any // parcelle
      );

      expect(metrics.coutLivraison).toBe(25);
      expect(metrics.coutTotal).toBe(125);
      expect(metrics.benefice).toBe(25);
      expect(metrics.pourcentageBenefice).toBe(20);
      expect(metrics.marge).toBeCloseTo(16.67, 2);
      expect(metrics.joursEnVente).toBe(7);
    });
  });

  describe('validateSoldProductFields', () => {
    it('devrait valider tous les champs présents', () => {
      expect(
        validateSoldProductFields(
          '2025-01-01',
          '2025-01-08',
          150,
          'Vinted'
        )
      ).toBe(true);
    });

    it('devrait échouer si un champ manque', () => {
      expect(
        validateSoldProductFields(
          null,
          '2025-01-08',
          150,
          'Vinted'
        )
      ).toBe(false);

      expect(
        validateSoldProductFields(
          '2025-01-01',
          null,
          150,
          'Vinted'
        )
      ).toBe(false);

      expect(
        validateSoldProductFields(
          '2025-01-01',
          '2025-01-08',
          0,
          'Vinted'
        )
      ).toBe(false);

      expect(
        validateSoldProductFields(
          '2025-01-01',
          '2025-01-08',
          150,
          null
        )
      ).toBe(false);
    });
  });

  describe('getMissingSoldFields', () => {
    it('devrait retourner un tableau vide si tous les champs sont présents', () => {
      const missing = getMissingSoldFields(
        '2025-01-01',
        '2025-01-08',
        150,
        'Vinted'
      );
      expect(missing).toEqual([]);
    });

    it('devrait lister tous les champs manquants', () => {
      const missing = getMissingSoldFields(null, null, null, null);
      expect(missing).toEqual([
        'Date de mise en ligne',
        'Date de vente',
        'Prix de vente',
        'Plateforme',
      ]);
    });

    it('devrait lister seulement les champs manquants spécifiques', () => {
      const missing = getMissingSoldFields(
        '2025-01-01',
        null,
        150,
        null
      );
      expect(missing).toEqual(['Date de vente', 'Plateforme']);
    });
  });

  describe('formatEuro', () => {
    it('devrait formater un montant en euros', () => {
      expect(formatEuro(25)).toBe('25.00 €');
      expect(formatEuro(25.5)).toBe('25.50 €');
      expect(formatEuro(25.567)).toBe('25.57 €');
    });
  });

  describe('formatWeight', () => {
    it('devrait formater en grammes si < 1000g', () => {
      expect(formatWeight(500)).toBe('500 g');
      expect(formatWeight(999)).toBe('999 g');
    });

    it('devrait formater en kilogrammes si >= 1000g', () => {
      expect(formatWeight(1000)).toBe('1.00 kg');
      expect(formatWeight(1500)).toBe('1.50 kg');
      expect(formatWeight(2345)).toBe('2.35 kg');
    });
  });
});
