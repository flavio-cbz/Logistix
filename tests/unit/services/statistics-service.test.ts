/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

    return {
        databaseService: mockInstance,
        DatabaseService: class {
            static getInstance() {
                return mockInstance;
            }
        },
    };
});

// Mock schema to avoid actual DB dependency
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
        parcelleId: 'products.parcelleId',
        poids: 'products.poids',
        name: 'products.name',
    },
    parcelles: {
        id: 'parcelles.id',
        userId: 'parcelles.userId',
        numero: 'parcelles.numero',
        nom: 'parcelles.nom',
        prixParGramme: 'parcelles.prixParGramme',
        actif: 'parcelles.actif',
    },
    users: {
        id: 'users.id',
        preferences: 'users.preferences',
    }
}));

describe('StatisticsService', () => {
    let statisticsService: StatisticsService;
    let mockDb: any;

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
        vi.clearAllMocks();
    });

    describe('getDashboardStats', () => {
        it('should return correctly formatted dashboard stats', async () => {
            // Arrange
            const userId = 'user-123';

            // Mock responses for the sequential queries in getDashboardStats
            mockDb.queryOne
                .mockResolvedValueOnce({ // get-ventes-totales
                    ventesTotales: 1000,
                    beneficesTotaux: 400,
                    produitsVendus: 50
                })
                .mockResolvedValueOnce({ // get-nombre-colis
                    nombreColis: 5
                })
                .mockResolvedValueOnce({ // get-produits-total
                    total: 100
                })
                .mockResolvedValueOnce({ // get-stock-faible
                    count: 2
                })
                .mockResolvedValueOnce({ // get-benefices-negatifs
                    count: 0
                })
                .mockResolvedValueOnce({ // get-rotation-stock
                    stockTotal: 50,
                    stockEnLigne: 30,
                    stockBrouillon: 20,
                    valeurStockTotal: 500,
                    valeurStockEnLigne: 300,
                    ageStockMoyen: 15.5
                });

            mockDb.query
                .mockResolvedValueOnce([ // get-performance-journaliere
                    { date: '2023-01-01', ventes: 100, commandes: 5, benefices: 40 },
                    { date: '2023-01-02', ventes: 150, commandes: 7, benefices: 60 }
                ])
                .mockResolvedValueOnce([ // get-top-produits
                    { nom: 'Produit A', ventesRevenue: 200, ventesCount: 10, benefices: 80, stock: 0 }
                ])
                .mockResolvedValueOnce([ // get-stats-parcelles
                    {
                        parcelleId: 'p1',
                        numero: '001',
                        nom: 'Parcelle 1',
                        nbProduits: 10,
                        nbVendus: 5,
                        poidsTotal: 1000,
                        coutTotal: 100,
                        chiffreAffaires: 200,
                        benefices: 100
                    }
                ]);

            // Act
            const result = await statisticsService.getDashboardStats(userId);

            // Assert
            expect(result.ventesTotales).toBe(1000);
            expect(result.beneficesTotaux).toBe(400);
            expect(result.produitsVendus).toBe(50);
            expect(result.nombreColis).toBe(5);
            expect(result.tauxConversion).toBe(50); // 50/100 * 100
            expect(result.panierMoyen).toBe(20); // 1000/50

            expect(result.performanceJournaliere).toHaveLength(2);
            expect(result.topProduits).toHaveLength(1);
            expect(result.statsParcelles).toHaveLength(1);
            expect(result.statsParcelles[0].ROI).toBe(100); // 100/100 * 100

            expect(result.rotationStock?.stockTotal).toBe(50);
        });
    });

    describe('getProductStats', () => {
        it('should return correctly formatted product stats', async () => {
            // Arrange
            const userId = 'user-123';

            mockDb.queryOne.mockResolvedValueOnce({ // get-produits-global-stats
                totalProduits: 100,
                produitsVendus: 60,
                produitsEnStock: 40,
                beneficesTotaux: 600,
                chiffreAffaires: 1200,
                valeurStock: 400,
                beneficeMoyen: 10,
                tempsVenteMoyen: 5.5
            });

            mockDb.query
                .mockResolvedValueOnce([ // get-top-categories-produits
                    { categorie: 'Vêtements', nombreProduits: 50, vendus: 30, benefices: 300, beneficeMoyen: 10, tauxVente: 60 }
                ])
                .mockResolvedValueOnce([ // get-rentabilite-analysis
                    { trancheRentabilite: 'Bonne', nombreProduits: 20, beneficesTrancheSum: 200 }
                ])
                .mockResolvedValueOnce([ // get-evolution-ventes
                    { mois: '2023-01', ventesCount: 10, beneficesMois: 100, beneficeMoyen: 10, chiffreAffairesMois: 200 }
                ])
                .mockResolvedValueOnce([ // get-top-produits-rentables
                    { id: '1', nom: 'P1', categorie: 'C1', prixAchat: 10, prixVente: 30, benefices: 20, rentabilitePercent: 200, dateVente: '2023-01-01' }
                ])
                .mockResolvedValueOnce([ // get-price-analysis
                    { categorie: 'C1', prixMin: 10, prixMax: 50, prixMoyen: 30, nombreVentes: 5 }
                ]);

            // Act
            // Act
            const result = await statisticsService.getProductStats(userId) as any;

            // Assert
            expect(result.global.totalProduits).toBe(100);
            expect(result.insights.tauxVenteGlobal).toBe(60); // 60/100 * 100
            expect(result.insights.rentabiliteMoyenne).toBe(50); // 600/1200 * 100
            expect(result.categories.top).toHaveLength(1);
            expect(result.categories.top[0].categorie).toBe('Vêtements');
        });
    });

    describe('getAdvancedStats', () => {
        it('should execute with connection and transform results', async () => {
            // Arrange
            const userId = 'user-123';
            const params = { period: '30d', groupBy: 'day' };

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

            expect(result.targets.revenue).toBe(5000); // From user preferences
        });
    });
});
