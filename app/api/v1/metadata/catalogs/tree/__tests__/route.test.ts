import { GET } from '../route';
import { NextRequest } from 'next/server';
import { vi } from 'vitest';
import { getSessionUser } from '@/lib/services/auth';
import { container } from '@/core/container';

// Mocks
vi.mock('@/lib/services/auth', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/core/container', () => {
  const mockCatalogService = {
    getCatalogTree: vi.fn(),
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


describe('Metadata Catalogs Tree API Route', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' };
  let catalogServiceInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (getSessionUser as any).mockResolvedValue(mockUser);
    catalogServiceInstance = container.get('catalogService');
    (catalogServiceInstance.getCatalogTree as any).mockResolvedValue([]);
  });

  it('devrait retourner l\'arborescence des catalogues si l\'utilisateur est authentifié et le paramètre tree est true', async () => {
    const mockCatalogTree = [{ id: 'cat1', title: 'Parent', children: [] }];
    (catalogServiceInstance.getCatalogTree as any).mockResolvedValue(mockCatalogTree);

    const mockRequest = { url: 'http://localhost/api/v1/metadata/catalogs/tree?tree=true' } as unknown as Request;
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockCatalogTree);
    expect(getSessionUser).toHaveBeenCalledTimes(1);
    expect(catalogServiceInstance.getCatalogTree).toHaveBeenCalledTimes(1);
  });

  it('devrait retourner 400 si le paramètre tree est manquant ou invalide', async () => {
    const mockRequest = { url: 'http://localhost/api/v1/metadata/catalogs/tree' } as unknown as Request; // tree manquant
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ message: "Paramètre 'tree=true' manquant ou invalide" });
    expect(getSessionUser).not.toHaveBeenCalled();
  });

  it('devrait retourner 401 si l\'utilisateur n\'est pas authentifié', async () => {
    (getSessionUser as any).mockResolvedValue(null);

    const mockRequest = { url: 'http://localhost/api/v1/metadata/catalogs/tree?tree=true' } as unknown as Request;
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ message: 'Non authentifié' });
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });

  it('devrait gérer les erreurs internes du serveur', async () => {
    (getSessionUser as any).mockResolvedValue(mockUser);
    (catalogServiceInstance.getCatalogTree as any).mockRejectedValue(new Error('Database error'));

    const mockRequest = { url: 'http://localhost/api/v1/metadata/catalogs/tree?tree=true' } as unknown as Request;
    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ message: 'Erreur interne du serveur' });
    expect(getSessionUser).toHaveBeenCalledTimes(1);
  });
});