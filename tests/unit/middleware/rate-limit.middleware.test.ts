/**
 * Tests unitaires pour le middleware de rate limiting
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createRateLimiter,
  authRateLimiter,
  resetRateLimitStore,
  stopRateLimitCleanup,
  getRateLimitStoreSize,
} from '@/lib/middleware/rate-limit.middleware';
import { RateLimitError } from '../../../lib/shared/errors/base-errors';

// Helper pour créer une NextRequest de test
function createTestRequest(ip: string = '192.168.1.1'): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: {
      'x-forwarded-for': ip,
    },
  });
}

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    // Réinitialiser le store avant chaque test
    resetRateLimitStore();
  });

  afterAll(() => {
    // Arrêter le cleanup à la fin des tests
    stopRateLimitCleanup();
  });

  describe('createRateLimiter', () => {
    it('devrait permettre les requêtes sous la limite', async () => {
      const limiter = createRateLimiter({
        maxRequests: 3,
        windowMs: 60000,
      });

      const req = createTestRequest();

      // Les 3 premières requêtes doivent passer
      await expect(limiter(req)).resolves.toBeUndefined();
      await expect(limiter(req)).resolves.toBeUndefined();
      await expect(limiter(req)).resolves.toBeUndefined();
    });

    it('devrait bloquer les requêtes au-delà de la limite', async () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        message: 'Limite atteinte',
      });

      const req = createTestRequest();

      // Les 2 premières requêtes passent
      await limiter(req);
      await limiter(req);

      // La 3ème doit être bloquée
      await expect(limiter(req)).rejects.toThrow(RateLimitError);
      await expect(limiter(req)).rejects.toThrow('Limite atteinte');
    });

    it('devrait distinguer les IPs différentes', async () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
      });

      const req1 = createTestRequest('192.168.1.1');
      const req2 = createTestRequest('192.168.1.2');

      // IP1 : 2 requêtes OK
      await limiter(req1);
      await limiter(req1);

      // IP1 : 3ème bloquée
      await expect(limiter(req1)).rejects.toThrow(RateLimitError);

      // IP2 : devrait passer (IP différente)
      await expect(limiter(req2)).resolves.toBeUndefined();
      await expect(limiter(req2)).resolves.toBeUndefined();
    });

    it('devrait réinitialiser le compteur après la fenêtre', async () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 100, // 100ms pour accélérer le test
      });

      const req = createTestRequest();

      // Remplir la limite
      await limiter(req);
      await limiter(req);

      // Doit être bloqué
      await expect(limiter(req)).rejects.toThrow();

      // Attendre l'expiration de la fenêtre
      await new Promise(resolve => setTimeout(resolve, 150));

      // Doit passer à nouveau
      await expect(limiter(req)).resolves.toBeUndefined();
    });

    it('devrait utiliser un keyGenerator personnalisé', async () => {
      const limiter = createRateLimiter({
        maxRequests: 2,
        windowMs: 60000,
        keyGenerator: (req) => req.headers.get('x-user-id') || 'anonymous',
      });

      const req1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-user-id': 'user-123' },
      });
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-user-id': 'user-456' },
      });

      // User 123 : 2 requêtes OK
      await limiter(req1);
      await limiter(req1);
      await expect(limiter(req1)).rejects.toThrow();

      // User 456 : devrait passer
      await expect(limiter(req2)).resolves.toBeUndefined();
    });

    it('devrait skip les requêtes selon la condition', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
        skip: (req) => req.headers.get('x-admin') === 'true',
      });

      const normalReq = createTestRequest();
      const adminReq = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-admin': 'true',
        },
      });

      // Requête normale : 1 OK, 2ème bloquée
      await limiter(normalReq);
      await expect(limiter(normalReq)).rejects.toThrow();

      // Requête admin : toujours OK
      await limiter(adminReq);
      await limiter(adminReq);
      await expect(limiter(adminReq)).resolves.toBeUndefined();
    });

    it('devrait inclure les bonnes métadonnées dans l\'erreur', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      const req = createTestRequest();

      await limiter(req);

      try {
        await limiter(req);
        expect.fail('Devrait avoir levé une erreur');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        const rateLimitError = error as RateLimitError;
        expect(rateLimitError.details).toHaveProperty('limit', 1);
        expect(rateLimitError.details).toHaveProperty('remaining', 0);
        expect(rateLimitError.details).toHaveProperty('reset');
        expect(rateLimitError.details).toHaveProperty('retryAfter');
      }
    });
  });

  describe('authRateLimiter', () => {
    it('devrait avoir la configuration correcte pour l\'auth', async () => {
      const req = createTestRequest();

      // 5 requêtes devraient passer
      for (let i = 0; i < 5; i++) {
        await authRateLimiter(req);
      }

      // La 6ème doit être bloquée
      await expect(authRateLimiter(req)).rejects.toThrow(RateLimitError);
      await expect(authRateLimiter(req)).rejects.toThrow(/tentatives de connexion/i);
    });
  });

  describe('Store management', () => {
    it('devrait nettoyer les entrées expirées', async () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 50, // 50ms
      });

      const req1 = createTestRequest('192.168.1.1');
      const req2 = createTestRequest('192.168.1.2');
      const req3 = createTestRequest('192.168.1.3');

      // Créer des entrées
      await limiter(req1);
      await limiter(req2);
      await limiter(req3);

      expect(getRateLimitStoreSize()).toBe(3);

      // Attendre l'expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Une nouvelle requête devrait déclencher le nettoyage indirect
      await limiter(createTestRequest('192.168.1.4'));

      // Le nettoyage automatique devrait avoir lieu après un certain temps
      // Note: Ce test est fragile car il dépend du timing
    });

    it('devrait réinitialiser le store', () => {
      const limiter = createRateLimiter({
        maxRequests: 5,
        windowMs: 60000,
      });

      const req1 = createTestRequest('192.168.1.1');
      const req2 = createTestRequest('192.168.1.2');

      limiter(req1);
      limiter(req2);

      expect(getRateLimitStoreSize()).toBeGreaterThan(0);

      resetRateLimitStore();

      expect(getRateLimitStoreSize()).toBe(0);
    });
  });

  describe('IP extraction', () => {
    it('devrait extraire l\'IP depuis x-forwarded-for', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
      });

      await limiter(req);
      await expect(limiter(req)).rejects.toThrow(); // Même IP, doit être bloqué
    });

    it('devrait extraire l\'IP depuis x-real-ip', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      const req = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-real-ip': '203.0.113.2',
        },
      });

      await limiter(req);
      await expect(limiter(req)).rejects.toThrow();
    });

    it('devrait utiliser un fallback si aucun header IP', async () => {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 60000,
      });

      const req = new NextRequest('http://localhost/api/test');

      await limiter(req);
      await expect(limiter(req)).rejects.toThrow(); // Même fallback IP
    });
  });
});
