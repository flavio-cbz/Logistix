import { TestConfiguration } from './types';
import { TEST_PRODUCTS, DEFAULT_TIMEOUT_SETTINGS, VALIDATION_CONSTANTS, ENV_KEYS } from '@/lib/constants/config';

/**
 * Default test configuration factory
 */
export function createDefaultTestConfiguration(): TestConfiguration {
  // Support both VINTED_ACCESS_TOKEN and VINTED_TOKEN for compatibility
  const vintedToken = process.env[ENV_KEYS.VINTED_API_TOKEN] || process.env[ENV_KEYS.VINTED_TOKEN_FALLBACK] || "";
  
  return {
    vintedApiToken: vintedToken,
    testProducts: TEST_PRODUCTS,
    debugMode: process.env[ENV_KEYS.DEBUG_MODE] === 'true',
    timeoutSettings: {
      apiCallTimeout: parseInt(process.env[ENV_KEYS.API_TIMEOUT] || String(DEFAULT_TIMEOUT_SETTINGS.apiCallTimeout)),
      analysisTimeout: parseInt(process.env[ENV_KEYS.ANALYSIS_TIMEOUT] || String(DEFAULT_TIMEOUT_SETTINGS.analysisTimeout)),
      pollingInterval: DEFAULT_TIMEOUT_SETTINGS.pollingInterval,
      maxRetries: parseInt(process.env[ENV_KEYS.MAX_RETRIES] || String(DEFAULT_TIMEOUT_SETTINGS.maxRetries))
    }
  };
}

/**
 * Validation configuration validator
 */
export function validateTestConfiguration(config: TestConfiguration): string[] {
  const errors: string[] = [];
  
  // Validate token
  if (!config.vintedApiToken) {
    errors.push("Token API Vinted manquant - configurez VINTED_ACCESS_TOKEN");
  } else if (config.vintedApiToken.length < VALIDATION_CONSTANTS.API_VALIDATION.MIN_TOKEN_LENGTH) {
    errors.push("Token API Vinted trop court - vérifiez la validité du token");
  }
  
  // Validate test products
  if (!config.testProducts || config.testProducts.length === 0) {
    errors.push("Aucun produit de test configuré");
  } else {
    config.testProducts.forEach((product, index) => {
      if (!product.name) {
        errors.push(`Produit ${index + 1}: nom manquant`);
      }
      if (!product.expectedPriceRange || product.expectedPriceRange.min >= product.expectedPriceRange.max) {
        errors.push(`Produit ${product.name}: fourchette de prix invalide`);
      }
      if (!product.expectedPriceRange?.currency) {
        errors.push(`Produit ${product.name}: devise manquante`);
      }
    });
  }
  
  // Validate timeout settings
  if (config.timeoutSettings.apiCallTimeout <= 0) {
    errors.push("Timeout API invalide - doit être positif");
  }
  if (config.timeoutSettings.analysisTimeout <= 0) {
    errors.push("Timeout d'analyse invalide - doit être positif");
  }
  if (config.timeoutSettings.pollingInterval <= 0) {
    errors.push("Intervalle de polling invalide - doit être positif");
  }
  if (config.timeoutSettings.maxRetries < 0) {
    errors.push("Nombre de tentatives invalide - doit être positif ou nul");
  }
  
  return errors;
}