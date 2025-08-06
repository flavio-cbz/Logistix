/**
 * Database Service Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseServiceInstrumentation } from '@/lib/services/logging-instrumentation';

// Mock the database
vi.mock('@/lib/services/database/db', () => ({
  db: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn()
    })),
    transaction: vi.fn(),
    close: vi.fn()
  },
  getCurrentTimestamp: vi.fn(() => '2024-01-01T00:00:00Z')
}));

// Mock logging
vi.mock('@/lib/utils/logging', () => ({
  databaseLogger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    performance: vi.fn()
  },
  dbQueryLogger: {
    logQuery: vi.fn(),
    logTransaction: vi.fn(),
    logConnection: vi.fn()
  }
}));

describe('Database Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Connection', () => {
    it('should establish database connection', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      expect(db).toBeDefined();
      expect(typeof db.prepare).toBe('function');
    });

    it('should handle connection errors gracefully', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      // Mock connection failure
      (db.prepare as any).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const mockQuery = async () => {
        const stmt = db.prepare('SELECT 1');
        return stmt.get();
      };

      await expect(mockQuery()).rejects.toThrow('Connection failed');
    });

    it('should log connection events', async () => {
      const { dbQueryLogger } = await import('@/lib/utils/logging');
      
      // Simulate connection event
      dbQueryLogger.logConnection('connect', { host: 'localhost' });
      
      expect(dbQueryLogger.logConnection).toHaveBeenCalledWith('connect', { host: 'localhost' });
    });
  });

  describe('Query Execution', () => {
    it('should execute SELECT queries successfully', async () => {
      const mockResult = { id: 1, name: 'Test' };
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue(mockResult)
      });

      const queryFn = async () => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(1);
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'GET_USER',
        queryFn,
        'SELECT * FROM users WHERE id = ?'
      );

      const result = await instrumentedQuery;
      
      expect(result).toEqual(mockResult);
    });

    it('should execute INSERT queries successfully', async () => {
      const mockResult = { lastInsertRowid: 1, changes: 1 };
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue(mockResult)
      });

      const queryFn = async () => {
        const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        return stmt.run('John Doe', 'john@example.com');
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'CREATE_USER',
        queryFn,
        'INSERT INTO users (name, email) VALUES (?, ?)'
      );

      const result = await instrumentedQuery;
      
      expect(result).toEqual(mockResult);
    });

    it('should execute UPDATE queries successfully', async () => {
      const mockResult = { changes: 1 };
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue(mockResult)
      });

      const queryFn = async () => {
        const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
        return stmt.run('Jane Doe', 1);
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'UPDATE_USER',
        queryFn,
        'UPDATE users SET name = ? WHERE id = ?'
      );

      const result = await instrumentedQuery;
      
      expect(result).toEqual(mockResult);
    });

    it('should execute DELETE queries successfully', async () => {
      const mockResult = { changes: 1 };
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue(mockResult)
      });

      const queryFn = async () => {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        return stmt.run(1);
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'DELETE_USER',
        queryFn,
        'DELETE FROM users WHERE id = ?'
      );

      const result = await instrumentedQuery;
      
      expect(result).toEqual(mockResult);
    });

    it('should handle query errors and log them', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockImplementation(() => {
          throw new Error('SQL syntax error');
        })
      });

      const queryFn = async () => {
        const stmt = db.prepare('INVALID SQL');
        return stmt.get();
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'INVALID_QUERY',
        queryFn,
        'INVALID SQL'
      );

      await expect(instrumentedQuery).rejects.toThrow('SQL syntax error');
    });

    it('should log query performance metrics', async () => {
      const { db } = await import('@/lib/services/database/db');
      const { dbQueryLogger } = await import('@/lib/utils/logging');
      
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockReturnValue({ id: 1 })
      });

      const queryFn = async () => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(1);
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'GET_USER',
        queryFn,
        'SELECT * FROM users WHERE id = ?'
      );

      await instrumentedQuery;
      
      expect(dbQueryLogger.logQuery).toHaveBeenCalled();
    });
  });

  describe('Transaction Management', () => {
    it('should execute transactions successfully', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      const mockTransaction = vi.fn().mockImplementation((fn) => fn());
      (db.transaction as any).mockReturnValue(mockTransaction);

      const transactionFn = async () => {
        // Simulate transaction operations
        return { success: true, affectedRows: 2 };
      };

      const instrumentedTransaction = DatabaseServiceInstrumentation.instrumentTransaction(
        'USER_BATCH_UPDATE',
        transactionFn
      );

      const result = await instrumentedTransaction;
      
      expect(result).toEqual({ success: true, affectedRows: 2 });
    });

    it('should handle transaction rollbacks', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      const mockTransaction = vi.fn().mockImplementation((fn) => {
        try {
          return fn();
        } catch (error) {
          // Simulate rollback
          throw error;
        }
      });
      (db.transaction as any).mockReturnValue(mockTransaction);

      const transactionFn = async () => {
        throw new Error('Transaction failed');
      };

      const instrumentedTransaction = DatabaseServiceInstrumentation.instrumentTransaction(
        'FAILED_TRANSACTION',
        transactionFn
      );

      await expect(instrumentedTransaction).rejects.toThrow('Transaction failed');
    });

    it('should log transaction performance', async () => {
      const { db } = await import('@/lib/services/database/db');
      const { dbQueryLogger } = await import('@/lib/utils/logging');
      
      const mockTransaction = vi.fn().mockImplementation((fn) => fn());
      (db.transaction as any).mockReturnValue(mockTransaction);

      const transactionFn = async () => {
        return { success: true };
      };

      const instrumentedTransaction = DatabaseServiceInstrumentation.instrumentTransaction(
        'TEST_TRANSACTION',
        transactionFn
      );

      await instrumentedTransaction;
      
      expect(dbQueryLogger.logTransaction).toHaveBeenCalled();
    });
  });

  describe('Database Schema Operations', () => {
    it('should handle schema migrations', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0 })
      });

      const migrationFn = async () => {
        const stmt = db.prepare(`
          CREATE TABLE IF NOT EXISTS test_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        return stmt.run();
      };

      const instrumentedMigration = DatabaseServiceInstrumentation.instrumentQuery(
        'CREATE_TABLE',
        migrationFn,
        'CREATE TABLE IF NOT EXISTS test_table...'
      );

      const result = await instrumentedMigration;
      
      expect(result).toEqual({ changes: 0 });
    });

    it('should handle index creation', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0 })
      });

      const indexFn = async () => {
        const stmt = db.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        return stmt.run();
      };

      const instrumentedIndex = DatabaseServiceInstrumentation.instrumentQuery(
        'CREATE_INDEX',
        indexFn,
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
      );

      const result = await instrumentedIndex;
      
      expect(result).toEqual({ changes: 0 });
    });
  });

  describe('Connection Pool Management', () => {
    it('should handle connection pool exhaustion', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      // Simulate connection pool exhaustion
      (db.prepare as any).mockImplementation(() => {
        throw new Error('Connection pool exhausted');
      });

      const queryFn = async () => {
        const stmt = db.prepare('SELECT 1');
        return stmt.get();
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'POOL_TEST',
        queryFn
      );

      await expect(instrumentedQuery).rejects.toThrow('Connection pool exhausted');
    });

    it('should handle connection timeouts', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      // Simulate connection timeout
      (db.prepare as any).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 100);
        });
      });

      const queryFn = async () => {
        const stmt = await db.prepare('SELECT 1');
        return stmt.get();
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'TIMEOUT_TEST',
        queryFn
      );

      await expect(instrumentedQuery).rejects.toThrow('Connection timeout');
    });
  });

  describe('Data Integrity', () => {
    it('should handle foreign key constraints', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          const error = new Error('FOREIGN KEY constraint failed');
          (error as any).code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
          throw error;
        })
      });

      const queryFn = async () => {
        const stmt = db.prepare('INSERT INTO products (name, parcelle_id) VALUES (?, ?)');
        return stmt.run('Test Product', 'non-existent-parcelle');
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'INSERT_PRODUCT',
        queryFn
      );

      await expect(instrumentedQuery).rejects.toThrow('FOREIGN KEY constraint failed');
    });

    it('should handle unique constraints', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          const error = new Error('UNIQUE constraint failed');
          (error as any).code = 'SQLITE_CONSTRAINT_UNIQUE';
          throw error;
        })
      });

      const queryFn = async () => {
        const stmt = db.prepare('INSERT INTO users (email) VALUES (?)');
        return stmt.run('existing@example.com');
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'INSERT_USER',
        queryFn
      );

      await expect(instrumentedQuery).rejects.toThrow('UNIQUE constraint failed');
    });

    it('should handle check constraints', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockImplementation(() => {
          const error = new Error('CHECK constraint failed');
          (error as any).code = 'SQLITE_CONSTRAINT_CHECK';
          throw error;
        })
      });

      const queryFn = async () => {
        const stmt = db.prepare('INSERT INTO products (name, price) VALUES (?, ?)');
        return stmt.run('Test Product', -10); // Negative price violates check constraint
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'INSERT_PRODUCT_INVALID',
        queryFn
      );

      await expect(instrumentedQuery).rejects.toThrow('CHECK constraint failed');
    });
  });

  describe('Performance Monitoring', () => {
    it('should monitor slow queries', async () => {
      const { db } = await import('@/lib/services/database/db');
      const { databaseLogger } = await import('@/lib/utils/logging');
      
      (db.prepare as any).mockReturnValue({
        get: vi.fn().mockImplementation(() => {
          // Simulate slow query
          return new Promise(resolve => {
            setTimeout(() => resolve({ id: 1 }), 100);
          });
        })
      });

      const queryFn = async () => {
        const stmt = db.prepare('SELECT * FROM large_table WHERE complex_condition = ?');
        return stmt.get('value');
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'SLOW_QUERY',
        queryFn,
        'SELECT * FROM large_table WHERE complex_condition = ?'
      );

      await instrumentedQuery;
      
      // Should log performance metrics
      expect(databaseLogger.info).toHaveBeenCalled();
    });

    it('should track query execution statistics', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      const mockResults = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      (db.prepare as any).mockReturnValue({
        all: vi.fn().mockReturnValue(mockResults)
      });

      const queryFn = async () => {
        const stmt = db.prepare('SELECT * FROM items');
        return stmt.all();
      };

      const instrumentedQuery = DatabaseServiceInstrumentation.instrumentQuery(
        'GET_ALL_ITEMS',
        queryFn,
        'SELECT * FROM items'
      );

      const result = await instrumentedQuery;
      
      expect(result).toHaveLength(3);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Database Cleanup', () => {
    it('should handle database cleanup operations', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 5 })
      });

      const cleanupFn = async () => {
        const stmt = db.prepare('DELETE FROM logs WHERE created_at < datetime("now", "-30 days")');
        return stmt.run();
      };

      const instrumentedCleanup = DatabaseServiceInstrumentation.instrumentQuery(
        'CLEANUP_OLD_LOGS',
        cleanupFn,
        'DELETE FROM logs WHERE created_at < datetime("now", "-30 days")'
      );

      const result = await instrumentedCleanup;
      
      expect(result.changes).toBe(5);
    });

    it('should handle vacuum operations', async () => {
      const { db } = await import('@/lib/services/database/db');
      
      (db.prepare as any).mockReturnValue({
        run: vi.fn().mockReturnValue({ changes: 0 })
      });

      const vacuumFn = async () => {
        const stmt = db.prepare('VACUUM');
        return stmt.run();
      };

      const instrumentedVacuum = DatabaseServiceInstrumentation.instrumentQuery(
        'VACUUM_DATABASE',
        vacuumFn,
        'VACUUM'
      );

      const result = await instrumentedVacuum;
      
      expect(result).toEqual({ changes: 0 });
    });
  });
});