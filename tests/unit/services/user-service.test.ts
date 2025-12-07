import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "@/lib/services/user-service";
import { serviceContainer } from "@/lib/services/container";
import { UserRepository } from "@/lib/repositories/user-repository";
import { ProductRepository } from "@/lib/repositories/product-repository";
import { ParcelleRepository } from "@/lib/repositories/parcelle-repository";

// Mock dependencies
const mockUserRepository = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
    update: vi.fn(),
} as unknown as UserRepository;

const mockProductRepository = {
    count: vi.fn(),
} as unknown as ProductRepository;

const mockParcelleRepository = {
    count: vi.fn(),
} as unknown as ParcelleRepository;

// Mock serviceContainer
vi.mock("@/lib/services/container", () => ({
    serviceContainer: {
        getUserRepository: vi.fn(),
        getProductRepository: vi.fn(),
        getParcelleRepository: vi.fn(),
    },
}));

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("UserService", () => {
    let userService: UserService;

    beforeEach(() => {
        vi.clearAllMocks();
        userService = new UserService();

        vi.mocked(serviceContainer.getUserRepository).mockReturnValue(mockUserRepository);
        vi.mocked(serviceContainer.getProductRepository).mockReturnValue(mockProductRepository);
        vi.mocked(serviceContainer.getParcelleRepository).mockReturnValue(mockParcelleRepository);
    });

    describe("getProfile", () => {
        it("should return user profile with stats", async () => {
            const user = {
                id: VALID_USER_ID,
                username: "testuser",
                email: "test@example.com",
                createdAt: new Date("2023-01-01").toISOString(),
                updatedAt: new Date().toISOString(),
            };

            vi.mocked(mockUserRepository.findById).mockResolvedValue(user as any);
            vi.mocked(mockProductRepository.count).mockResolvedValue(10);
            vi.mocked(mockParcelleRepository.count).mockResolvedValue(5);

            const result = await userService.getProfile(VALID_USER_ID);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(VALID_USER_ID);
            expect(result.username).toBe("testuser");
            expect(result.stats.totalProducts).toBe(10);
            expect(result.stats.totalParcels).toBe(5);
            expect(result.stats.daysActive).toBeGreaterThan(0);
        });

        it("should throw error if user not found", async () => {
            vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

            // BaseService wraps errors, so we check for the generic message or specific cause if possible
            // In this case, we'll just check that it rejects, or check for the wrapped message
            await expect(userService.getProfile(VALID_USER_ID)).rejects.toThrow();
        });
    });

    describe("updateProfile", () => {
        it("should update user profile", async () => {
            const updateData = { bio: "New bio" };
            const updatedUser = {
                id: VALID_USER_ID,
                username: "testuser",
                bio: "New bio",
            };

            vi.mocked(mockUserRepository.updateProfile).mockResolvedValue(updatedUser as any);

            const result = await userService.updateProfile(VALID_USER_ID, updateData);

            expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(VALID_USER_ID, updateData);
            expect(result.bio).toBe("New bio");
        });
    });

    describe("getSettings", () => {
        it("should return user settings with defaults", async () => {
            const user = {
                id: VALID_USER_ID,
                theme: "dark",
                language: "en",
                preferences: JSON.stringify({ currency: "USD" }),
            };

            vi.mocked(mockUserRepository.findById).mockResolvedValue(user as any);

            const result = await userService.getSettings(VALID_USER_ID);

            expect(result.theme).toBe("dark");
            expect(result.language).toBe("en");
            expect(result.preferences.currency).toBe("USD");
            expect(result.preferences.weightUnit).toBe("g"); // Default
        });
    });

    describe("updateSettings", () => {
        it("should update user settings", async () => {
            const user = {
                id: VALID_USER_ID,
                preferences: JSON.stringify({ currency: "EUR" }),
            };
            vi.mocked(mockUserRepository.findById).mockResolvedValue(user as any);

            const updateData = {
                theme: "light",
                preferences: { currency: "USD" },
            };

            await userService.updateSettings(VALID_USER_ID, updateData);

            expect(mockUserRepository.update).toHaveBeenCalledWith(VALID_USER_ID, expect.objectContaining({
                theme: "light",
                preferences: expect.stringContaining('"currency":"USD"'),
            }));
        });
    });
});
