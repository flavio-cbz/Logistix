// Constantes et configuration centralisées pour les tests
export const TEST_CONFIG = {
  // URL de base pour les tests API
  BASE_URL: 'http://localhost:3000',
  
  // Configuration des timeouts
  DEFAULT_TIMEOUT: 5000,
  LONG_TIMEOUT: 15000,
  
  // Configuration de la base de données de test
  DATABASE_URL: ':memory:',
  
  // Utilisateur de test par défaut
  TEST_USER: {
    username: 'testuser',
    password: 'TestPass123!',
    role: 'user'
  },
  
  // Utilisateur admin de test
  TEST_ADMIN: {
    username: 'admin',
    password: 'AdminPass123!',
    role: 'admin'
  },
  
  // Configuration JWT
  JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters-long',
  COOKIE_NAME: 'test_session',
  
  // API Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
} as const;

/**
 * Utilitaire pour construire des URLs d'API
 */
export function buildApiUrl(endpoint: string): string {
  // Nettoyer l'endpoint en retirant les slashes en trop au début
  const cleanEndpoint = endpoint.replace(/^\/+/, '/');
  
  // S'assurer que BASE_URL ne finit pas par "/"
  const baseUrl = TEST_CONFIG.BASE_URL.replace(/\/$/, '');
  
  // Construire l'URL en s'assurant qu'il y a exactement un slash entre base et endpoint
  const finalEndpoint = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;
  
  return `${baseUrl}${finalEndpoint}`;
}

/**
 * Valide qu'une URL est bien formée
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Configuration pour les tests E2E
 */
export const E2E_CONFIG = {
  HEADLESS: process.env['CI'] === 'true', // Headless en CI
  VIEWPORT: { width: 1280, height: 720 },
  TIMEOUT: 30000,
} as const;