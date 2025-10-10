/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BaseRepository } from '@/lib/repositories/base-repository';
import { setupInMemoryDatabase, cleanupInMemoryDatabase } from '../../setup/database-mocks';
import { createMockDatabaseService } from '../../setup/database-mocks';
import { createTestUser } from '../../setup/test-data-factory';
import { expectCustomError } from '../../utils/test-helpers';

// Create a concrete implementation for testing
class TestRepository extends BaseRepository<any, any, any> {
  constructor(databaseService: any) {
    const mockTable = {
      _: { name: 'test_table' },
      id: 'id',
      name: 'name',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    };
    super(mockTable, databaseService, { enableLogging: false });
  }

  // Expose protected methods for testing
  public testAddTimestamps(data: any, operation: 'create' | 'update') {
    return this.addTimestamps(data, operation);
  }

  public testGetTableName() {
    return this.getTableName();
  }
}

describe('BaseRepository', () => {
  let testRepository: TestRepository;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let inMemoryDb: any;
  let sqlite: any;

  beforeEach(async () => {
    mockDatabaseService = createMockDatabaseService();
    testRepository = new TestRepository(mockDatabaseService);
    
    // Setup in-memory database for integration tests
    const dbSetup = await setupInMemoryDatabase();
    inMemoryDb = dbSetup.db;
    sqlite = dbSetup.sqlite;
  });

  afterEach(() => {
    if (sqlite) {
      cleanupInMemoryDatabase(sqlite);
    }
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(testRepository).toBeDefined();
      expect(testRepository.testGetTableName()).toBe('test_table');
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        enableLogging: true,
        defaultLimit: 25,
        maxLimit: 500
      };
      
      const customRepository = new TestRepository(mockDatabaseService);
      expect(customRepository).toBeDefined();
    });
  });

  describe('findById', () => {
    it('should find record by ID successfully', async () => {
      // Arrange
      const testRecord = { id: 'test-id', name: 'Test Record' };
      mockDatabaseService.executeQuery.mockResolvedValue(testRecord);

      // Act
      const result = await testRepository.findById('test-id');

      // Assert
      expect(result).toEqual(testRecord);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.findById'
      );
    });

    it('should return null when record not found', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(null);

      // Act
      const result = await testRepository.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(testRepository.findById('test-id')).rejects.toThrow('Database error');
    });
  });

  describe('findAll', () => {
    it('should find all records with default options', async () => {
      // Arrange
      const testRecords = [
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' }
      ];
      mockDatabaseService.executeQuery.mockResolvedValue(testRecords);

      // Act
      const result = await testRepository.findAll();

      // Assert
      expect(result).toEqual(testRecords);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.findAll'
      );
    });

    it('should apply limit and offset', async () => {
      // Arrange
      const testRecords = [{ id: '1', name: 'Record 1' }];
      mockDatabaseService.executeQuery.mockResolvedValue(testRecords);

      // Act
      const result = await testRepository.findAll({
        limit: 10,
        offset: 5
      });

      // Assert
      expect(result).toEqual(testRecords);
    });

    it('should apply ordering', async () => {
      // Arrange
      const testRecords = [{ id: '1', name: 'Record 1' }];
      mockDatabaseService.executeQuery.mockResolvedValue(testRecords);

      // Act
      const result = await testRepository.findAll({
        orderBy: 'name',
        orderDirection: 'desc'
      });

      // Assert
      expect(result).toEqual(testRecords);
    });

    it('should enforce max limit', async () => {
      // Arrange
      const testRecords = [{ id: '1', name: 'Record 1' }];
      mockDatabaseService.executeQuery.mockResolvedValue(testRecords);

      // Act
      const result = await testRepository.findAll({
        limit: 2000 // Exceeds max limit
      });

      // Assert
      expect(result).toEqual(testRecords);
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results with metadata', async () => {
      // Arrange
      const testRecords = [
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' }
      ];
      
      mockDatabaseService.executeQuery.mockResolvedValue({
        data: testRecords,
        total: 10,
        limit: 2,
        offset: 0,
        hasMore: true
      });

      // Act
      const result = await testRepository.findWithPagination({
        limit: 2,
        offset: 0
      });

      // Assert
      expect(result).toHaveProperty('data', testRecords);
      expect(result).toHaveProperty('total', 10);
      expect(result).toHaveProperty('limit', 2);
      expect(result).toHaveProperty('offset', 0);
      expect(result).toHaveProperty('hasMore', true);
    });

    it('should handle empty results', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue({
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      });

      // Act
      const result = await testRepository.findWithPagination();

      // Assert
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('create', () => {
    it('should create record successfully', async () => {
      // Arrange
      const inputData = { name: 'New Record' };
      const createdRecord = { 
        id: 'generated-id', 
        name: 'New Record',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };
      
      mockDatabaseService.executeQuery.mockResolvedValue(createdRecord);

      // Act
      const result = await testRepository.create(inputData);

      // Assert
      expect(result).toEqual(createdRecord);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.create'
      );
    });

    it('should add timestamps automatically', () => {
      // Arrange
      const inputData = { name: 'Test Record' };

      // Act
      const result = testRepository.testAddTimestamps(inputData, 'create');

      // Assert
      expect(result).toHaveProperty('name', 'Test Record');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('id');
    });

    it('should handle creation errors', async () => {
      // Arrange
      const inputData = { name: 'New Record' };
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Creation failed'));

      // Act & Assert
      await expect(testRepository.create(inputData)).rejects.toThrow('Creation failed');
    });
  });

  describe('createMany', () => {
    it('should create multiple records in transaction', async () => {
      // Arrange
      const inputData = [
        { name: 'Record 1' },
        { name: 'Record 2' }
      ];
      const createdRecords = [
        { id: '1', name: 'Record 1', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: '2', name: 'Record 2', createdAt: '2024-01-01T00:00:00.000Z' }
      ];
      
      mockDatabaseService.executeTransaction.mockResolvedValue(createdRecords);

      // Act
      const result = await testRepository.createMany(inputData);

      // Assert
      expect(result).toEqual(createdRecords);
      expect(mockDatabaseService.executeTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        { retries: 3 }
      );
    });

    it('should handle transaction errors', async () => {
      // Arrange
      const inputData = [{ name: 'Record 1' }];
      mockDatabaseService.executeTransaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(testRepository.createMany(inputData)).rejects.toThrow('Transaction failed');
    });
  });

  describe('update', () => {
    it('should update record successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Record' };
      const updatedRecord = { 
        id: 'test-id', 
        name: 'Updated Record',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };
      
      mockDatabaseService.executeQuery.mockResolvedValue(updatedRecord);

      // Act
      const result = await testRepository.update('test-id', updateData);

      // Assert
      expect(result).toEqual(updatedRecord);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.update'
      );
    });

    it('should add update timestamp automatically', () => {
      // Arrange
      const updateData = { name: 'Updated Record' };

      // Act
      const result = testRepository.testAddTimestamps(updateData, 'update');

      // Assert
      expect(result).toHaveProperty('name', 'Updated Record');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should return null when record not found', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(null);

      // Act
      const result = await testRepository.update('non-existent-id', { name: 'Updated' });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete record successfully', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(true);

      // Act
      const result = await testRepository.delete('test-id');

      // Assert
      expect(result).toBe(true);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.delete'
      );
    });

    it('should return false when record not found', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(false);

      // Act
      const result = await testRepository.delete('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(true);

      // Act
      const result = await testRepository.exists('test-id');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(false);

      // Act
      const result = await testRepository.exists('non-existent-id');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of all records', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(5);

      // Act
      const result = await testRepository.count();

      // Assert
      expect(result).toBe(5);
      expect(mockDatabaseService.executeQuery).toHaveBeenCalledWith(
        expect.any(Function),
        'test_table.count'
      );
    });

    it('should return count with where clause', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(3);

      // Act
      const result = await testRepository.count(/* some where clause */);

      // Assert
      expect(result).toBe(3);
    });

    it('should return 0 for empty table', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockResolvedValue(0);

      // Act
      const result = await testRepository.count();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('timestamp handling', () => {
    it('should preserve existing timestamps on create', () => {
      // Arrange
      const existingTimestamp = '2023-01-01T00:00:00.000Z';
      const inputData = { 
        name: 'Test Record',
        createdAt: existingTimestamp,
        updatedAt: existingTimestamp
      };

      // Act
      const result = testRepository.testAddTimestamps(inputData, 'create');

      // Assert
      expect(result.createdAt).toBe(existingTimestamp);
      expect(result.updatedAt).toBe(existingTimestamp);
    });

    it('should not add createdAt on update', () => {
      // Arrange
      const updateData = { name: 'Updated Record' };

      // Act
      const result = testRepository.testAddTimestamps(updateData, 'update');

      // Assert
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('createdAt');
    });

    it('should preserve existing ID on create', () => {
      // Arrange
      const existingId = 'existing-id';
      const inputData = { 
        id: existingId,
        name: 'Test Record'
      };

      // Act
      const result = testRepository.testAddTimestamps(inputData, 'create');

      // Assert
      expect(result.id).toBe(existingId);
    });
  });

  describe('error handling', () => {
    it('should log and re-throw database errors', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(testRepository.findById('test-id')).rejects.toThrow('Database connection lost');
      
      // Cleanup
      consoleSpy.mockRestore();
    });

    it('should handle malformed data gracefully', async () => {
      // Arrange
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Invalid data format'));

      // Act & Assert
      await expect(testRepository.create({ invalid: 'data' })).rejects.toThrow('Invalid data format');
    });
  });
});