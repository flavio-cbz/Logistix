/**
 * Debug utility to test token parsing
 */

import { getLogger } from '@/lib/utils/logging/simple-logger';

const logger = getLogger('TokenDebug');

export function debugToken(tokenToDebug?: string) {
  const rawToken = tokenToDebug || process.env.VINTED_TOKEN || "";
  const token = rawToken.trim().replace(/\s+/g, '');


  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        
        // Try to decode payload
        const payload = parts[1] || "";
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
        const parsed = JSON.parse(decoded);
        
        return parsed;
      }
    } catch (error) {
      logger.error('Error parsing token', error);
    }
  }
  return null;
}

// Only run debug if called directly (for backward compatibility)
if (require.main === module) {
  debugToken();
}