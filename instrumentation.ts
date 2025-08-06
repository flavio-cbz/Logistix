/**
 * Next.js Instrumentation Hook
 * Used for initializing monitoring and logging services
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Initialize Sentry with optimized configuration
      const { default: initSentry } = await import('./lib/utils/logging/sentry');
      await initSentry();
      
      // Initialize other monitoring services if needed
      console.log('Instrumentation initialized successfully');
    } catch (error) {
      console.error('Failed to initialize instrumentation:', error);
    }
  }
}