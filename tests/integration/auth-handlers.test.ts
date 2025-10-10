/**
 * Tests d'intégration pour les handlers d'authentification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { handleRegister } from '@/lib/interfaces/http/register.handler';
import { handleLogin } from '@/lib/interfaces/http/login.handler';
import { handleValidateSession } from '@/lib/interfaces/http/validate-session.handler';
import { handleLogout } from '@/lib/interfaces/http/logout.handler';
import { databaseService } from '@/lib/services/database/db';
import { getCookieName } from '@/lib/config/edge-config';

describe('Auth Handlers Integration', () => {
  const TEST_USERNAME = 'testuser_' + Date.now();
  const TEST_PASSWORD = 'password123';

  // Helper pour nettoyer la DB après les tests
  afterEach(async () => {
    await databaseService.execute(
      'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username = ?)',
      [TEST_USERNAME],
      'cleanup-test-sessions'
    );
    await databaseService.execute(
      'DELETE FROM users WHERE username = ?',
      [TEST_USERNAME],
      'cleanup-test-users'
    );
  });

  describe('POST /api/v1/auth/register', () => {
    it('inscrit un nouvel utilisateur avec succès', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleRegister(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.username).toBe(TEST_USERNAME);
      expect(json.data.id).toBeDefined();
    });

    it('retourne 409 pour un username déjà existant', async () => {
      // Créer d'abord un utilisateur
      const req1 = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await handleRegister(req1);

      // Tenter de créer le même utilisateur
      const req2 = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: 'anotherpass',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleRegister(req2);
      const json = await response.json();

      expect(response.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it('retourne 422 pour un username invalide', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'a', // Trop court
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleRegister(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
    });

    it('retourne 422 pour un password invalide', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: '12345', // Trop court
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleRegister(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Créer un utilisateur pour les tests de login
      const req = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await handleRegister(req);
    });

    it('connecte un utilisateur avec des credentials valides', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleLogin(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.username).toBe(TEST_USERNAME);
      expect(json.data.userId).toBeDefined();
      expect(json.data.expiresAt).toBeDefined();

      // Vérifier que le cookie de session a été créé
      const cookieName = getCookieName();
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain(cookieName);
    });

    it('retourne 401 pour un username inexistant', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent_user',
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleLogin(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it('retourne 401 pour un mot de passe incorrect', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: 'wrongpassword',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await handleLogin(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/validate-session', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Créer un utilisateur et se connecter
      const registerReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await handleRegister(registerReq);

      const loginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const loginResponse = await handleLogin(loginReq);

      // Extraire le sessionId du cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      const cookieName = getCookieName();
      const match = setCookieHeader?.match(new RegExp(`${cookieName}=([^;]+)`));
      sessionId = match ? match[1] : '';
    });

    it('valide une session active', async () => {
      const cookieName = getCookieName();
      const req = new NextRequest('http://localhost:3000/api/v1/auth/validate-session', {
        method: 'GET',
        headers: {
          Cookie: `${cookieName}=${sessionId}`,
        },
      });

      const response = await handleValidateSession(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user).toBeDefined();
      expect(json.data.user.username).toBe(TEST_USERNAME);
      expect(json.data.session).toBeDefined();
    });

    it('retourne 401 pour une session manquante', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/validate-session', {
        method: 'GET',
      });

      const response = await handleValidateSession(req);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Créer un utilisateur et se connecter
      const registerReq = new NextRequest('http://localhost:3000/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await handleRegister(registerReq);

      const loginReq = new NextRequest('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const loginResponse = await handleLogin(loginReq);

      // Extraire le sessionId du cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      const cookieName = getCookieName();
      const match = setCookieHeader?.match(new RegExp(`${cookieName}=([^;]+)`));
      sessionId = match ? match[1] : '';
    });

    it('déconnecte un utilisateur avec succès', async () => {
      const cookieName = getCookieName();
      const req = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `${cookieName}=${sessionId}`,
        },
      });

      const response = await handleLogout(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      // Vérifier que le cookie a été supprimé (Expires au passé ou Max-Age=0)
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).toContain(cookieName);
      // Vérifier que le cookie est expiré (soit Max-Age=0, soit Expires au passé)
      const isExpired = 
        setCookieHeader!.includes('Max-Age=0') ||
        setCookieHeader!.includes('Expires=Thu, 01 Jan 1970');
      expect(isExpired).toBe(true);
    });

    it('réussit même sans cookie de session', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/logout', {
        method: 'POST',
      });

      const response = await handleLogout(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});
