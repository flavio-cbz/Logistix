/**
 * Test de débogage pour la détection de changement de statut
 */

import { describe, it, expect } from 'vitest';
import { SuperbuyMapperService } from '@/lib/integrations/superbuy/mapper';
import type { SuperbuyParcel } from '@/lib/integrations/superbuy/types';

describe('Debug Status Change Detection', () => {
  it('should detect status change from En attente to Shipped', () => {
    // Simule la parcelle Superbuy avec status "Shipped"
    const superbuyParcel: Partial<SuperbuyParcel> = {
      packageOrderNo: 'PN25801084507',
      packageNo: 'PN25801084507',
      rawPackageInfo: {
        packageStatusName: 'Shipped',  // Ce que Superbuy renvoie
        packageStatus: 11
      },
      packageRealWeight: 6380,
      packageTotalAmount: 110.28,
    };

    // Simule la parcelle LogistiX actuelle avec status "En attente"
    const logistixParcelle = {
      numero: 'PN25801084507',
      statut: 'En attente',  // Notre statut actuel en DB
      poids: 6380,
      prixTotal: 101.46,
      transporteur: 'EU & US Duty-Free Preferential Air Cargo (Special)'
    };

    // La fonction devrait détecter un changement
    const hasChanges = SuperbuyMapperService.hasSignificantDifferences(
      superbuyParcel as SuperbuyParcel,
      logistixParcelle
    );

    console.log({
      superbuyStatus: superbuyParcel.rawPackageInfo?.packageStatusName,
      logistixStatus: logistixParcelle.statut,
      hasChanges
    });

    expect(hasChanges).toBe(true);
  });

  it('should NOT detect change when statuses are equivalent', () => {
    // Superbuy dit "Shipped" qui map à "En transit"
    const superbuyParcel: Partial<SuperbuyParcel> = {
      packageOrderNo: 'PN25801084507',
      packageNo: 'PN25801084507',
      rawPackageInfo: {
        packageStatusName: 'Shipped',
        packageStatus: 11
      },
      packageRealWeight: 6380,
      packageTotalAmount: 110.28,
    };

    // LogistiX a déjà "En transit"
    const logistixParcelle = {
      numero: 'PN25801084507',
      statut: 'En transit',  // Déjà normalisé
      poids: 6380,
      prixTotal: 101.46,
      transporteur: 'EU & US Duty-Free Preferential Air Cargo (Special)'
    };

    const hasChanges = SuperbuyMapperService.hasSignificantDifferences(
      superbuyParcel as SuperbuyParcel,
      logistixParcelle
    );

    // Debug: let's trace the actual values being compared
    const statusValue = (superbuyParcel as any).status ?? superbuyParcel.rawPackageInfo?.['packageStatusName'] ?? (superbuyParcel as any).orderStatus;
    console.log({
      rawStatusValue: statusValue,
      superbuyStatus: superbuyParcel.rawPackageInfo?.packageStatusName,
      logistixStatus: logistixParcelle.statut,
      hasChanges
    });

    expect(hasChanges).toBe(false);
  });
});
