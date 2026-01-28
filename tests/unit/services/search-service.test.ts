import { describe, it, expect, vi, beforeEach } from "vitest";
import { SearchService } from "@/lib/services/search-service";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { ParcelleRepository } from "@/lib/repositories/parcel-repository";
import { UserRepository } from "@/lib/repositories/user-repository";

// Mock dependencies
const mockProductRepository = {
    getBrandSuggestions: vi.fn(),
    getCategorySuggestions: vi.fn(),
    getProductSuggestions: vi.fn(),
    search: vi.fn(),
} as unknown as ProductRepository;

const mockParcelleRepository = {
    getTransporteurSuggestions: vi.fn(),
    findParcels: vi.fn(),
} as unknown as ParcelleRepository;

const mockUserRepository = {
    getUserSuggestions: vi.fn(),
} as unknown as UserRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("SearchService", () => {
    let searchService: SearchService;

    beforeEach(() => {
        vi.clearAllMocks();
        searchService = new SearchService(
            mockProductRepository,
            mockParcelleRepository,
            mockUserRepository
        );
    });

    describe("getBrandSuggestions", () => {
        it("should return brand suggestions", async () => {
            const suggestions = [{ brand: "Nike", count: 10 }];
            vi.mocked(mockProductRepository.getBrandSuggestions).mockResolvedValue(suggestions);

            const result = await searchService.getBrandSuggestions("Ni");

            expect(mockProductRepository.getBrandSuggestions).toHaveBeenCalledWith("Ni");
            expect(result).toEqual(suggestions);
        });
    });

    describe("globalSearch", () => {
        it("should return products and parcels", async () => {
            const products = [{ id: "p1", userId: VALID_USER_ID, name: "Product 1", createdAt: "2023-01-01" }];
            const parcels = [{ id: "pa1", userId: VALID_USER_ID, superbuyId: "123", transporteur: "DHL", createdAt: "2023-01-01" }];

            vi.mocked(mockProductRepository.search).mockResolvedValue(products as any);
            vi.mocked(mockParcelleRepository.findParcels).mockResolvedValue(parcels as any);

            const result = await searchService.globalSearch("query", VALID_USER_ID);

            expect(mockProductRepository.search).toHaveBeenCalledWith(expect.objectContaining({ name: "query", userId: VALID_USER_ID }));
            expect(mockParcelleRepository.findParcels).toHaveBeenCalledWith(expect.objectContaining({
                searchTerm: "query",
                userId: VALID_USER_ID,
                limit: 10
            }));
            expect(result.products).toHaveLength(1);
            expect(result.parcels).toHaveLength(1);
            expect(result.products[0].productName).toBe("Product 1");
            expect(result.parcels[0].numero).toBe("123");
        });

        it("should return empty results if userId is missing", async () => {
            const result = await searchService.globalSearch("query");
            expect(result.products).toEqual([]);
            expect(result.parcels).toEqual([]);
        });
    });

    describe("searchProducts", () => {
        it("should search products with criteria", async () => {
            const products = [{ id: "p1", userId: VALID_USER_ID, name: "Product 1", createdAt: "2023-01-01" }];
            vi.mocked(mockProductRepository.search).mockResolvedValue(products as any);

            const criteria = { userId: VALID_USER_ID, name: "Product" };
            const result = await searchService.searchProducts(criteria);

            expect(mockProductRepository.search).toHaveBeenCalledWith(expect.objectContaining({ name: "Product", userId: VALID_USER_ID }));
            expect(result).toHaveLength(1);
        });
    });
});
