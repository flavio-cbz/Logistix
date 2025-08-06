import { GET } from '../route';
import { vi } from 'vitest';
import { getSessionUser } from '@/lib/services/auth';
import { CatalogService } from '@/modules/metadata/catalog.service';
import { container } from '@/core/container';

// Mocks
vi.mock('@/lib/services/auth', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/core/container', () => {
  const mockCatalogService = {
    getAllCatalogs: vi.fn(),
  };
  const mockContainer = {
    get: vi.fn((name: string) => {
      if (name === 'catalogService') {
        return mockCatalogService;
      }
      return null;
    }),
    register: vi.fn(),
  };
  return { container: mockContainer };
});

describe('Metadata Catalogs API Route', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  let catalogServiceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as any).mockResolvedValue(mockUser);
    catalogServiceInstance = container.get('catalogService');
    (catalogServiceInstance.getAllCatalogs as any).mockResolvedValue([]);
  });

  it('devrait retourner tous les catalogues si l\'utilisateur est authentifié', async () => {
    const mockCatalogs = [{ id: 'cat1', code: 'c1', title: 'Catalog 1' }];
    (catalogServiceInstance.getAllCatalogs as any).mockResolvedValue(mockCatalogs);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockCatalogs);
    expect(getSessionUser).toHaveBeenCalledTimes(1);
    expect(catalogServiceInstance.getAllCatalogs).toHaveBeenCalledTimes(1);
  });

  it('devrait retourner 401 si l\'utilisateur n\'est pas authentifié', async () => {
    (getSessionUser as any).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ message: 'Non authentifié' });
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });

  it('devrait gérer les erreurs internes du serveur', async () => {
    (getSessionUser as any).mockResolvedValue(mockUser);
    (catalogServiceInstance.getAllCatalogs as any).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ message: 'Erreur interne du serveur' });
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });
});