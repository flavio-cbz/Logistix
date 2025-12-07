/**
 * Tests d'intégration pour le rate limiting sur les endpoints auth
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleLogin } from '@/lib/interfaces/http/login.handler';
import { handleRegister } from '@/lib/interfaces/http/register.handler';
import { resetRateLimitStore } from '@/lib/middleware/rate-limit.middleware';
import { databaseService } from '@/lib/services/database/db';

// Helper pour créer une requête de test
function createLoginRequest(username: string, password: string, ip: string = '192.168.1.100'): NextRequest {
  return new NextRequest('http://localhost/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ username, password }),
  });
}

function createRegisterRequest(username: string, password: string): NextRequest {
  return new NextRequest('http://localhost/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
}

describe('Rate Limiting Integration - Auth Endpoints', () => {
  // Initialiser la base de données avant tous les tests
  beforeAll(async () => {
    // Force l'initialisation du schéma DB via une requête simple
    await databaseService.execute('SELECT 1', [], 'init-test-db');
  });

  beforeEach(async () => {
    // Nettoyer le rate limit store
    resetRateLimitStore();

    // Nettoyer la DB (respecter les FK: sessions avant users)
    // On supprime tout pour éviter les conflits entre tests
    await databaseService.execute('DELETE FROM user_sessions', [], 'cleanup-sessions');
    await databaseService.execute('DELETE FROM users WHERE username LIKE ?', ['ratelimit_user_%'], 'cleanup-users');
  });

  describe('POST /api/v1/auth/login', () => {
    it('devrait permettre 5 tentatives de login depuis une même IP', async () => {
      // Créer un utilisateur de test
      const username = `ratelimit_user_${Date.now()}`;
      const password = 'TestPassword123!';

      const registerReq = createRegisterRequest(username, password);
      await handleRegister(registerReq);

      // 5 tentatives doivent passer (même avec mauvais password)
      for (let i = 0; i < 5; i++) {
        const loginReq = createLoginRequest(username, 'wrong_password');
        const response = await handleLogin(loginReq);

        // Doit retourner 401 (mauvais password) mais pas 429 (rate limit)
        expect(response.status).toBe(401);
      }
    });

    it('devrait bloquer la 6ème tentative de login depuis une même IP', async () => {
      const username = `ratelimit_user_${Date.now()}`;
      const password = 'TestPassword123!';

      const registerReq = createRegisterRequest(username, password);
      await handleRegister(registerReq);

      // Faire 5 tentatives (limite)
      for (let i = 0; i < 5; i++) {
        const loginReq = createLoginRequest(username, 'wrong_password', '192.168.1.101');
        await handleLogin(loginReq);
      }

      // La 6ème doit être rate limitée
      const sixthReq = createLoginRequest(username, 'wrong_password', '192.168.1.101');
      const response = await handleLogin(sixthReq);

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toMatch(/tentatives/i);
    });

    it('devrait distinguer les IPs différentes', async () => {
      const username = `ratelimit_user_${Date.now()}`;
      const password = 'TestPassword123!';

      const registerReq = createRegisterRequest(username, password);
      await handleRegister(registerReq);

      // IP1 : faire 5 tentatives (atteindre la limite)
      for (let i = 0; i < 5; i++) {
        const loginReq = createLoginRequest(username, 'wrong_password', '192.168.1.102');
        await handleLogin(loginReq);
      }

      // IP1 : 6ème tentative doit être bloquée
      const ip1Req = createLoginRequest(username, 'wrong_password', '192.168.1.102');
      const ip1Response = await handleLogin(ip1Req);
      expect(ip1Response.status).toBe(429);

      // IP2 : devrait passer (IP différente)
      const ip2Req = createLoginRequest(username, 'wrong_password', '192.168.1.103');
      const ip2Response = await handleLogin(ip2Req);
      expect(ip2Response.status).toBe(401); // Pas 429, juste wrong password
    });

    it('devrait permettre le login réussi même après des échecs', async () => {
      const username = `ratelimit_user_${Date.now()}`;
      const password = 'TestPassword123!';

      const registerReq = createRegisterRequest(username, password);
      await handleRegister(registerReq);

      // Faire 4 tentatives échouées
      for (let i = 0; i < 4; i++) {
        const loginReq = createLoginRequest(username, 'wrong_password', '192.168.1.104');
        await handleLogin(loginReq);
      }

      // La 5ème avec le bon password doit passer
      const validReq = createLoginRequest(username, password, '192.168.1.104');
      const response = await handleLogin(validReq);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.username).toBe(username);
    });

    it('devrait inclure les headers de rate limit dans l\'erreur 429', async () => {
      const username = `ratelimit_user_${Date.now()}`;
      const password = 'TestPassword123!';

      const registerReq = createRegisterRequest(username, password);
      await handleRegister(registerReq);

      // Atteindre la limite
      for (let i = 0; i < 5; i++) {
        await handleLogin(createLoginRequest(username, 'WrongPassword123', '192.168.1.105'));
      }

      // Tenter une 6ème
      const response = await handleLogin(createLoginRequest(username, 'WrongPassword123', '192.168.1.105'));

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.details).toBeDefined();

      // Vérifier que details contient les infos de rate limit
      expect(data.error.details.rateLimitDetails).toMatchObject({
        limit: expect.any(Number),
        remaining: 0,
        reset: expect.any(Number),
        retryAfter: expect.any(Number),
      });
    });
  });

  describe('Rate limit ne bloque pas les opérations légitimes', () => {
    it('devrait permettre plusieurs logins réussis consécutifs', async () => {
      const username = `multi_login_${Date.now()}`;
      const password = 'TestPassword123!';

      // Créer un utilisateur
      await handleRegister(createRegisterRequest(username, password));

      // Faire 3 logins réussis consécutifs (simule refresh de page, etc.)
      for (let i = 0; i < 3; i++) {
        const loginReq = createLoginRequest(username, password, '192.168.1.106');
        const response = await handleLogin(loginReq);

        expect(response.status).toBe(200);
      }
    });
  });
});
