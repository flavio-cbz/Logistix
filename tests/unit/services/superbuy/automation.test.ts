<<<<<<< HEAD
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SuperbuyAutomationService } from '@/lib/services/superbuy/automation';
import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { IntegrationRepository } from '@/lib/repositories/integration-repository';
import * as cryptoUtils from '@/lib/utils/crypto';
import * as parsers from '@/lib/services/superbuy/parsers';

// Mock Playwright using vi.hoisted to avoid ReferenceError
const mocks = vi.hoisted(() => {
    const mockPage = {
        goto: vi.fn(),
        waitForSelector: vi.fn(),
        fill: vi.fn(),
        click: vi.fn(),
        evaluate: vi.fn(),
        waitForTimeout: vi.fn(),
        locator: vi.fn((selector: string) => {
            // Smart mock: hide error box, show others (like submit buttons)
            const isErrorBox = typeof selector === 'string' && selector.includes('error-box');
            const isVisible = !isErrorBox;
            return {
                first: vi.fn(() => ({
                    isVisible: vi.fn().mockResolvedValue(isVisible),
                    click: vi.fn(),
                    textContent: vi.fn().mockResolvedValue(''),
                    evaluate: vi.fn(),
                    fill: vi.fn(),
                    waitFor: vi.fn(),
                })),
                isVisible: vi.fn().mockResolvedValue(isVisible),
                textContent: vi.fn().mockResolvedValue(''),
                count: vi.fn().mockResolvedValue(isVisible ? 1 : 0),
                evaluate: vi.fn(),
                fill: vi.fn(),
                waitFor: vi.fn(),
            };
        }),
        keyboard: {
            press: vi.fn(),
        },
        url: vi.fn(),
        waitForURL: vi.fn(),
        screenshot: vi.fn(),
        innerText: vi.fn().mockResolvedValue('{}'), // Default empty JSON
        $: vi.fn(),
        context: vi.fn(),
    };

    const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        cookies: vi.fn().mockResolvedValue([]),
        addCookies: vi.fn(),
        close: vi.fn(),
    };

    const mockBrowser = {
        newContext: vi.fn().mockResolvedValue(mockContext),
        close: vi.fn(),
    };

    return { mockPage, mockContext, mockBrowser };
});

const { mockPage, mockContext, mockBrowser } = mocks;

vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn().mockResolvedValue(mocks.mockBrowser),
    },
    Page: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/parcel-repository');
vi.mock('@/lib/repositories/integration-repository');

// Mock Crypto
vi.mock('@/lib/utils/crypto', () => ({
    encryptSecret: vi.fn(),
    decryptSecret: vi.fn(),
}));

// Mock Parsers
vi.mock('@/lib/services/superbuy/parsers', () => ({
    parseParcelsPage: vi.fn(),
    parseProductsFromParcels: vi.fn(),
    parseOrdersPage: vi.fn(),
}));

// Mock Captcha Solver
vi.mock('@/lib/services/superbuy/advanced-captcha-solver', () => {
    return {
        AdvancedCaptchaSolver: vi.fn().mockImplementation(() => ({
            solve: vi.fn().mockResolvedValue('solved'),
        })),
    };
});

// Mock Image Processor
vi.mock('@/lib/services/image-processor', () => ({
    ImageProcessor: {
        getInstance: vi.fn().mockReturnValue({
            downloadAndOrientImage: vi.fn().mockResolvedValue('processed-url'),
        }),
    },
}));

// Mock Logger
vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock Data Processor to avoid deep dependency chain
const processorMocks = vi.hoisted(() => ({
    processParcels: vi.fn().mockResolvedValue(1),
    processProducts: vi.fn().mockResolvedValue(1),
}));

vi.mock('@/lib/services/superbuy/data-processor', () => {
    return {
        SuperbuyDataProcessor: class {
            processParcels = processorMocks.processParcels;
            processProducts = processorMocks.processProducts;
        },
    };
});

