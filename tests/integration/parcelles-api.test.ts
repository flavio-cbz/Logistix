/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listParcellesRoute, POST as createParcelleRoute } from '@/app/api/v1/parcelles/route';
import { PATCH as updateParcelleRoute, DELETE as deleteParcelleRoute } from '@/app/api/v1/parcelles/[id]/route';
import { extractJsonResponse, createMockRequest } from './api-test-setup';
import { AuthError } from '../../lib/shared/errors/base-errors';

const mockRequireAuth = vi.fn();
const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('@/lib/middleware/auth-middleware', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock('@/lib/services/database/db', () => ({
  databaseService: {
    query: (...args: unknown[]) => mockQuery(...args),
    queryOne: (...args: unknown[]) => mockQueryOne(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    transaction: vi.fn(),
  },
}));

const BASE_URL = 'http://localhost:3000/api/v1/parcelles';
const ISO_NOW = new Date().toISOString();

const buildParcelleRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'parcel-1',
  userId: 'user-1',
  numero: 'TRACK123',
  transporteur: 'DHL',
  nom: 'Colis Test',
  statut: 'en_transit',
  actif: 1,
  prixAchat: 50,
  poids: 1.2,
  prixTotal: 55,
  prixParGramme: 0.0458,
  createdAt: ISO_NOW,
  updatedAt: ISO_NOW,
  ...overrides,
});

describe('API Parcelles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' } });
  });

  describe('GET /api/v1/parcelles', () => {
    it('retourne les parcelles de l’utilisateur authentifié', async () => {
      mockQuery.mockResolvedValueOnce([
        buildParcelleRow(),
        buildParcelleRow({ id: 'parcel-2', numero: 'TRACK456' }),
      ]);

      const request = createMockRequest('GET', BASE_URL);
      const response = await listParcellesRoute(request as NextRequest);
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data).toBeDefined();
      expect(payload.data.parcelles).toHaveLength(2);
      expect(payload.data.parcelles[0]).toMatchObject({
        id: 'parcel-1',
        numero: 'TRACK123',
        transporteur: 'DHL',
        nom: 'Colis Test',
      });
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('retourne 401 quand la session est invalide', async () => {
  mockRequireAuth.mockRejectedValueOnce(new AuthError('Authentication required'));

      const request = createMockRequest('GET', BASE_URL);
      const response = await listParcellesRoute(request as NextRequest);
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(401);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('AUTH_ERROR');
    });
  });

  describe('POST /api/v1/parcelles', () => {
    it('crée une parcelle et retourne la ressource', async () => {
      const createdRow = buildParcelleRow();

      mockQueryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdRow);
      mockExecute.mockResolvedValueOnce({ changes: 1 });

      const requestBody = {
        numero: 'TRACK123',
        transporteur: 'DHL',
        nom: 'Colis Test',
        statut: 'en_transit',
        poids: 1.2,
        prixAchat: 50,
      };

      const request = createMockRequest('POST', BASE_URL, requestBody);
      const response = await createParcelleRoute(request as NextRequest);
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(201);
      expect(payload.success).toBe(true);
      expect(payload.data.parcelle).toMatchObject({
        numero: 'TRACK123',
        transporteur: 'DHL',
        nom: 'Colis Test',
        statut: 'en_transit',
      });
      expect(mockExecute).toHaveBeenCalled();
      expect(mockQueryOne).toHaveBeenCalledTimes(2);
    });

    it('retourne 409 si le numéro existe déjà', async () => {
      mockQueryOne.mockResolvedValueOnce(buildParcelleRow());

      const requestBody = {
        numero: 'TRACK123',
        transporteur: 'DHL',
        nom: 'Colis Test',
        statut: 'en_transit',
      };

      const request = createMockRequest('POST', BASE_URL, requestBody);
      const response = await createParcelleRoute(request as NextRequest);
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(409);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('CONFLICT');
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/parcelles/:id', () => {
    it('met à jour une parcelle existante', async () => {
      const existingRow = buildParcelleRow();
      const updatedRow = buildParcelleRow({
        nom: 'Colis Modifié',
        statut: 'livré',
        actif: 0,
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      });

      mockQueryOne
        .mockResolvedValueOnce(existingRow)
        .mockResolvedValueOnce(updatedRow);
      mockExecute.mockResolvedValueOnce({ changes: 1 });

      const requestBody = {
        nom: ' Colis Modifié ',
        statut: 'livré',
        actif: false,
      };

      const request = createMockRequest('PATCH', `${BASE_URL}/${existingRow.id}`, requestBody);
      const response = await updateParcelleRoute(request as NextRequest, { params: { id: existingRow.id } });
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.parcelle.nom).toBe('Colis Modifié');
      expect(payload.data.parcelle.actif).toBe(false);
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockQueryOne).toHaveBeenCalledTimes(2);
    });

    it('retourne 409 quand le numéro est déjà utilisé', async () => {
      const existingRow = buildParcelleRow();
      const conflictingRow = buildParcelleRow({ id: 'parcel-2', numero: 'TRACK999' });

      mockQueryOne
        .mockResolvedValueOnce(existingRow)
        .mockResolvedValueOnce(conflictingRow);

      const requestBody = { numero: 'TRACK999' };
      const request = createMockRequest('PATCH', `${BASE_URL}/${existingRow.id}`, requestBody);

      const response = await updateParcelleRoute(request as NextRequest, { params: { id: existingRow.id } });
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(409);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('CONFLICT');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('retourne 404 quand la parcelle est introuvable', async () => {
      mockQueryOne.mockResolvedValueOnce(null);

      const request = createMockRequest('PATCH', `${BASE_URL}/unknown`, { nom: 'Test' });
      const response = await updateParcelleRoute(request as NextRequest, { params: { id: 'unknown' } });
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(404);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    });

  it('retourne 422 quand aucune donnée valide n’est fournie', async () => {
      const request = createMockRequest('PATCH', `${BASE_URL}/parcel-1`, {});
      const response = await updateParcelleRoute(request as NextRequest, { params: { id: 'parcel-1' } });
      const payload = await extractJsonResponse(response);

  expect(response.status).toBe(422);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('VALIDATION_ERROR');
      expect(mockQueryOne).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/parcelles/:id', () => {
    it('supprime une parcelle existante', async () => {
      const existingRow = buildParcelleRow();
      mockQueryOne.mockResolvedValueOnce(existingRow);
      mockExecute.mockResolvedValueOnce({ changes: 1 });

      const request = createMockRequest('DELETE', `${BASE_URL}/${existingRow.id}`);
      const response = await deleteParcelleRoute(request as NextRequest, { params: { id: existingRow.id } });
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data.deleted).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('retourne 404 si la parcelle n’existe pas', async () => {
      mockQueryOne.mockResolvedValueOnce(null);

      const request = createMockRequest('DELETE', `${BASE_URL}/unknown`);
      const response = await deleteParcelleRoute(request as NextRequest, { params: { id: 'unknown' } });
      const payload = await extractJsonResponse(response);

      expect(response.status).toBe(404);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('NOT_FOUND');
    });

  it('retourne 422 si l’identifiant est invalide', async () => {
      const request = createMockRequest('DELETE', `${BASE_URL}/   `);
      const response = await deleteParcelleRoute(request as NextRequest, { params: { id: '   ' } });
      const payload = await extractJsonResponse(response);

  expect(response.status).toBe(422);
      expect(payload.success).toBe(false);
      expect(payload.error.code).toBe('VALIDATION_ERROR');
      expect(mockQueryOne).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });
});
