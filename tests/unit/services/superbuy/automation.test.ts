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
