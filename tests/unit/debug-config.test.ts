/**
 * Tests unitaires pour débogger la configuration des tests
 */

import { describe, it, expect } from 'vitest';
import { TEST_CONFIG } from '../config/test-config';

describe('Débogage de la configuration', () => {
  it('devrait avoir une BASE_URL correcte', () => {
    console.log('TEST_CONFIG:', JSON.stringify(TEST_CONFIG, null, 2));
    expect(TEST_CONFIG.BASE_URL).toBe('http://localhost:3000');
  });

  it('devrait pouvoir construire une URL basique', () => {
    const result = `/test`;
    const baseUrl = TEST_CONFIG.BASE_URL.replace(/\/$/, '');
    const fullUrl = `${baseUrl}${result}`;
    
    console.log('baseUrl:', baseUrl);
    console.log('result:', result);
    console.log('fullUrl:', fullUrl);
    
    expect(fullUrl).toBe('http://localhost:3000/test');
  });
});