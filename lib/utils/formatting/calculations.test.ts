import { describe, it, expect } from 'vitest';
import { calculerBenefices, calculPrixLivraison } from './calculations';

describe('calculerBenefices', () => {
  it('calculs nominal', () => {
    const produit = { vendu: true, prixVente: 200, prixArticle: 50, prixLivraison: 10 };
    const res = calculerBenefices(produit);
    expect(res.benefices).toBe(140);
    expect(res.pourcentageBenefice).toBeCloseTo((140 / (50 + 10)) * 100);
  });

  it('retourne 0 si non vendu', () => {
    const res = calculerBenefices({ vendu: false, prixVente: 200, prixArticle: 50, prixLivraison: 10 });
    expect(res).toEqual({ benefices: 0, pourcentageBenefice: 0 });
  });

  it('retourne 0 si prix manquant', () => {
    const res = calculerBenefices({ vendu: true, prixVente: null, prixArticle: 10, prixLivraison: 5 });
    expect(res).toEqual({ benefices: 0, pourcentageBenefice: 0 });
  });

  it('division par zéro -> pourcentage 0', () => {
    const produit = { vendu: true, prixVente: 100, prixArticle: 0, prixLivraison: 0 };
    const res = calculerBenefices(produit);
    expect(res.benefices).toBe(100);
    expect(res.pourcentageBenefice).toBe(0);
  });
});

describe('calculPrixLivraison', () => {
  it('calcule correctement pour une parcelle existante', () => {
    const parcelles = [{ id: 'p1', prixParGramme: 0.5 }, { id: 'p2', prixParGramme: 1.2 }];
    expect(calculPrixLivraison(100, parcelles as any, 'p1')).toBe(50);
  });

  it('retourne 0 si parcelle non trouvée', () => {
    expect(calculPrixLivraison(10, [], 'missing')).toBe(0);
  });

  it('supporte poids 0', () => {
    const parcelles = [{ id: 'p3', prixParGramme: 2 }];
    expect(calculPrixLivraison(0, parcelles as any, 'p3')).toBe(0);
  });
});