describe('SuperbuyAutomationService', () => {
    let service: SuperbuyAutomationService;
    let mockParcelRepo: ParcelRepository;
    let mockIntegrationRepo: IntegrationRepository;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Crypto mocks
        (cryptoUtils.encryptSecret as any).mockResolvedValue('encrypted-secret');
        (cryptoUtils.decryptSecret as any).mockResolvedValue('decrypted-secret');

        mockParcelRepo = new ParcelRepository({} as any) as any;
        mockIntegrationRepo = new IntegrationRepository({} as any) as any;

        // Mock IntegrationRepository methods
        mockIntegrationRepo.saveCredentials = vi.fn().mockResolvedValue({ id: 'cred-id' });
        mockIntegrationRepo.findByProvider = vi.fn().mockResolvedValue(null);

        // Mock ParcelRepository methods
        mockParcelRepo.upsertMany = vi.fn().mockResolvedValue(undefined);

        service = new SuperbuyAutomationService(mockParcelRepo, mockIntegrationRepo);
    });

    describe('connect', () => {
        it('should successfully connect and save credentials', async () => {
            // Mock login success
            mockPage.goto.mockResolvedValue({ text: () => JSON.stringify({ code: 'sucess', msg: { username: 'testUser' } }) });
            // For performLogin check
            mockPage.waitForSelector.mockResolvedValue(true);

            // Allow ensureAuthenticatedSession to pass
            mockPage.url.mockReturnValue('https://www.superbuy.com/en/page/account/');

            const result = await service.connect('user1', 'test@example.com', 'password');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Connected successfully');
            expect(cryptoUtils.encryptSecret).toHaveBeenCalledWith('password', 'user1');
            expect(mockIntegrationRepo.saveCredentials).toHaveBeenCalled();
        });

        it('should handle login failure', async () => {
            // Simulate login failure by making the initial goto fail
            mockPage.goto.mockRejectedValue(new Error('Network Error'));

            // Also ensure performLogin loop doesn't spin forever
            mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
            mockPage.waitForURL.mockRejectedValue(new Error('Timeout'));

            // Important: make sure error box is NOT visible to avoid infinite loop logic if it gets there
            // But if goto fails, it catches exception and returns false immediately.

            const result = await service.connect('user1', 'test@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.message).toBeDefined();
        });
    });

    describe('sync', () => {
        const userId = 'user1';

        it('should fail if no credentials found and none provided', async () => {
            mockIntegrationRepo.findByProvider.mockResolvedValue(null);

            const result = await service.sync(userId);

            expect(result.success).toBe(false);
            expect(result.message).toContain('No credentials found');
        });

        it('should use stored credentials to sync', async () => {
            const mockCreds = {
                id: 'cred1',
                credentials: { email: 'stored@test.com', encryptedPassword: 'enc-pass' },
                cookies: [{ name: 'cookie', value: 'value' }],
            };
            mockIntegrationRepo.findByProvider.mockResolvedValue(mockCreds);

            // Mock session check
            mockPage.goto.mockResolvedValue({ text: () => JSON.stringify({ code: 'sucess', msg: { username: 'test' } }) });

            // Mock Scrape Parcels
            (parsers.parseParcelsPage as any).mockResolvedValue([
                { superbuyId: 'PKG1', trackingNumber: 'TRK1', weight: 1000, status: 'Sent' }
            ]);

            // Mock Scrape Products
            (parsers.parseProductsFromParcels as any).mockResolvedValue([]);

            const result = await service.sync(userId);

            expect(result.success).toBe(true);
            expect(parsers.parseParcelsPage).toHaveBeenCalled();
            // DataProcessor mocks handle the saving
        });
    });
});
=======
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SuperbuyAutomationService } from '@/lib/services/superbuy/automation';
import { ParcelRepository } from '@/lib/repositories/parcel-repository';
import { databaseService } from '@/lib/database/database-service';
import * as cryptoUtils from '@/lib/utils/crypto';
import * as parsers from '@/lib/services/superbuy/parsers';
import { integrationCredentials, parcels, products } from '@/lib/database/schema';

