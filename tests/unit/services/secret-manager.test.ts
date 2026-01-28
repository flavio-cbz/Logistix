import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecretManager } from '../../../lib/services/security/secret-manager';
import { databaseService } from "@/lib/database";
import { logger } from '../../../lib/utils/logging/logger';

vi.mock('../../../lib/database', () => {
  const query = vi.fn();
  const queryOne = vi.fn();
  const execute = vi.fn();

  return {
    databaseService: {
      query,
      queryOne,
      execute,
    },
  };
});

vi.mock('../../../lib/utils/logging/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SecretManager', () => {
  const mockDatabaseService = vi.mocked(databaseService);
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    SecretManager.resetForTesting();
    vi.clearAllMocks();
  });

  it('charges les secrets modernes et les met en cache', async () => {
    const manager = SecretManager.getInstance();

    mockDatabaseService.queryOne.mockResolvedValueOnce({ name: 'app_secrets' });
    mockDatabaseService.query.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'name' },
      { name: 'value' },
    ]);
    mockDatabaseService.query.mockResolvedValueOnce([
      {
        id: 'secret-1',
        name: 'ai_api_key',
        value: 'super-secret',
        is_active: 1,
      },
    ]);

    await manager.init();

    expect(manager.getSecret('ai_api_key')).toBe('super-secret');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('insère un nouveau secret lorsque la clé est absente (schéma moderne)', async () => {
    const manager = SecretManager.getInstance();

    mockDatabaseService.queryOne.mockResolvedValueOnce({ name: 'app_secrets' });
    mockDatabaseService.query.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'name' },
      { name: 'value' },
    ]);
    mockDatabaseService.query.mockResolvedValueOnce([]);
    mockDatabaseService.queryOne.mockResolvedValueOnce(null);

    mockDatabaseService.execute.mockResolvedValueOnce({ changes: 1 } as any);

    await manager.setSecret('ai_api_key', 'injected-secret');

    const executeCall = mockDatabaseService.execute.mock.calls[0];
    expect(executeCall).toBeDefined();
    if (!executeCall) {
      throw new Error('Expected databaseService.execute to be called');
    }

    const [, params, context] = executeCall;

    expect(context).toBe('secret-manager-modern-insert');
    expect(Array.isArray(params)).toBe(true);
    if (!Array.isArray(params)) {
      throw new Error('Expected params to be an array');
    }
    expect(params[1]).toBe('ai_api_key');
    expect(params[2]).toBe('injected-secret');
    expect(manager.getSecret('ai_api_key')).toBe('injected-secret');
  });

  it('met à jour un secret legacy et synchronise le cache', async () => {
    const manager = SecretManager.getInstance();

    mockDatabaseService.queryOne.mockResolvedValueOnce({ name: 'app_secrets' });
    mockDatabaseService.query.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'key' },
    ]);
    mockDatabaseService.query.mockResolvedValueOnce([
      { id: 'legacy-1', secret_value: 'old-secret' },
    ]);

    await manager.init();

    mockDatabaseService.queryOne.mockResolvedValueOnce({ id: 'legacy-1' });
    mockDatabaseService.execute.mockResolvedValueOnce({ changes: 1 } as any);

    await manager.setSecret('ignored-name', 'new-secret');

    expect(mockDatabaseService.execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE app_secrets SET key = ?'),
      ['new-secret', 'legacy-1'],
      'secret-manager-legacy-update',
    );
    expect(manager.getSecret('ai_api_key')).toBe('new-secret');
    expect(manager.getSecret('default')).toBe('new-secret');
  });

  it('lit les variables d\'environnement en priorité sur le cache DB', async () => {
    const manager = SecretManager.getInstance();

    // Définir une variable d'environnement
    process.env['SECRET_MY_TEST_KEY'] = 'from-env-value';

    // Simuler une valeur différente en cache DB
    mockDatabaseService.queryOne.mockResolvedValueOnce({ name: 'app_secrets' });
    mockDatabaseService.query.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'name' },
      { name: 'value' },
    ]);
    mockDatabaseService.query.mockResolvedValueOnce([
      { id: 's1', name: 'my_test_key', value: 'from-db-value', is_active: 1 },
    ]);

    await manager.init();

    // La valeur env doit être prioritaire
    expect(manager.getSecret('my_test_key')).toBe('from-env-value');

    // Cleanup
    delete process.env['SECRET_MY_TEST_KEY'];
  });

  it('retourne la valeur DB si aucune variable d\'environnement n\'existe', async () => {
    const manager = SecretManager.getInstance();

    // S'assurer qu'aucune env n'existe
    delete process.env['SECRET_OTHER_KEY'];

    mockDatabaseService.queryOne.mockResolvedValueOnce({ name: 'app_secrets' });
    mockDatabaseService.query.mockResolvedValueOnce([
      { name: 'id' },
      { name: 'name' },
      { name: 'value' },
    ]);
    mockDatabaseService.query.mockResolvedValueOnce([
      { id: 's2', name: 'other_key', value: 'db-only-value', is_active: 1 },
    ]);

    await manager.init();

    expect(manager.getSecret('other_key')).toBe('db-only-value');
  });
});
