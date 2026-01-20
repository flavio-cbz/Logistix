import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParcelleService } from "@/lib/services/parcelle-service";
import { ParcelleRepository } from "@/lib/repositories/parcel-repository";
import { Parcelle } from "@/lib/database/schema";

// Mock databaseService for transactions
vi.mock("@/lib/database/database-service", () => ({
  databaseService: {
    executeTransaction: vi.fn((callback) => callback()),
  },
}));

// Mock dependencies
const mockParcelleRepository = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  findByUserId: vi.fn(),
  findByNumero: vi.fn(),
  numeroExists: vi.fn(),
  superbuyIdExists: vi.fn(),
  updatePrixParGramme: vi.fn(),
  updateWithCalculation: vi.fn(),
  getParcelStats: vi.fn(),
  getUserTransporteurs: vi.fn(),
  findParcellesWithProducts: vi.fn(),
  countProductsByParcelId: vi.fn(),
  deleteWithProducts: vi.fn(),
  getUserCarriers: vi.fn(),
  findBySuperbuyId: vi.fn(),
  findByCarrier: vi.fn(),
} as unknown as ParcelleRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PARCELLE_ID = "123e4567-e89b-12d3-a456-426614174001";

describe("ParcelleService", () => {
  let parcelleService: ParcelleService;

  beforeEach(() => {
    vi.clearAllMocks();
    parcelleService = new ParcelleService(mockParcelleRepository);
  });

  describe("createParcelle", () => {
    it("should create a parcelle successfully", async () => {
      const input = {
        superbuyId: "SB-123",
        carrier: "DHL",
        name: "Test Parcel",
        status: "Pending" as const,
        weight: 1000,
        totalPrice: 100,
      };

      const expectedParcelle = {
        id: VALID_PARCELLE_ID,
        ...input,
        userId: VALID_USER_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actif: 1,
        prixTotal: 100,
        prixParGramme: 0.1,
      } as unknown as Parcelle;

      vi.mocked(mockParcelleRepository.superbuyIdExists).mockResolvedValue(false);
      vi.mocked(mockParcelleRepository.create).mockResolvedValue(expectedParcelle);

      const result = await parcelleService.createParcelle(VALID_USER_ID, input);

      expect(mockParcelleRepository.create).toHaveBeenCalled();
      expect(result).toEqual(expectedParcelle);
    });
  });

  describe("updateParcelle", () => {
    it("should update a parcelle using updateWithCalculation", async () => {
      const parcelleId = VALID_PARCELLE_ID;
      const updateData = { poids: 1000, prixTotal: 20 };
      const updatedParcelle = {
        id: parcelleId,
        userId: VALID_USER_ID,
        ...updateData,
        prixParGramme: 0.02,
        actif: 1,
      } as unknown as Parcelle;

      // Mock getParcelleById to return existing parcelle for ownership check
      vi.mocked(mockParcelleRepository.findById).mockResolvedValue({
        id: parcelleId,
        userId: VALID_USER_ID,
        numero: "123456",
        actif: 1,
      } as unknown as Parcelle);

      vi.mocked(mockParcelleRepository.updateWithCalculation).mockResolvedValue(updatedParcelle);

      const result = await parcelleService.updateParcelle(parcelleId, VALID_USER_ID, updateData);

      expect(mockParcelleRepository.updateWithCalculation).toHaveBeenCalled();
      expect(result).toEqual(updatedParcelle);
    });
  });

  describe("deleteParcelle", () => {
    it("should delete a parcelle successfully", async () => {
      // Mock getParcelleById to return existing parcelle for ownership check
      vi.mocked(mockParcelleRepository.findById).mockResolvedValue({
        id: VALID_PARCELLE_ID,
        userId: VALID_USER_ID,
        actif: 1,
      } as unknown as Parcelle);

      vi.mocked(mockParcelleRepository.countProductsByParcelId).mockResolvedValue(0);
      vi.mocked(mockParcelleRepository.delete).mockResolvedValue(true);

      const result = await parcelleService.deleteParcelle(VALID_PARCELLE_ID, VALID_USER_ID);

      expect(mockParcelleRepository.delete).toHaveBeenCalledWith(VALID_PARCELLE_ID);
      expect(result).toBe(true);
    });
  });

  describe("getParcelleStats", () => {
    it("should return parcelle stats", async () => {
      const stats = {
        totalParcelles: 10,
        totalPrixAchat: 100,
        totalPoids: 5000,
        totalPrixTotal: 150,
        averagePrixParGramme: 0.03,
        byTransporteur: {},
      };
      vi.mocked(mockParcelleRepository.getParcelStats).mockResolvedValue(stats);

      const result = await parcelleService.getParcelleStats(VALID_USER_ID);

      expect(mockParcelleRepository.getParcelStats).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toEqual(stats);
    });
  });
});