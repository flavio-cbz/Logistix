/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { DatabaseConfig } from '../../../lib/database/database-service';

type DatabaseServiceCtorType = {
  getInstance: (config?: DatabaseConfig) => any;
};

vi.mock('better-sqlite3', () => {
  const MockDatabase = vi.fn(() => ({
    close: vi.fn(),
  }));
  (MockDatabase as any).default = MockDatabase;
  return MockDatabase;
});

vi.mock('drizzle-orm/better-sqlite3', () => ({
  drizzle: vi.fn(),
}));

const createSqliteStub = () => ({
  pragma: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn(),
  transaction: vi.fn().mockImplementation((fn: any) => () => fn()),
});

const createDrizzleStub = () => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
});

let DatabaseServiceCtor: DatabaseServiceCtorType | null = null;

describe('DatabaseService', () => {
  let service: any | null = null;
  let sqlite: ReturnType<typeof createSqliteStub>;
  let drizzleDb: ReturnType<typeof createDrizzleStub>;
  let initializeSpy: MockInstance | null = null;

  const resetSingleton = async () => {
    if (!DatabaseServiceCtor) {
      return;
    }

    const existing = Reflect.get(
      DatabaseServiceCtor as unknown as Record<string, unknown>,
      'instance',
    ) as any;

    if (existing) {
      await existing.close();
    }

    Reflect.set(
      DatabaseServiceCtor as unknown as Record<string, unknown>,
      'instance',
      undefined,
    );
  };

  const setupService = async (config: Partial<DatabaseConfig> = {}) => {
    if (!DatabaseServiceCtor) {
      throw new Error('DatabaseService non importé');
    }

    const instance = DatabaseServiceCtor.getInstance({
      path: ':memory:',
      enableLogging: false,
      ...config,
    });

    const sqliteStub = createSqliteStub();
    const drizzleStub = createDrizzleStub();

    initializeSpy?.mockRestore();
    initializeSpy = vi
      .spyOn(instance as any, 'initializeDatabase')
      .mockImplementation(async function (this: any) {
        sqliteStub.pragma('journal_mode = WAL');
        sqliteStub.pragma('foreign_keys = ON');
        this.sqliteDb = sqliteStub;
        this.db = drizzleStub;
        this.isInitialized = true;
      });

    await instance.ensureInitialized();

    service = instance;
    sqlite = sqliteStub;
    drizzleDb = drizzleStub;

    return instance;
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const module = await import('../../../lib/database/database-service');
    DatabaseServiceCtor = module.DatabaseService as unknown as DatabaseServiceCtorType;

    await resetSingleton();
  });

  afterEach(async () => {
    if (service) {
      await service.close();
    }

    service = null;
    initializeSpy?.mockRestore();
    initializeSpy = null;

    await resetSingleton();
    DatabaseServiceCtor = null;
  });

  it('initialise la base SQLite et Drizzle', async () => {
    await setupService();

    expect(initializeSpy).not.toBeNull();
    expect(initializeSpy).toHaveBeenCalledTimes(1);
    expect(sqlite.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    expect(sqlite.pragma).toHaveBeenCalledWith('foreign_keys = ON');
  });

  it("retourne l'instance Drizzle via getDb", async () => {
    await setupService();

    const db = await service!.getDb();
    expect(db).toBe(drizzleDb);
  });

  it('exécute une requête Drizzle avec succès', async () => {
    await setupService();

    const operation = vi.fn().mockImplementation((db: any) => {
      expect(db).toBe(drizzleDb);
      return { ok: true };
    });

    const result = await service!.executeQuery(operation, 'test');
    expect(result).toEqual({ ok: true });

    const stats = service!.getConnectionStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.activeConnections).toBe(0);
  });

  it('wrappe les erreurs des requêtes Drizzle', async () => {
    await setupService();

    const operation = vi.fn().mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(service!.executeQuery(operation, 'ctx')).rejects.toThrow(
      'Database operation failed in ctx: boom',
    );
  });

  it('gère les transactions avec succès', async () => {
    await setupService();

    const result = await service!.executeTransaction(() => 'tx-result');

    expect(result).toBe('tx-result');
    expect(sqlite.transaction).toHaveBeenCalledTimes(1);
  });

  it('réessaie les transactions SQLITE_BUSY', async () => {
    await setupService();

    let attempts = 0;
    sqlite.transaction.mockImplementation((fn: any) => () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('SQLITE_BUSY');
      }
      return fn();
    });

    const result = await service!.executeTransaction(() => 'ok', { retries: 3 });

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('échoue après le nombre max de retries', async () => {
    await setupService();

    sqlite.transaction.mockImplementation(() => () => {
      throw new Error('SQLITE_BUSY');
    });

    await expect(
      service!.executeTransaction(() => 'ko', { retries: 2 }),
    ).rejects.toThrow('Database operation failed in transaction: SQLITE_BUSY');
  });

  it('exécute une requête SQL brute (all)', async () => {
    await setupService();

    const statement = {
      all: vi.fn().mockReturnValue([{ id: 1 }]),
      get: vi.fn(),
      run: vi.fn(),
    };
    sqlite.prepare.mockReturnValue(statement);

    const result = await service!.executeRawQuery('SELECT * FROM test', ['foo', 'bar']);

    expect(sqlite.prepare).toHaveBeenCalledWith('SELECT * FROM test');
    expect(statement.all).toHaveBeenCalledWith('foo', 'bar');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('exécute une requête SQL brute (get)', async () => {
    await setupService();

    const statement = {
      all: vi.fn(),
      get: vi.fn().mockReturnValue({ id: '42' }),
      run: vi.fn(),
    };
    sqlite.prepare.mockReturnValue(statement);

    const result = await service!.executeRawQueryOne(
      'SELECT * FROM test WHERE id = ?',
      ['42'],
    );

    expect(sqlite.prepare).toHaveBeenCalledWith('SELECT * FROM test WHERE id = ?');
    expect(statement.get).toHaveBeenCalledWith('42');
    expect(result).toEqual({ id: '42' });
  });

  it('réalise un health check positif', async () => {
    await setupService();

    drizzleDb.get.mockReturnValue({ health: 1 });

    const healthy = await service!.healthCheck();

    expect(healthy).toBe(true);
    expect(drizzleDb.get).toHaveBeenCalled();
  });

  it('renvoie false si le health check échoue', async () => {
    await setupService();

    drizzleDb.get.mockImplementation(() => {
      throw new Error('fail');
    });

    const healthy = await service!.healthCheck();

    expect(healthy).toBe(false);
  });

  it('retourne les statistiques de connexion', async () => {
    await setupService();

    await service!.executeQuery(() => 'ok', 'stats');

    const stats = service!.getConnectionStats();

    expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
    expect(stats.activeConnections).toBe(0);
    expect(typeof stats.averageResponseTime).toBe('number');
    expect(typeof stats.errorRate).toBe('number');
  });

  it('ferme proprement la connexion SQLite', async () => {
    await setupService();

    await service!.close();

    expect(sqlite.close).toHaveBeenCalledTimes(1);
  });

  it('gère les erreurs lors de la fermeture', async () => {
    await setupService();

    sqlite.close.mockImplementation(() => {
      throw new Error('close-fail');
    });

    await expect(service!.close()).resolves.toBeUndefined();
  });
});