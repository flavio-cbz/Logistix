/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParcelleService } from '@/lib/services/parcelle-service';
import { 
  createMockParcelleRepository, 
  createMockLogger 
} from '../../setup/service-mocks';
import { 
  createTestParcelle, 
  createTestUser, 
  createTestParcelles 
} from '../../setup/test-data-factory';
import { 
  expectValidationError, 
  expectNotFoundError, 
  expectAuthorizationError,
  expectCustomError 
} from '../../utils/test-helpers';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/errors/custom-error';

describe('ParcelleService', () => {
  let parcelleService: ParcelleService;
  let mockParcelleRepository: ReturnType<typeof createMockParcelleRepository>;
  let testUser: ReturnType<typeof createTestUser>;

  beforeEach(() => {
    mockParcelleRepository = createMockParcelleRepository();
    testUser = createTestUser();
    
    parcelleService = new ParcelleService(mockParcelleRepository);
    parcelleService.setUserId(testUser.id);
    parcelleService.setRequestId('test-request-id');
  });

  describe('getAllParcelles', () => {
    it('should return all parcelles for a user', async () => {
      // Arrange
      const testParcelles = createTestParcelles(3, { userId: testUser.id });
      mockParcelleRepository.findAllByUserId.mockResolvedValue(testParcelles);

      // Act
      const result = await parcelleService.getAllParcelles(testUser.id);

      // Assert
      expect(result).toEqual(testParcelles);
      expect(mockParcelleRepository.findAllByUserId).toHaveBeenCalledWith(testUser.id);
    });

    it('should validate userId is a valid UUID', async () => {
      // Act & Assert
      await expectValidationError(
        () => parcelleService.getAllParcelles('invalid-uuid'),
        'userId',
        'must be a valid UUID'
      );
    });

    it('should handle repository errors', async () => {
      // Arrange
      mockParcelleRepository.findAllByUserId.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expectCustomError(
        () => parcelleService.getAllParcelles(testUser.id),
        'SERVICE_ERROR'
      );
    });
  });

  describe('getParcelleById', () => {
    it('should return a parcelle by ID', async () => {
      // Arrange
      const testParcelle = createTestParcelle({ userId: testUser.id });
      mockParcelleRepository.findById.mockResolvedValue(testParcelle);

      // Act
      const result = await parcelleService.getParcelleById(testParcelle.id);

      // Assert
      expect(result).toEqual(testParcelle);
      expect(mockParcelleRepository.findById).toHaveBeenCalledWith(testParcelle.id);
    });

    it('should return null when parcelle not found', async () => {
      // Arrange
      mockParcelleRepository.findById.mockResolvedValue(null);

      // Act
      const result = await parcelleService.getParcelleById('non-existent-id');

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
        'UNAUTHORIZED_ERROR',
        'Accès non autorisé à cette parcelle'
      );
    });

    it('should validate parcelle ID', async () => {
      // Act & Assert
      await expectValidationError(
        () => parcelleService.getParcelleById(''),
        'id',
        'must be a valid identifier'
      );
    });
  });

  describe('createParcelle', () => {
    it('should create a new parcelle successfully', async () => {
      // Arrange
      const parcelleData = {
        numero: 'PAR001',
        transporteur: 'DHL',
        poids: 1.5,
        prixAchat: 50.00
      };
      const createdParcelle = createTestParcelle({ 
        ...parcelleData, 
        userId: testUser.id 
      });
      
      mockParcelleRepository.create.mockResolvedValue(createdParcelle);

      // Act
      const result = await parcelleService.createParcelle(testUser.id, parcelleData);

      // Assert
      expect(result).toEqual(createdParcelle);
      expect(mockParcelleRepository.create).toHaveBeenCalledWith(
        testUser.id, 
        expect.objectContaining(parcelleData)
      );
    });

    it('should validate required fields', async () => {
      // Act & Assert
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, {} as any),
        undefined,
        'Le numéro de parcelle est requis'
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
      await expectValidationError(
        () => parcelleService.createParcelle(testUser.id, parcelleData),
        undefined,
        'Le numéro de parcelle est requis'
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
        () => parcelleService.createParcelle(testUser.id, parcelleData),
        undefined,
        'Le transporteur est requis'
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
        () => parcelleService.createParcelle(testUser.id, parcelleData),
        undefined,
        'Le poids doit être positif'
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
        () => parcelleService.createParcelle(testUser.id, parcelleData),
        undefined,
        'Le prix d\'achat doit être positif ou zéro'
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
      mockParcelleRepository.update.mockResolvedValue(updatedParcelle);

      // Act
      const result = await parcelleService.updateParcelle(
        existingParcelle.id, 
        testUser.id, 
        updateData
      );

      // Assert
      expect(result).toEqual(updatedParcelle);
      expect(mockParcelleRepository.update).toHaveBeenCalledWith(
        existingParcelle.id,
        testUser.id,
        expect.objectContaining(updateData)
      );
    });

    it('should throw error when parcelle does not exist', async () => {
      // Arrange
      mockParcelleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.updateParcelle('non-existent-id', testUser.id, { numero: 'PAR002' }),
        'NOT_FOUND_ERROR',
        'Parcelle non trouvée ou accès non autorisé'
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
        'UNAUTHORIZED_ERROR',
        'Accès non autorisé à cette parcelle'
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
        'Le poids doit être positif'
      );
    });
  });

  describe('deleteParcelle', () => {
    it('should delete an existing parcelle when no products are associated', async () => {
      // Arrange
      const existingParcelle = createTestParcelle({ userId: testUser.id });
      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);
      mockParcelleRepository.countProductsByParcelleId.mockResolvedValue(0);
      mockParcelleRepository.delete.mockResolvedValue(true);

      // Act
      const result = await parcelleService.deleteParcelle(existingParcelle.id, testUser.id);

      // Assert
      expect(result).toBe(true);
      expect(mockParcelleRepository.delete).toHaveBeenCalledWith(
        existingParcelle.id,
        testUser.id
      );
    });

    it('should throw error when parcelle does not exist', async () => {
      // Arrange
      mockParcelleRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.deleteParcelle('non-existent-id', testUser.id),
        'NOT_FOUND_ERROR',
        'Parcelle non trouvée ou accès non autorisé'
      );
    });

    it('should prevent deletion when products are associated', async () => {
      // Arrange
      const existingParcelle = createTestParcelle({ userId: testUser.id });
      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);
      mockParcelleRepository.countProductsByParcelleId.mockResolvedValue(3);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.deleteParcelle(existingParcelle.id, testUser.id),
        'BUSINESS_ERROR',
        'Impossible de supprimer cette parcelle car 3 produit(s) y sont associé(s)'
      );
    });

    it('should validate parcelle ownership', async () => {
      // Arrange
      const otherUser = createTestUser();
      const existingParcelle = createTestParcelle({ userId: otherUser.id });
      mockParcelleRepository.findById.mockResolvedValue(existingParcelle);

      // Act & Assert
      await expectCustomError(
        () => parcelleService.deleteParcelle(existingParcelle.id, testUser.id),
        'UNAUTHORIZED_ERROR',
        'Accès non autorisé à cette parcelle'
      );
    });
  });
});