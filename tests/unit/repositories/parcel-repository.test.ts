/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { createMockDatabaseService, setupInMemoryDatabase, cleanupInMemoryDatabase } from '../../setup/database-mocks';
import { users, parcels, products } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

describe('ParcelRepository Integration', () => {
    let parcelRepository: ParcelRepository;
    let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
    let db: any;
    let sqlite: any;

    beforeEach(async () => {
        // Setup in-memory database
        const setup = await setupInMemoryDatabase();
        db = setup.db;
        sqlite = setup.sqlite;

        // Create a mock database service that delegates to the in-memory DB
        mockDatabaseService = createMockDatabaseService();
        mockDatabaseService.executeQuery.mockImplementation(async (callback) => {
            return callback(db);
        });
        mockDatabaseService.executeTransaction.mockImplementation(async (callback) => {
            return db.transaction(callback);
        });

        parcelRepository = new ParcelRepository(mockDatabaseService as any);
    });

    afterEach(() => {
        cleanupInMemoryDatabase(sqlite);
        vi.clearAllMocks();
    });

    // Helpers to seed data
    const seedUser = async (overrides = {}) => {
        const defaultUser = {
            id: 'user-1',
            username: 'testuser',
            passwordHash: 'hash',
            email: 'test@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const userToInsert = { ...defaultUser, ...overrides };
        await db.insert(users).values(userToInsert).run();
        return userToInsert;
    };

    const seedParcel = async (overrides = {}) => {
        const defaultParcel = {
            id: 'parcel-1',
            userId: 'user-1',
            superbuyId: 'PN123456789',
            name: 'Test Parcel',
            trackingNumber: 'TR123',
            weight: 1000,
            status: 'Pending',
            carrier: 'EMS',
            totalPrice: 100,
            pricePerGram: 0.1,
            isActive: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const parcelToInsert = { ...defaultParcel, ...overrides };
        await db.insert(parcels).values(parcelToInsert).run();
        return parcelToInsert;
    };

    const seedProduct = async (overrides = {}) => {
        const defaultProduct = {
            id: 'prod-1',
            userId: 'user-1',
            parcelId: 'parcel-1',
            name: 'Test Product',
            price: 50,
            weight: 500,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const productToInsert = { ...defaultProduct, ...overrides };
        await db.insert(products).values(productToInsert).run();
        return productToInsert;
    };

    describe('findByUserId', () => {
        it('should find active parcels by user ID', async () => {
            await seedUser();
            await seedUser({ id: 'user-2', username: 'otheruser', email: 'other@example.com' });
            await seedParcel({ id: 'p1', userId: 'user-1', isActive: 1 });
            await seedParcel({ id: 'p2', userId: 'user-1', isActive: 0 }); // Inactive
            await seedParcel({ id: 'p3', userId: 'user-2', isActive: 1 }); // Other user

            const result = await parcelRepository.findByUserId('user-1');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('p1');
        });
    });

    describe('findByIdAndUserId', () => {
        it('should find parcel by ID and user ID if active', async () => {
            await seedUser();
            await seedParcel({ id: 'p1', userId: 'user-1', isActive: 1 });

            const result = await parcelRepository.findByIdAndUserId('p1', 'user-1');
            expect(result).toBeDefined();
            expect(result?.id).toBe('p1');
        });

        it('should return null if parcel belongs to another user', async () => {
            await seedUser();
            await seedUser({ id: 'user-2', username: 'other', email: 'other@example.com' });
            await seedParcel({ id: 'p1', userId: 'user-2' });

            const result = await parcelRepository.findByIdAndUserId('p1', 'user-1');
            expect(result).toBeNull();
        });
    });

    describe('findBySuperbuyId', () => {
        it('should find parcel by superbuyId', async () => {
            await seedUser();
            await seedParcel({ superbuyId: 'PN123' });

            const result = await parcelRepository.findBySuperbuyId('PN123');
            expect(result).toBeDefined();
            expect(result?.superbuyId).toBe('PN123');
        });
    });

    describe('findParcels', () => {
        it('should filter by price range', async () => {
            await seedUser();
            await seedParcel({ id: 'p1', totalPrice: 50 });
            await seedParcel({ id: 'p2', totalPrice: 150 });
            await seedParcel({ id: 'p3', totalPrice: 250 });

            const result = await parcelRepository.findParcels({ totalPriceMin: 100, totalPriceMax: 200 });
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('p2');
        });

        it('should filter by carrier', async () => {
            await seedUser();
            await seedParcel({ id: 'p1', carrier: 'DHL' });
            await seedParcel({ id: 'p2', carrier: 'EMS' });

            const result = await parcelRepository.findParcels({ carrier: 'EMS' });
            expect(result).toHaveLength(1);
            expect(result[0].carrier).toBe('EMS');
        });

        it('should filter by search term', async () => {
            await seedUser();
            await seedParcel({ id: 'p1', name: 'Special Gift' });
            await seedParcel({ id: 'p2', name: 'Normal Box' });

            const result = await parcelRepository.findParcels({ searchTerm: 'Special' });
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Special Gift');
        });
    });

    describe('getParcelStats', () => {
        it('should calculate parcel statistics correctly', async () => {
            await seedUser();
            // Parcel 1: 1000g, 100€, EMS
            await seedParcel({ id: 'p1', weight: 1000, totalPrice: 100, pricePerGram: 0.1, carrier: 'EMS' });
            // Parcel 2: 2000g, 300€, DHL
            await seedParcel({ id: 'p2', weight: 2000, totalPrice: 300, pricePerGram: 0.15, carrier: 'DHL' });

            const stats = await parcelRepository.getParcelStats('user-1');

            expect(stats.totalParcels).toBe(2);
            expect(stats.totalWeight).toBe(3000);
            expect(stats.totalPrice).toBe(400);

            // Avg price per gram: (0.1*1000 + 0.15*2000) / 3000 = (100 + 300) / 3000 = 400 / 3000 = 0.1333...
            expect(stats.averagePricePerGram).toBeCloseTo(0.1333, 4);

            expect(stats.byCarrier['EMS'].count).toBe(1);
            expect(stats.byCarrier['DHL'].count).toBe(1);
        });
    });

    describe('updatePricePerGram', () => {
        it('should calculate and update price per gram', async () => {
            await seedUser();
            // Parcel with 2000g and 100€ -> 0.05 per gram
            await seedParcel({ id: 'p1', weight: 2000, totalPrice: 100, pricePerGram: 0 });

            const result = await parcelRepository.updatePricePerGram('p1');
            expect(result?.pricePerGram).toBe(0.05);

            // Verify DB update
            const updated = await db.select().from(parcels).where(eq(parcels.id, 'p1')).get();
            expect(updated.pricePerGram).toBe(0.05);
        });
    });

    describe('findParcelsWithProducts', () => {
        it('should return parcels with product counts', async () => {
            await seedUser();
            await seedParcel({ id: 'p1' });
            await seedProduct({ id: 'prod1', parcelId: 'p1', price: 10 });
            await seedProduct({ id: 'prod2', parcelId: 'p1', price: 20 });

            const result = await parcelRepository.findParcelsWithProducts('user-1');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('p1');
            expect(result[0].productCount).toBe(2);
            expect(result[0].totalProductValue).toBe(30);
        });
    });

    describe('updateWithCalculation', () => {
        it('should auto-calculate price per gram when weight changes', async () => {
            await seedUser();
            // Initial: 1000g, 100€ -> 0.1
            await seedParcel({ id: 'p1', weight: 1000, totalPrice: 100, pricePerGram: 0.1 });

            // Update weight to 2000g (should become 0.05)
            const result = await parcelRepository.updateWithCalculation('p1', { weight: 2000 });

            expect(result?.weight).toBe(2000);
            expect(result?.pricePerGram).toBe(0.05);
        });
    });

    describe('deleteWithProducts', () => {
        it('should delete parcel and unlink products', async () => {
            await seedUser();
            await seedParcel({ id: 'p1' });
            await seedProduct({ id: 'prod1', parcelId: 'p1' });

            const result = await parcelRepository.deleteWithProducts('p1');
            expect(result).toBe(true);

            // Verify parcel is gone
            const parcel = await db.select().from(parcels).where(eq(parcels.id, 'p1')).get();
            expect(parcel).toBeUndefined();

            // Verify product is unlinked
            const product = await db.select().from(products).where(eq(products.id, 'prod1')).get();
            expect(product.parcelId).toBeNull();
        });
    });
});
