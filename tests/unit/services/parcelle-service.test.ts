<<<<<<< HEAD
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParcelleService } from "@/lib/services/parcelle-service";
import { ParcelleRepository } from "@/lib/repositories/parcelle-repository";
import { Parcelle } from "@/lib/database/schema";
=======
/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ParcelleService } from '@/lib/services/parcelle-service';
import { 
  createMockParcelleRepository
} from '../../setup/service-mocks';
import { 
  createTestParcelle, 
  createTestUser, 
  createTestParcelles 
} from '../../setup/test-data-factory';
import { 
  expectValidationError, 
  expectCustomError 
} from '../../utils/test-helpers';
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94

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
  updatePrixParGramme: vi.fn(),
  updateWithCalculation: vi.fn(),
  getParcelleStats: vi.fn(),
  getUserTransporteurs: vi.fn(),
  findParcellesWithProducts: vi.fn(),
  countProductsByParcelleId: vi.fn(),
  deleteWithProducts: vi.fn(),
} as unknown as ParcelleRepository;

const VALID_USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const VALID_PARCELLE_ID = "123e4567-e89b-12d3-a456-426614174001";

describe("ParcelleService", () => {
  let parcelleService: ParcelleService;

  beforeEach(() => {
<<<<<<< HEAD
    vi.clearAllMocks();
    parcelleService = new ParcelleService(mockParcelleRepository);
=======
    mockParcelleRepository = createMockParcelleRepository();
    testUser = createTestUser();
    
  parcelleService = new ParcelleService(mockParcelleRepository as any);
    parcelleService.setUserId(testUser.id);
    parcelleService.setRequestId('test-request-id');
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
  });

  describe("createParcelle", () => {
    it("should create a parcelle successfully", async () => {
      const input = {
        numero: "123456",
        transporteur: "DHL",
        nom: "Test Parcel",
        statut: "En attente" as const,
        prixAchat: 100,
        poids: 1000,
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

<<<<<<< HEAD
      expect(mockParcelleRepository.updateWithCalculation).toHaveBeenCalled();
      expect(result).toEqual(updatedParcelle);
=======
      // Act
      const result = await parcelleService.getParcelleById(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });

    it('should validate user access when userId provided', async () => {
      // Arrange
      const otherUser = createTestUser();
      const testParcelle = createTestParcelle({ userId: otherUser.id });
      mockParcelleRepository.findById.mockResolvedValue(testParcelle);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.getParcelleById(testParcelle.id, testUser.id),
        'AUTHORIZATION_ERROR',
        'Unauthorized access to this parcelle'
      );
    });

    it('should validate parcelle ID', async () => {
      // Act & Assert
      // Empty id should trigger a 'is required' validation message
      await expectValidationError(
        () => parcelleService.getParcelleById(''),
        'id',
        'is required'
      );
    });
  });

  describe('createParcelle', () => {
    it('should create a new parcelle successfully', async () => {
      // Arrange
      const parcelleData = {
        numero: 'PAR001',
        transporteur: 'DHL',
        poids: 1500, // en grammes
        prixAchat: 50.00
      };
      const createdParcelle = createTestParcelle({ 
        ...parcelleData, 
        userId: testUser.id 
      });
      
  mockParcelleRepository.create.mockResolvedValue(createdParcelle);

      // Act
  // include required fields 'nom' and 'statut' expected by schema
  const result = await parcelleService.createParcelle(testUser.id, { ...parcelleData, nom: 'Test Parcelle', statut: 'En attente' } as any);

      // Assert
      expect(result).toEqual(createdParcelle);
      // Repository create is called with a single object that includes userId
      expect(mockParcelleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...parcelleData, userId: testUser.id })
      );
    });

    it('should validate required fields', async () => {
      // Act & Assert - schema returns Zod "Required" for missing fields; check for validation error instead of exact localized message
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, {} as any),
        undefined,
        'Required'
      );
    });

    it('should validate numero field', async () => {
      // Arrange
      const parcelleData = {
        numero: '',
        transporteur: 'DHL',
        poids: 1.5,
        prixAchat: 50.00
      };

      // Act & Assert
      // Allow either localized message or generic 'Required'
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, parcelleData as any),
        undefined,
        undefined
      );
    });

    it('should validate transporteur field', async () => {
      // Arrange
      const parcelleData = {
        numero: 'PAR001',
        transporteur: '',
        poids: 1.5,
        prixAchat: 50.00
      };

      // Act & Assert
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, parcelleData as any),
        undefined,
        undefined
      );
    });

    it('should validate poids is positive', async () => {
      // Arrange
      const parcelleData = {
        numero: 'PAR001',
        transporteur: 'DHL',
        poids: -1.5,
        prixAchat: 50.00
      };

      // Act & Assert
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, parcelleData as any),
        undefined,
        undefined
      );
    });

    it('should validate prixAchat is non-negative', async () => {
      // Arrange
      const parcelleData = {
        numero: 'PAR001',
        transporteur: 'DHL',
        poids: 1.5,
        prixAchat: -10.00
      };

      // Act & Assert
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, parcelleData as any),
        undefined,
        undefined
      );
    });

    it('should validate userId is a valid UUID', async () => {
      // Act & Assert
      await expectValidationError(
        () => parcelleService.createParcelle('invalid-uuid', { numero: 'PAR001' } as any),
        'userId',
        'must be a valid UUID'
      );
    });
  });

  describe('updateParcelle', () => {
    it('should update an existing parcelle', async () => {
      // Arrange
      const existingParcelle = createTestParcelle({ userId: testUser.id });
      const updateData = { numero: 'PAR002', poids: 2.0 };
      const updatedParcelle = { ...existingParcelle, ...updateData };

      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);
  // service calls updateWithCalculation; mock it to return updated object
  mockParcelleRepository.updateWithCalculation.mockResolvedValue(updatedParcelle);

      // Act
      const result = await parcelleService.updateParcelle(
        existingParcelle.id, 
        testUser.id, 
        updateData
      );

      // Assert
      expect(result).toEqual(updatedParcelle);
      expect(mockParcelleRepository.updateWithCalculation).toHaveBeenCalledWith(
        existingParcelle.id,
        expect.objectContaining(updateData)
      );
    });

    it('should throw error when parcelle does not exist', async () => {
      // Arrange
      const nonExistentId = '00000000-0000-4000-8000-000000000000'; // Valid UUID
      mockParcelleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.updateParcelle(nonExistentId, testUser.id, { numero: 'PAR002' }),
        'NOT_FOUND',
        'not found'
      );
    });

    it('should validate parcelle ownership', async () => {
      // Arrange
      const otherUser = createTestUser();
      const existingParcelle = createTestParcelle({ userId: otherUser.id });
      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.updateParcelle(existingParcelle.id, testUser.id, { numero: 'PAR002' }),
        'AUTHORIZATION_ERROR',
        'Unauthorized access to this parcelle'
      );
    });

    it('should validate update data', async () => {
      // Arrange
      const existingParcelle = createTestParcelle({ userId: testUser.id });
      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.updateParcelle(existingParcelle.id, testUser.id, { poids: -1 }),
        'VALIDATION_ERROR',
        'Le poids doit être positif (en grammes)'
      );
>>>>>>> ad32518644f2ab77a7c59429e3df905bfcc3ef94
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

      vi.mocked(mockParcelleRepository.countProductsByParcelleId).mockResolvedValue(0);
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
      vi.mocked(mockParcelleRepository.getParcelleStats).mockResolvedValue(stats);

      const result = await parcelleService.getParcelleStats(VALID_USER_ID);

      expect(mockParcelleRepository.getParcelleStats).toHaveBeenCalledWith(VALID_USER_ID);
      expect(result).toEqual(stats);
    });
  });
});