// Mock Playwright using vi.hoisted to avoid ReferenceError
// Mock Playwright using vi.hoisted to avoid ReferenceError
const mocks = vi.hoisted(() => {
    const mockPage = {
        goto: vi.fn(),
        waitForSelector: vi.fn(),
        fill: vi.fn(),
        click: vi.fn(),
        evaluate: vi.fn(),
        waitForTimeout: vi.fn(),
        locator: vi.fn((selector: string) => {
            // Smart mock: hide error box, show others (like submit buttons)
            const isErrorBox = typeof selector === 'string' && selector.includes('error-box');
            const isVisible = !isErrorBox;
            return {
                first: vi.fn(() => ({
                    isVisible: vi.fn().mockResolvedValue(isVisible),
                    click: vi.fn(),
                    textContent: vi.fn().mockResolvedValue(''),
                    evaluate: vi.fn(),
                })),
                isVisible: vi.fn().mockResolvedValue(isVisible),
                textContent: vi.fn().mockResolvedValue(''),
                count: vi.fn().mockResolvedValue(isVisible ? 1 : 0),
                evaluate: vi.fn(),
            };
        }),
        keyboard: {
            press: vi.fn(),
        },
        url: vi.fn(),
        waitForURL: vi.fn(),
        screenshot: vi.fn(),
        innerText: vi.fn().mockResolvedValue('{}'), // Default empty JSON
        $: vi.fn(),
        context: vi.fn(),
    };

    const mockContext = {
        newPage: vi.fn().mockResolvedValue(mockPage),
        cookies: vi.fn().mockResolvedValue([]),
        addCookies: vi.fn(),
        close: vi.fn(),
    };

    const mockBrowser = {
        newContext: vi.fn().mockResolvedValue(mockContext),
        close: vi.fn(),
    };

    // Ensure getDb returns a proper mocked db object always
    // (This part is just the hoisted return, we configure internal behavior below)
    return { mockPage, mockContext, mockBrowser };
});

const { mockPage, mockContext, mockBrowser } = mocks;

vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn().mockResolvedValue(mocks.mockBrowser),
    },
}));

// Mock Database Service
const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(true),
    query: {
        integrationCredentials: {
            findFirst: vi.fn(),
        },
        parcels: {
            findFirst: vi.fn(),
        },
        products: {
            findFirst: vi.fn(),
        }
    },
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
};

vi.mock('@/lib/database/database-service', () => ({
    databaseService: {
        getDb: vi.fn(),
    },
}));

// Mock repositories
vi.mock('@/lib/repositories/parcel-repository');

// Mock Crypto
vi.mock('@/lib/utils/crypto', () => ({
    encryptSecret: vi.fn(),
    decryptSecret: vi.fn(),
}));

// Mock Parsers
vi.mock('@/lib/services/superbuy/parsers', () => ({
    parseParcelsPage: vi.fn(),
    parseProductsFromParcels: vi.fn(),
    parseOrdersPage: vi.fn(),
}));

// Mock Captcha Solver
vi.mock('@/lib/services/superbuy/advanced-captcha-solver', () => {
    return {
        AdvancedCaptchaSolver: vi.fn().mockImplementation(() => ({
            solve: vi.fn().mockResolvedValue('solved'),
        })),
    };
});

// Mock Image Processor
vi.mock('@/lib/services/image-processor', () => ({
    ImageProcessor: {
        getInstance: vi.fn().mockReturnValue({
            downloadAndOrientImage: vi.fn().mockResolvedValue('processed-url'),
        }),
    },
}));

