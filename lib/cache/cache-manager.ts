/**
 * Cache Manager - Re-export from simple-cache for compatibility
 */

import { SimpleCache } from './simple-cache';

// Export the simple cache as the main cache manager
export const getCacheManager = () => new SimpleCache();

// Export default instance
export const cacheManager = new SimpleCache();

export default cacheManager;