#!/usr/bin/env tsx

/**
 * Test final de validation de l'intégration Vinted
 * Ce test utilise les bons endpoints et valide complètement l'implémentation
 */

import { VintedAuthService } from '../../lib/services/auth/vinted-auth-service';
import { vintedCredentialService } from '../../lib/services/auth/vinted-credential-service';
import axios from 'axios';

// Cookie frais
const TEST_COOKIE = process.env.VINTED_TEST_COOKIE || '';

async function finalValidationTest() {

  let allTestsPassed = true;

  // 1. Test d'extraction des tokens
  const accessToken = VintedAuthService.extractAccessTokenFromCookie(TEST_COOKIE);
  const refreshToken = VintedAuthService.extractRefreshTokenFromCookie(TEST_COOKIE);
  
  if (accessToken && refreshToken) {
  } else {
    allTestsPassed = false;
  }

  // 2. Test de chiffrement
  try {
    const testData = 'test_cookie_data=value123';
    const encrypted = await vintedCredentialService.encrypt(testData);
    const decrypted = await vintedCredentialService.decrypt(encrypted);
    
    if (decrypted === testData) {
    } else {
      allTestsPassed = false;
    }
  } catch (error: any) {
    allTestsPassed = false;
  }

  // 3. Test de validation avec un meilleur endpoint
  try {
    const headers = {
      'Cookie': TEST_COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Tester avec l'endpoint qui a fonctionné dans le debug
    const response = await axios.get('https://www.vinted.fr/api/v2/users', {
      headers,
      timeout: 10000
    });

    if (response.status === 200 && response.data && Array.isArray(response.data)) {
    } else {
    }
  } catch (error: any) {
    if (error.response) {
    }
    allTestsPassed = false;
  }

  // 4. Test d'un endpoint d'analyse simple
  try {
    const headers = {
      'Cookie': TEST_COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    };

    // Tester un endpoint plus simple d'abord
    const response = await axios.get('https://www.vinted.fr/api/v2/catalogs', {
      headers,
      timeout: 10000
    });

    if (response.status === 200) {
    } else {
    }
  } catch (error: any) {
    if (error.response) {
    }
  }

  // 5. Test de renouvellement
  try {
    const authService = new VintedAuthService(TEST_COOKIE);
    const newTokens = await authService.refreshAccessToken();
    
    if (newTokens && newTokens.accessToken && newTokens.refreshToken) {
    } else {
    }
  } catch (error: any) {
  }

  // Résumé final
  
  if (allTestsPassed) {
  } else {
  }
}

finalValidationTest();