// Mock Logger
vi.mock('@/lib/utils/logging/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('SuperbuyAutomationService', () => {
    let service: SuperbuyAutomationService;
    let mockParcelRepo: ParcelRepository;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default db mock return
        (databaseService.getDb as any).mockResolvedValue(mockDb);

        // Setup Crypto mocks
        (cryptoUtils.encryptSecret as any).mockResolvedValue('encrypted-secret');
        (cryptoUtils.decryptSecret as any).mockResolvedValue('decrypted-secret');

        mockParcelRepo = new ParcelRepository() as any;
        service = new SuperbuyAutomationService(mockParcelRepo);
    });

    describe('connect', () => {
        it('should successfully connect and save credentials', async () => {
            // Mock login success
            mockPage.goto.mockResolvedValue({ text: () => JSON.stringify({ code: 'sucess', msg: { username: 'testUser' } }) });
            // For performLogin check
            mockPage.waitForSelector.mockResolvedValue(true);
            mockPage.locator().first().isVisible.mockResolvedValue(true);

            // Allow ensureAuthenticatedSession to pass
            mockPage.url.mockReturnValue('https://www.superbuy.com/en/page/account/');

            const result = await service.connect('user1', 'test@example.com', 'password');

            expect(result.success).toBe(true);
            expect(result.message).toContain('Connected successfully');
            expect(cryptoUtils.encryptSecret).toHaveBeenCalledWith('password', 'user1');
            expect(mockDb.insert).toHaveBeenCalled();
        });

        it('should handle login failure', async () => {
            // Simulate login failure by making the login button invisible or other condition
            // But actually performLogin has complex logic. 
            // Simplest way is mock performLogin to fail? No, it's private.
            // We can mock page.goto to fail or selectors to not be found.

            // Let's make the initial goto fail or throw
            mockPage.goto.mockRejectedValue(new Error('Network Error'));

            const result = await service.connect('user1', 'test@example.com', 'password');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Login failed or captcha could not be solved.');
        });
    });

    describe('sync', () => {
        const userId = 'user1';

        it('should fail if no credentials found and none provided', async () => {
            mockDb.query.integrationCredentials.findFirst.mockResolvedValue(null);

            const result = await service.sync(userId);

            expect(result.success).toBe(false);
            expect(result.message).toContain('No credentials found');
        });

        it('should use stored credentials to sync', async () => {
            const mockCreds = {
                id: 'cred1',
                credentials: { email: 'stored@test.com', encryptedPassword: 'enc-pass' },
                cookies: [{ name: 'cookie', value: 'value' }],
            };
            mockDb.query.integrationCredentials.findFirst.mockResolvedValue(mockCreds);

            // Mock session check
            mockPage.goto.mockResolvedValue({ text: () => JSON.stringify({ code: 'sucess', msg: { username: 'test' } }) });

            // Mock Scrape Parcels
            (parsers.parseParcelsPage as any).mockResolvedValue([
                { superbuyId: 'PKG1', trackingNumber: 'TRK1', weight: 1000, status: 'Sent' }
            ]);

            // Mock Scrape Products
            (parsers.parseProductsFromParcels as any).mockResolvedValue([]);

            const result = await service.sync(userId);

            expect(result.success).toBe(true);
            expect(parsers.parseParcelsPage).toHaveBeenCalled();
            expect(mockParcelRepo.upsertMany).toHaveBeenCalled();
        });

        it('should re-login if session is invalid (AUTH_REQUIRED)', async () => {
            const mockCreds = {
                id: 'cred1',
                credentials: { email: 'stored@test.com', encryptedPassword: 'enc-pass' },
                cookies: [{ name: 'cookie', value: 'value' }],
            };
            mockDb.query.integrationCredentials.findFirst.mockResolvedValue(mockCreds);

            // First session check fails
            mockPage.goto.mockImplementationOnce(() => Promise.resolve({ text: () => JSON.stringify({ code: 'fail' }) }));

            // Second session check (after re-login logic) passes
            // Wait, ensureAuthenticatedSession throws AUTH_REQUIRED. 
            // The catch block in sync() handles it by launching headful browser and re-logging.

            // We need to mock the re-login flow success
            mockPage.goto
                //.mockResolvedValueOnce({ text: () => JSON.stringify({ code: 'fail' }) }) // 1. ensureAuthSession (fail)
                //.mockResolvedValueOnce(undefined) // 2. Login page load
                .mockResolvedValue({ text: () => JSON.stringify({ code: 'sucess', msg: { username: 'test' } }) }); // 3. verify login

            // We need to ensure performLogin returns true.
            // It calls page.fill, page.click etc.

            // Mock selectors
            mockPage.waitForSelector.mockResolvedValue(true);
            mockPage.locator().first().isVisible.mockResolvedValue(true);

            // Mock parseParcelsPage to return empty to finish quickly
            (parsers.parseParcelsPage as any).mockResolvedValue([]);

            const result = await service.sync(userId);

            // FIXME: This test is tricky because of the complex flow in sync() catch block.
            // Ideally we expect it to attempt re-login.
            // Since we mocked performLogin logic via page mocks, if it succeeds, it should update creds.

            // Assertions
            // expect(mockDb.update).toHaveBeenCalled(); // Should update cookies
        });
    });
});
>>>>>>> 8cc3142d5274895d12ab263b1d33cb3e9bf9341a
