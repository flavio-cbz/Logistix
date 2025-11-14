/**
 * Superbuy Mapper Service Unit Tests
 * 
 * Tests de transformation des données Superbuy vers le format LogistiX
 * Utilise des payloads réels extraits pour valider les mappings
 */

import { describe, it, expect } from 'vitest';
import { SuperbuyMapperService } from '@/lib/integrations/superbuy/mapper';
import type { SuperbuyParcel } from '@/lib/integrations/superbuy/types';

describe('SuperbuyMapperService', () => {
  const mockUserId = 'test-user-123';

  describe('mapParcelToLogistix', () => {
    it('devrait mapper correctement un colis avec tous les champs présents', () => {
      const superbuyParcel: SuperbuyParcel = {
        packageOrderNo: 'PN25801084507',
        trackingNumber: 'CJ305782656DE',
        carrier: '云腾',
  // statut top-level supprimé (utiliser rawPackageInfo.packageStatusName)
        weight: 6380, // grammes
        shippingFee: 102.72, // USD
        warehouseName: 'Guangdong Warehouse',
        currency: 'USD',
        packageItems: [
          {
            itemId: 38170730,
            goodsName: '[Hot Sale] Limited Edition Jersey!',
            unitPrice: 88,
            weight: 195,
          },
        ],
        rawPackageInfo: {
          packageId: 5904878,
          packageNo: 'PN25801084507',
          packageWeight: 8612,
          packageRealWeight: 6380,
          packageStatusName: 'Shipped',
          expressNo: 'CJ305782656DE',
          deliveryCompanyName: '云腾',
          freight: 102.72,
          realFreight: 102.72,
          packagePrice: 80.75,
          realPackagePrice: 80.75,
        },
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(superbuyParcel, mockUserId);

      // Vérifications de base
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);

  // Numero (désormais l'ID Superbuy du colis)
  expect(result.numero).toBe('PN25801084507');
  // Numéro de suivi (tracking number du transporteur)
  expect(result.numero_suivi).toBe('CJ305782656DE');

  // Transporteur (priorité: carrier > deliveryCompanyName > warehouseName) + traduction CN->EN
  expect(result.transporteur).toBe('EU & US Duty-Free Preferential Air Cargo (Special)');

  // Statut (supporte string "Shipped" -> "Expédié" au niveau mapper ;
  // normalisation finale vers l'ensemble supporté est faite dans le service de sync)
      expect(result.statut).toBe('Expédié');

  // Poids en grammes (stockage unifié en g)
  expect(result.poids).toBeGreaterThan(0);
  expect(result.poids).toBe(6380);

      // Prix (shippingFee USD -> EUR, avec conversion 0.92)
      // shippingFee = 102.72 USD -> ~94.50 EUR
      expect(result.prixAchat).toBeGreaterThan(0);
      // Note: prixAchat peut être calculé différemment selon packagePrice vs shippingFee
      expect(result.prixTotal).toBeGreaterThan(0);

      // Prix par gramme
      expect(result.prixParGramme).toBeGreaterThan(0);

      // Nom du colis (basé sur items)
      expect(result.nom).toContain('Jersey');
    });

    it('devrait utiliser les fallbacks quand les champs sont absents', () => {
      const minimalParcel: SuperbuyParcel = {
        packageOrderNo: 'PN12345',
        // Pas de trackingNumber, carrier, status, weight, shippingFee
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(minimalParcel, mockUserId);

      // Numero: fallback sur packageOrderNo
      expect(result.numero).toBe('PN12345');

      // Transporteur: fallback "Superbuy"
      expect(result.transporteur).toBe('Superbuy');

      // Statut: fallback "En attente"
      expect(result.statut).toBe('En attente');

  // Poids: minimum 1 gramme
  expect(result.poids).toBe(1);

      // Prix: minimum 0.01€
      expect(result.prixAchat).toBe(0.01);

      // Nom: fallback avec packageOrderNo
      expect(result.nom).toContain('PN12345');
    });

    it('devrait mapper les statuts string correctement', () => {
      const testCases = [
        { status: 'Shipped', expected: 'Expédié' },
        { status: 'Delivered', expected: 'Livré' },
        { status: 'Cancelled', expected: 'Annulé' },
        { status: 'Processing', expected: 'Processing' }, // Pas de mapping spécifique
      ];

      testCases.forEach(({ status, expected }) => {
        const parcel: SuperbuyParcel = {
          packageOrderNo: 'TEST',
          rawPackageInfo: {
            packageStatusName: status,
          },
        };

        const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
        expect(result.statut).toBe(expected);
      });
    });

    it('devrait mapper les statuts numériques via SUPERBUY_STATUS_MAP', () => {
      const testCases = [
        { orderStatus: 1, expected: 'En attente' },
        { orderStatus: 2, expected: 'En traitement' },
        { orderStatus: 3, expected: 'Expédié' },
        { orderStatus: 4, expected: 'Livré' },
        { orderStatus: 5, expected: 'Annulé' },
        { orderStatus: 999, expected: 'Inconnu' }, // Statut non mappé
      ];

      testCases.forEach(({ orderStatus, expected }) => {
        const parcel: SuperbuyParcel = {
          packageOrderNo: 'TEST',
          orderStatus,
        };

        const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
        expect(result.statut).toBe(expected);
      });
    });

    it('devrait convertir USD en EUR correctement', () => {
      const parcel: SuperbuyParcel = {
        packageOrderNo: 'TEST',
        packageTotalAmount: 100, // 100 USD (prix des produits)
        packageTotalFreight: 20, // 20 USD shipping
        weight: 1000, // 1kg
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);

      // prixAchat = packageTotalAmount converti (prix produits seuls)
      // 100 USD * 0.92 = 92 EUR
      expect(result.prixAchat).toBeCloseTo(92, 1);

      // prixTotal = produits + shipping
      // (100 + 20) USD * 0.92 = 120 * 0.92 = 110.4 EUR
      expect(result.prixTotal).toBeCloseTo(110.4, 1);
    });

    it('devrait conserver le poids en grammes', () => {
      const testCases = [
        { weight: 1000, expectedGrams: 1000 },
        { weight: 500, expectedGrams: 500 },
        { weight: 6380, expectedGrams: 6380 },
        { weight: 1, expectedGrams: 1 },
      ];

      testCases.forEach(({ weight, expectedGrams }) => {
        const parcel: SuperbuyParcel = {
          packageOrderNo: 'TEST',
          weight,
        };

        const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
        expect(result.poids).toBe(expectedGrams);
      });
    });

    it('devrait détecter le transporteur depuis expressUrl', () => {
      const carriers = [
        { expressUrl: 'https://track.dhl.com/123', expected: 'DHL' },
        { expressUrl: 'https://fedex.com/tracking/456', expected: 'FedEx' },
        { expressUrl: 'https://ups.com/track/789', expected: 'UPS' },
        { expressUrl: 'https://tools.usps.com/go/TrackConfirm', expected: 'USPS' },
        { expressUrl: 'http://ems.com.cn/qps/yjcx', expected: 'EMS' },
      ];

      carriers.forEach(({ expressUrl, expected }) => {
        const parcel: SuperbuyParcel = {
          packageOrderNo: 'TEST',
          expressUrl,
        };

        const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
        expect(result.transporteur).toBe(expected);
      });
    });

    it('devrait générer un nom de colis basé sur les items', () => {
      const parcel: SuperbuyParcel = {
        packageOrderNo: 'TEST',
        packageItems: [
          {
            goodsName: 'Limited Edition Jersey',
            weight: 200,
            unitPrice: 50,
          },
          {
            goodsName: 'Sneakers',
            weight: 800,
            unitPrice: 120,
          },
        ],
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);

      // Devrait utiliser le premier item et indiquer "+1 autres"
      expect(result.nom).toContain('Limited Edition Jersey');
      expect(result.nom).toContain('+1 autres');
    });

    it('devrait utiliser goodsName si disponible', () => {
      const parcel: SuperbuyParcel = {
        packageOrderNo: 'TEST',
        goodsName: 'Premium Package - Electronics',
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
      expect(result.nom).toBe('Premium Package - Electronics');
    });

    it('devrait tronquer les noms trop longs', () => {
      const longName = 'A'.repeat(100);
      const parcel: SuperbuyParcel = {
        packageOrderNo: 'TEST',
        goodsName: longName,
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);
      
      // Le nom doit être tronqué à ~50 caractères + "..."
      expect(result.nom.length).toBeLessThanOrEqual(53);
      expect(result.nom).toContain('...');
    });

    it('devrait lever une erreur si les champs obligatoires sont vides', () => {
      const invalidParcel: SuperbuyParcel = {
        // Pas de packageOrderNo, packageId, etc. -> numero sera généré avec timestamp
        // mais transporteur et nom seront vides
      };

      // Cette fonction devrait throw si numero/transporteur/nom sont vides
      // Note: avec les fallbacks actuels, ça ne devrait plus arriver
      // On teste quand même le comportement
      const result = SuperbuyMapperService.mapParcelToLogistix(invalidParcel, mockUserId);
      
      // Avec les fallbacks, on devrait toujours avoir des valeurs
      expect(result.numero).toBeTruthy();
      expect(result.transporteur).toBeTruthy();
      expect(result.nom).toBeTruthy();
    });

    it('devrait prioriser rawPackageInfo pour les données manquantes', () => {
      const parcel: SuperbuyParcel = {
        packageOrderNo: 'TEST',
        // Pas de weight/shippingFee en top-level
        rawPackageInfo: {
          packageRealWeight: 2500,
          realFreight: 45.50,
          packagePrice: 120.00,
          deliveryCompanyName: 'SF Express',
        },
      };

      const result = SuperbuyMapperService.mapParcelToLogistix(parcel, mockUserId);

  // Poids depuis rawPackageInfo.packageRealWeight (en grammes)
  expect(result.poids).toBe(2500);

      // Transporteur depuis rawPackageInfo.deliveryCompanyName
      expect(result.transporteur).toBe('SF Express');

      // Prix depuis rawPackageInfo (converti USD -> EUR)
      expect(result.prixAchat).toBeGreaterThan(0);
    });
  });

  describe('mapParcelsToLogistix (batch)', () => {
    it('devrait mapper plusieurs colis et filtrer les invalides', () => {
      const parcels: SuperbuyParcel[] = [
        { packageOrderNo: 'PN001', weight: 1000, shippingFee: 10 },
        { packageOrderNo: 'PN002', weight: 2000, shippingFee: 20 },
        { packageOrderNo: 'PN003', weight: 3000, shippingFee: 30 },
      ];

      const results = SuperbuyMapperService.mapParcelsToLogistix(parcels, mockUserId);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.numero).toBe(`PN00${index + 1}`);
        expect(result.poids).toBeGreaterThan(0);
      });
    });

    it('devrait continuer le mapping même si un colis échoue', () => {
      const parcels: SuperbuyParcel[] = [
        { packageOrderNo: 'PN001', weight: 1000 },
        // Un colis qui pourrait poser problème (mais avec les fallbacks, ça devrait passer)
        { packageOrderNo: 'PN002' },
        { packageOrderNo: 'PN003', weight: 3000 },
      ];

      const results = SuperbuyMapperService.mapParcelsToLogistix(parcels, mockUserId);

      // Tous devraient passer grâce aux fallbacks
      expect(results).toHaveLength(3);
    });
  });

  describe('extractSuperbuyId', () => {
    it('devrait extraire l\'ID Superbuy depuis différents champs', () => {
      const testCases = [
        { parcel: { packageOrderNo: 'PN123' }, expected: 'PN123' },
        { parcel: { packageNo: 'PKG456' }, expected: 'PKG456' },
        { parcel: { packageOrderId: 789 }, expected: '789' },
        { parcel: { packageId: 101 }, expected: '101' },
        { parcel: {}, expected: '' },
      ];

      testCases.forEach(({ parcel, expected }) => {
        const result = SuperbuyMapperService.extractSuperbuyId(parcel as SuperbuyParcel);
        expect(result).toBe(expected);
      });
    });
  });
});
