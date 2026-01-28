/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
<<<<<<< HEAD
import { dashboardStatsService } from '@/lib/services/statistics/dashboard-stats.service';
import { productStatsService } from '@/lib/services/statistics/product-stats.service';
import { advancedStatsService } from '@/lib/services/statistics/advanced-stats.service';
=======
import { StatisticsService } from '@/lib/services/statistics-service';

// Mock databaseService
vi.mock('@/lib/database/database-service', () => {
    const mockFn = () => {
        return {
            queryOne: vi.fn(),
            query: vi.fn(),
            executeQuery: vi.fn(),
            executeWithConnection: vi.fn(),
        };
    };

    const mockInstance = mockFn();
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a

// Mock drizzle-orm
vi.mock('drizzle-orm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('drizzle-orm')>();
    return {
        ...actual,
        sql: vi.fn((strings, ...values) => ({ strings, values })),
        eq: vi.fn(),
        and: vi.fn(),
        gte: vi.fn(),
        lt: vi.fn(),
        desc: vi.fn(),
        asc: vi.fn(),
        count: vi.fn(),
    };
});

// Hoist mocks to ensure availability
const { mockDrizzleDb } = vi.hoisted(() => {
    const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([]), // Default to empty array to prevent map on undefined
        as: vi.fn().mockReturnThis(), // Added for subqueries
    };
    return { mockDrizzleDb: mockDb };
});

vi.mock('@/lib/database/database-service', () => {
    return {
        databaseService: {
            executeQuery: vi.fn(async (callback) => {
                return callback(mockDrizzleDb);
            }),
            executeWithConnection: vi.fn(async (callback) => {
                return callback(mockDrizzleDb);
            }),
        },
    };
});

// Mock schema
vi.mock('@/lib/database/schema', () => ({
    products: {
        id: 'products.id',
        userId: 'products.userId',
        vendu: 'products.vendu',
        sellingPrice: 'products.sellingPrice',
        price: 'products.price',
        coutLivraison: 'products.coutLivraison',
        createdAt: 'products.createdAt',
        soldAt: 'products.soldAt',
        listedAt: 'products.listedAt',
        plateforme: 'products.plateforme',
        parcelId: 'products.parcelleId',
        poids: 'products.poids',
        name: 'products.name',
        brand: 'products.brand',
        category: 'products.category',
        subcategory: 'products.subcategory',
        externalId: 'products.externalId',
    },
    parcels: {
        id: 'parcels.id',
        userId: 'parcels.userId',
<<<<<<< HEAD
        superbuyId: 'parcels.superbuyId',
        name: 'parcels.name',
        pricePerGram: 'parcels.pricePerGram',
        isActive: 'parcels.isActive',
        trackingNumber: 'parcels.trackingNumber',
        carrier: 'parcels.carrier',
        status: 'parcels.status',
        createdAt: 'parcels.createdAt',
    },
    users: { id: 'users.id' },
=======
        numero: 'parcels.numero',
        nom: 'parcels.nom',
        prixParGramme: 'parcels.prixParGramme',
        actif: 'parcels.actif',
    },
    users: {
        id: 'users.id',
        preferences: 'users.preferences',
    },
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
}));

vi.mock('@/lib/services/statistics/sql-formulas', () => ({
    sqlFormulas: {
        countVendus: 'countVendus',
        sumChiffreAffairesVendus: 'sumChiffreAffairesVendus',
        sumBeneficesVendus: 'sumBeneficesVendus',
        sumChiffreAffaires: 'sumChiffreAffaires',
        sumBenefices: 'sumBenefices',
        coutLivraison: 'coutLivraison',
        coutTotal: 'coutTotal',
        benefice: 'benefice',
    },
}));

<<<<<<< HEAD
vi.mock('@/lib/services/statistics/utils', () => ({
    calculateTrend: (curr: number, prev: number) => {
        if (!prev) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    },
    getDateRanges: () => ({
        startDate: new Date('2023-01-01'),
        previousStartDate: new Date('2022-12-01'),
        previousEndDate: new Date('2023-01-01'),
    }),
}));

