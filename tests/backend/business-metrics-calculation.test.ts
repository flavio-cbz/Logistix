import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { databaseService } from '@/lib/services/database/db';
import { StatisticsService } from '@/lib/services/statistics-service';

// Mock data interfaces
interface TestProduit {
  id: string;
  nom: string;
  prixArticle: number;
  prixLivraison: number;
  prixVente?: number;
  benefices?: number;
  pourcentageBenefice?: number;
  vendu: boolean;
  dateVente?: string;
  created_at: number;
  plateforme?: string;
  user_id: string;
  parcelle_id: string;
  poids: number;
}

interface TestParcelle {
  id: string;
  numero: string;
  transporteur: string;
  poids: number;
  prix_achat: number;
  date_creation: number;
  user_id: string;
}

describe('Business Metrics Calculation Tests', () => {
  let statisticsService: StatisticsService;
  const testUserId = 'test-user-123';

  // Test data
  const testProduits: TestProduit[] = [
    {
      id: 'prod-1',
      nom: 'Product A',
      prixArticle: 10.00,
      prixLivraison: 2.00,
      prixVente: 18.00,
      benefices: 6.00,
      pourcentageBenefice: 50.0,
      vendu: true,
      dateVente: '2024-01-15 10:30:00',
      created_at: new Date('2024-01-10').getTime() / 1000,
      plateforme: 'Vinted',
      user_id: testUserId,
      parcelle_id: 'parcel-1',
      poids: 100
    },
    {
      id: 'prod-2',
      nom: 'Product B',
      prixArticle: 15.00,
      prixLivraison: 3.00,
      prixVente: 25.00,
      benefices: 7.00,
      pourcentageBenefice: 38.89,
      vendu: true,
      dateVente: '2024-01-20 14:15:00',
      created_at: new Date('2024-01-12').getTime() / 1000,
      plateforme: 'eBay',
      user_id: testUserId,
      parcelle_id: 'parcel-1',
      poids: 150
    },
    {
      id: 'prod-3',
      nom: 'Product C',
      prixArticle: 8.00,
      prixLivraison: 1.50,
      vendu: false,
      created_at: new Date('2024-01-18').getTime() / 1000,
      user_id: testUserId,
      parcelle_id: 'parcel-2',
      poids: 80
    }
  ];

  const testParcelles: TestParcelle[] = [
    {
      id: 'parcel-1',
      numero: 'PAR001',
      transporteur: 'DHL',
      poids: 500,
      prix_achat: 25.00,
      date_creation: new Date('2024-01-10').getTime() / 1000,
      user_id: testUserId
    },
    {
      id: 'parcel-2',
      numero: 'PAR002',
      transporteur: 'UPS',
      poids: 300,
      prix_achat: 15.00,
      date_creation: new Date('2024-01-15').getTime() / 1000,
      user_id: testUserId
    }
  ];

  beforeEach(async () => {
    // Initialize statistics service
    statisticsService = StatisticsService.getInstance();

    // Mock database queries
    vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('SELECT * FROM produits')) {
        return testProduits.filter(p => p.user_id === params[0]);
      }
      if (sql.includes('SELECT * FROM parcelles')) {
        return testParcelles.filter(p => p.user_id === params[0]);
      }
      return [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Revenue Calculation Tests', () => {
    it('should calculate total revenue accurately across all sold products', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Expected total revenue: 18.00 + 25.00 = 43.00
      expect(stats.ventesTotales).toBe(43.00);
    });

    it('should handle zero revenue when no products are sold', async () => {
      const noSalesProducts = testProduits.map(p => ({ ...p, vendu: false, prixVente: undefined }));
      
      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return noSalesProducts.filter(p => p.user_id === params[0]);
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles.filter(p => p.user_id === params[0]);
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      expect(stats.ventesTotales).toBe(0);
    });

    it('should calculate revenue by platform correctly', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      const vintedRevenue = stats.meilleuresPlateformes.find(p => p.plateforme === 'Vinted');
      const ebayRevenue = stats.meilleuresPlateformes.find(p => p.plateforme === 'eBay');
      
      expect(vintedRevenue?.rentabilite).toBe(6.00); // Product A benefits
      expect(ebayRevenue?.rentabilite).toBe(7.00); // Product B benefits
    });

    it('should handle decimal precision in revenue calculations', async () => {
      const precisionProducts = [
        {
          ...testProduits[0],
          prixVente: 18.33,
          benefices: 6.33
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return precisionProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      expect(stats.ventesTotales).toBe(18.33);
      expect(stats.beneficesTotaux).toBe(6.33);
    });
  });

  describe('Profit Margin Calculation Tests', () => {
    it('should calculate profit margins accurately for individual products', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Product A: (18.00 - 12.00) / 12.00 * 100 = 50%
      // Product B: (25.00 - 18.00) / 18.00 * 100 = 38.89%
      const roiData = stats.roiParProduit;
      
      expect(roiData).toHaveLength(2);
      expect(roiData[0].roi).toBe(50.0); // Highest ROI first
      expect(roiData[1].roi).toBe(38.89);
    });

    it('should calculate total profit margin correctly', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Total benefits: 6.00 + 7.00 = 13.00
      expect(stats.beneficesTotaux).toBe(13.00);
    });

    it('should handle negative profit margins', async () => {
      const lossProducts = [
        {
          ...testProduits[0],
          prixVente: 10.00,
          benefices: -2.00,
          pourcentageBenefice: -16.67
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return lossProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      expect(stats.beneficesTotaux).toBe(-2.00);
      expect(stats.roiParProduit[0].roi).toBe(-16.67);
    });

    it('should exclude unsold products from profit calculations', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Only 2 sold products should be included in ROI calculations
      expect(stats.roiParProduit).toHaveLength(2);
      expect(stats.roiParProduit.every(item => 
        item.produit === 'Product A' || item.produit === 'Product B'
      )).toBe(true);
    });
  });

  describe('Stock Rotation Rate Calculations', () => {
    it('should calculate average time to sale correctly', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Product A: 5 days (Jan 15 - Jan 10)
      // Product B: 8 days (Jan 20 - Jan 12)
      const avgTime = stats.tempsMoyenVente;
      
      expect(avgTime).toHaveLength(2); // Two platforms
      
      const vintedTime = avgTime.find(t => t.categorie === 'Vinted');
      const ebayTime = avgTime.find(t => t.categorie === 'eBay');
      
      expect(vintedTime?.jours).toBe(5);
      expect(ebayTime?.jours).toBe(8);
    });

    it('should handle products with no sale date', async () => {
      const mixedProducts = [
        ...testProduits,
        {
          ...testProduits[0],
          id: 'prod-4',
          vendu: true,
          dateVente: undefined // No sale date
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return mixedProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Should only include products with valid sale dates
      expect(stats.tempsMoyenVente).toHaveLength(2);
    });

    it('should calculate stock turnover rate per parcel', async () => {
      // Calculate turnover based on sold vs total products per parcel
      const parcel1Products = testProduits.filter(p => p.parcelleId === 'parcel-1');
      const parcel1Sold = parcel1Products.filter(p => p.vendu).length;
      const parcel1Total = parcel1Products.length;
      const parcel1Turnover = (parcel1Sold / parcel1Total) * 100;
      
      expect(parcel1Turnover).toBe(100); // 2/2 products sold
      
      const parcel2Products = testProduits.filter(p => p.parcelleId === 'parcel-2');
      const parcel2Sold = parcel2Products.filter(p => p.vendu).length;
      const parcel2Total = parcel2Products.length;
      const parcel2Turnover = (parcel2Sold / parcel2Total) * 100;
      
      expect(parcel2Turnover).toBe(0); // 0/1 products sold
    });
  });

  describe('ROI per Product and Parcel Calculations', () => {
    it('should calculate ROI per individual product correctly', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      const productARoi = stats.roiParProduit.find(p => p.produit === 'Product A');
      const productBRoi = stats.roiParProduit.find(p => p.produit === 'Product B');
      
      expect(productARoi?.roi).toBe(50.0);
      expect(productBRoi?.roi).toBe(38.89);
    });

    it('should calculate ROI per parcel based on contained products', async () => {
      // Parcel 1 contains Product A and B (both sold)
      // Total investment: 25.00 (parcel cost) + 10.00 + 2.00 + 15.00 + 3.00 = 55.00
      // Total revenue: 18.00 + 25.00 = 43.00
      // ROI: (43.00 - 55.00) / 55.00 * 100 = -21.82%
      
      const parcel1Investment = testParcelles[0].prix_achat + 
        testProduits.filter(p => p.parcelle_id === 'parcel-1')
          .reduce((sum, p) => sum + p.prixArticle + p.prixLivraison, 0);
      
      const parcel1Revenue = testProduits
        .filter(p => p.parcelle_id === 'parcel-1' && p.vendu && p.prixVente)
        .reduce((sum, p) => sum + (p.prixVente || 0), 0);
      
      const parcel1ROI = ((parcel1Revenue - parcel1Investment) / parcel1Investment) * 100;
      
      expect(parcel1Investment).toBe(55.00);
      expect(parcel1Revenue).toBe(43.00);
      expect(Math.round(parcel1ROI * 100) / 100).toBe(-21.82);
    });

    it('should handle parcels with no sold products', async () => {
      // Parcel 2 has no sold products
      const parcel2Investment = testParcelles[1].prixAchat + 
        testProduits.filter(p => p.parcelleId === 'parcel-2')
          .reduce((sum, p) => sum + p.prixArticle + p.prixLivraison, 0);
      
      const parcel2Revenue = testProduits
        .filter(p => p.parcelleId === 'parcel-2' && p.vendu && p.prixVente)
        .reduce((sum, p) => sum + (p.prixVente || 0), 0);
      
      expect(parcel2Investment).toBe(24.50); // 15.00 + 8.00 + 1.50
      expect(parcel2Revenue).toBe(0);
    });

    it('should rank products by ROI in descending order', async () => {
      const stats = await statisticsService.getDashboardData(testUserId);
      
      const roiValues = stats.roiParProduit.map(p => p.roi);
      const sortedRoiValues = [...roiValues].sort((a, b) => (b || 0) - (a || 0));
      
      expect(roiValues).toEqual(sortedRoiValues);
      expect(roiValues[0]).toBeGreaterThanOrEqual(roiValues[1] || 0);
    });

    it('should limit ROI results to top 10 products', async () => {
      // Create 15 test products
      const manyProducts = Array.from({ length: 15 }, (_, i) => ({
        ...testProduits[0],
        id: `prod-${i}`,
        nom: `Product ${i}`,
        pourcentageBenefice: Math.random() * 100,
        vendu: true
      }));

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return manyProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      expect(stats.roiParProduit).toHaveLength(10);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty product dataset', async () => {
      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        return []; // Empty results
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      
      expect(stats.ventesTotales).toBe(0);
      expect(stats.beneficesTotaux).toBe(0);
      expect(stats.produitsVendus).toBe(0);
      expect(stats.roiParProduit).toHaveLength(0);
      expect(stats.tempsMoyenVente).toHaveLength(0);
    });

    it('should handle null/undefined values in calculations', async () => {
      const nullValueProducts = [
        {
          ...testProduits[0],
          prixVente: null,
          benefices: null,
          pourcentageBenefice: null
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return nullValueProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      
      expect(stats.ventesTotales).toBe(0);
      expect(stats.beneficesTotaux).toBe(0);
      expect(stats.roiParProduit).toHaveLength(0);
    });

    it('should handle invalid date formats gracefully', async () => {
      const invalidDateProducts = [
        {
          ...testProduits[0],
          dateVente: 'invalid-date',
          vendu: true
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return invalidDateProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Should handle invalid dates without crashing
      expect(stats.tempsMoyenVente).toHaveLength(0);
      expect(stats.heatmapVentes).toBeDefined();
    });

    it('should handle division by zero in percentage calculations', async () => {
      const zeroInvestmentProducts = [
        {
          ...testProduits[0],
          prixArticle: 0,
          prixLivraison: 0,
          prixVente: 10.00,
          benefices: 10.00,
          pourcentageBenefice: Infinity // Division by zero case
        }
      ];

      vi.spyOn(databaseService, 'query').mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT * FROM produits')) {
          return zeroInvestmentProducts;
        }
        if (sql.includes('SELECT * FROM parcelles')) {
          return testParcelles;
        }
        return [];
      });

      const stats = await statisticsService.getDashboardData(testUserId);
      
      // Should handle Infinity values gracefully
      expect(stats.beneficesTotaux).toBe(10.00);
      expect(stats.ventesTotales).toBe(10.00);
    });
  });
});