describe('Statistics Services', () => {
    beforeEach(() => {
=======
    beforeEach(async () => {
        const { databaseService } = await import('@/lib/database/database-service');
        mockDb = databaseService;

        mockDb.queryOne.mockReset();
        mockDb.query.mockReset();
        mockDb.query.mockReset();
        mockDb.executeQuery.mockReset();
        mockDb.executeWithConnection.mockReset();

        statisticsService = new StatisticsService();
    });

    afterEach(() => {
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
        vi.clearAllMocks();
        // Reset chainable mocks return values (always return this for builder pattern)
        mockDrizzleDb.select.mockReturnThis();
        mockDrizzleDb.from.mockReturnThis();
        mockDrizzleDb.leftJoin.mockReturnThis();
        mockDrizzleDb.where.mockReturnThis();
        mockDrizzleDb.groupBy.mockReturnThis();
        mockDrizzleDb.orderBy.mockReturnThis();
        mockDrizzleDb.limit.mockReturnThis();
        mockDrizzleDb.having.mockReturnThis();
    });

    describe('DashboardStatsService', () => {
        it('should return correctly formatted dashboard stats', async () => {
            const userId = 'user-123';

            // Mock responses sequentially for getDashboardStats
            // 1. getVentesData
            mockDrizzleDb.get.mockReturnValueOnce({
                ventesTotales: 1000,
                beneficesTotaux: 400,
                produitsVendus: 50
            });
            // 2. colisData
            mockDrizzleDb.get.mockReturnValueOnce({ nombreColis: 5 });
            // 3. produitsTotal
            mockDrizzleDb.get.mockReturnValueOnce({ total: 100 });
            // 4. getPerformanceJournaliere (calls .all())
            mockDrizzleDb.all.mockReturnValueOnce([
                { date: '2023-01-01', ventes: 100, commandes: 5, benefices: 40 },
                { date: '2023-01-02', ventes: 150, commandes: 7, benefices: 60 }
            ]);
            // 5. getTopProduits (calls .all())
            mockDrizzleDb.all.mockReturnValueOnce([
                { nom: 'Produit A', ventesRevenue: 200, ventesCount: 10, benefices: 80, stock: 0 }
            ]);
            // 6. generateAlertes (calls .get() for stockFaible)
            mockDrizzleDb.get.mockReturnValueOnce({ count: 2 });
            // 7. generateAlertes (calls .get() for beneficesNegatifs)
            mockDrizzleDb.get.mockReturnValueOnce({ count: 0 });
            // 8. getStatsParcelles (calls .all())
            mockDrizzleDb.all.mockReturnValueOnce([
                {
                    parcelleId: 'p1', numero: '001', nom: 'Parcelle 1',
                    nbProduits: 10, nbVendus: 5, poidsTotal: 1000, coutTotal: 100,
                    chiffreAffaires: 200, benefices: 100
                }
            ]);
            // 9. getRotationStock (calls .get())
            mockDrizzleDb.get.mockReturnValueOnce({
                stockTotal: 50, stockEnLigne: 30, stockBrouillon: 20,
                valeurStockTotal: 500, valeurStockEnLigne: 300, ageStockMoyen: 15.5
            });

            const result = await dashboardStatsService.getDashboardStats(userId);

            expect(result.ventesTotales).toBe(1000);
            expect(result.beneficesTotaux).toBe(400);
            expect(result.produitsVendus).toBe(50);
            expect(result.nombreColis).toBe(5);
            expect(result.tauxConversion).toBe(50);
            expect(result.panierMoyen).toBe(20);
            expect(result.performanceJournaliere).toHaveLength(2);
            expect(result.alertes).toBeDefined();
        });
    });

    describe('ProductStatsService', () => {
        it('should return correctly formatted product stats', async () => {
            const userId = 'user-123';

            // 1. getGlobalStats
            mockDrizzleDb.get.mockReturnValueOnce({
                totalProduits: 100, produitsVendus: 60, produitsEnStock: 40,
                beneficesTotaux: 600, chiffreAffaires: 1200, valeurStock: 400,
                beneficeMoyen: 10, tempsVenteMoyen: 5.5
            });
            // 2. getTopCategories
            mockDrizzleDb.all.mockReturnValueOnce([
                { categorie: 'Vêtements', nombreProduits: 50, vendus: 30, benefices: 300, beneficeMoyen: 10, tauxVente: 60 }
            ]);
            // 3. getRentabiliteAnalysis
            mockDrizzleDb.all.mockReturnValueOnce([
                { trancheRentabilite: 'Bonne', nombreProduits: 20, beneficesTrancheSum: 200 }
            ]);
            // 4. getEvolutionVentes
            mockDrizzleDb.all.mockReturnValueOnce([
                { mois: '2023-01', ventesCount: 10, beneficesMois: 100, beneficeMoyen: 10, chiffreAffairesMois: 200 }
            ]);
            // 5. getTopProduitsRentables
            mockDrizzleDb.all.mockReturnValueOnce([
                { id: '1', nom: 'P1', categorie: 'C1', prixAchat: 10, prixVente: 30, benefices: 20, rentabilitePercent: 200, dateVente: '2023-01-01' }
            ]);
            // 6. getPriceAnalysis
            mockDrizzleDb.all.mockReturnValueOnce([
                { categorie: 'C1', prixMin: 10, prixMax: 50, prixMoyen: 30, nombreVentes: 5 }
            ]);

            const result = await productStatsService.getProductStats(userId);

<<<<<<< HEAD
=======
            // Act
            // Act
            const result = await statisticsService.getProductStats(userId) as any;

            // Assert
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
            expect(result.global.totalProduits).toBe(100);
            expect(result.insights.tauxVenteGlobal).toBe(60);
            expect(result.categories.top).toHaveLength(1);
        });
    });

    describe('AdvancedStatsService', () => {
        it('should return advanced stats', async () => {
            const userId = 'user-123';
            const params = { period: '30d', groupBy: 'day' };

<<<<<<< HEAD
            // 1. getVueEnsemble
            mockDrizzleDb.get.mockReturnValueOnce({
                totalProduits: 100, produitsVendus: 50, produitsEnLigne: 30, produitsStock: 20,
                chiffreAffaires: 1000, beneficesTotal: 500, prixMoyenVente: 20, prixMoyenAchat: 10
            });
            // 2. calculateTrends (prevResult)
            mockDrizzleDb.get.mockReturnValueOnce({
                produitsVendus: 40, chiffreAffaires: 800, beneficesTotal: 400,
                prixMoyenVente: 20, totalCount: 80
            });
            // 3. getEvolutionTemporelle
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 4. getPerformancePlateforme (totalVentes) -> .get()
            mockDrizzleDb.get.mockReturnValueOnce({ count: 50 });
            // 5. getPerformancePlateforme (list) -> .all()
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 6. getPerformanceParcel
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 7. getTopProduits
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 8. getFlopProduits
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 9. getDelaisVente
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 10. getProduitsNonVendus
            mockDrizzleDb.all.mockReturnValueOnce([]);
            // 11. getAnalyseCouts
            mockDrizzleDb.get.mockReturnValueOnce({
                coutAchatTotal: 200, coutLivraisonTotal: 50, coutTotalInvesti: 250,
                nbParcelles: 2, coutMoyenParProduit: 10, coutMoyenLivraison: 5
            });

            const result = await advancedStatsService.getAdvancedStats(userId, params as any);

            expect(result.vueEnsemble.chiffreAffaires).toBe(1000);
            expect(result.vueEnsemble.margeMoyenne).toBe(50);
            expect(result.vueEnsemble.trends).toBeDefined();
=======
            // Mock the Drizzle chain
            // This is a simplified mock that assumes the service returns whatever executeWithConnection returns
            // In reality, the service logic is INSIDE the callback passed to executeWithConnection
            // To test this properly, we'd need to invoke the callback with a mocked db object

            const mockDrizzleDb = {
                select: vi.fn().mockReturnThis(),
                from: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                leftJoin: vi.fn().mockReturnThis(),
                groupBy: vi.fn().mockReturnThis(),
                orderBy: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                get: vi.fn(),
                all: vi.fn(),
            };

            // Setup mock return values for the chain
            mockDrizzleDb.get
                .mockReturnValueOnce({ // vueEnsemble
                    totalProduits: 100,
                    produitsVendus: 50,
                    chiffreAffaires: 1000,
                    beneficesTotal: 500,
                    prixMoyenVente: 20,
                    prixMoyenAchat: 10
                })
                .mockReturnValueOnce({ // vueEnsemblePrevious (trends)
                    produitsVendus: 40,
                    chiffreAffaires: 800,
                    beneficesTotal: 400,
                    totalCount: 80
                })
                .mockReturnValueOnce(50) // totalVentes for partMarche
                .mockReturnValueOnce({ // analyseCouts
                    coutAchatTotal: 200,
                    coutLivraisonTotal: 50,
                    coutTotalInvesti: 250,
                    nbParcelles: 2
                })
                .mockReturnValueOnce({ preferences: JSON.stringify({ targets: { revenue: 5000 } }) }); // userProfile

            mockDrizzleDb.all
                .mockReturnValueOnce([]) // evolutionTemporelle
                .mockReturnValueOnce([]) // performancePlateforme
                .mockReturnValueOnce([]) // performanceParcelle
                .mockReturnValueOnce([]) // topProduits
                .mockReturnValueOnce([]) // flopProduits
                .mockReturnValueOnce([]) // delaisData
                .mockReturnValueOnce([]); // produitsNonVendus

            // Mock executeQuery to call the callback immediately with our mockDrizzleDb
            mockDb.executeQuery.mockImplementation(async (callback: any) => {
                return callback(mockDrizzleDb);
            });

            // Act
            // Act
            const result = await statisticsService.getAdvancedStats(userId, params as any);

            // Assert
            expect(mockDb.executeQuery).toHaveBeenCalled();

            // Verify calculations based on mocked data
            // Marge moyenne = (500 / 1000) * 100 = 50
            expect(result.vueEnsemble.margeMoyenne).toBe(50);

            // Trends: CA current 1000, prev 800 -> (200/800)*100 = 25%
            expect(result.vueEnsemble.trends.chiffreAffaires).toBe(25);

            // Targets are not currently supported in AdvancedStatsService
            // expect(result.targets.revenue).toBe(5000);
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
        });
    });
});
