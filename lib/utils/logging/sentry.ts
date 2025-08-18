/**
 * Sentry Configuration
 * Optimized to avoid OpenTelemetry conflicts and webpack warnings
 */

// Import conditionnel pour éviter les warnings webpack en développement
let Sentry: typeof import('@sentry/node') | null = null;

async function loadSentry() {
  if (!Sentry && (process.env.NODE_ENV === 'production' || process.env.SENTRY_DSN)) {
    try {
      // Import dynamique pour éviter les warnings webpack
      Sentry = await import('@sentry/node');
    } catch (error) {
      // Sentry loading failed - will continue without it
    }
  }
  return Sentry;
}

async function initSentry() {
  // Ne charger Sentry qu'en production ou si explicitement configuré
  if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DSN) {
    // Sentry skipped in development mode
    return;
  }

  if (process.env.SENTRY_DSN) {
    const SentryModule = await loadSentry();
    
    if (SentryModule) {
      try {
        SentryModule.init({
          dsn: process.env.SENTRY_DSN,
          
          // Définir le taux d'échantillonnage des performances (0.0 - 1.0)
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, 
          
          // Définir le niveau d'environnement (ex: production, development)
          environment: process.env.NODE_ENV || 'development',

          // Activer les traces de débogage en développement
          debug: process.env.NODE_ENV === 'development',

          // Configuration des intégrations pour éviter les conflits OpenTelemetry
          integrations: (integrations) => {
            // Filtrer les intégrations problématiques
            return integrations.filter((integration) => {
              // Exclure les intégrations qui causent des conflits avec require-in-the-middle
              const name = integration.name;
              const problematicIntegrations = [
                'Http',
                'Express',
                'Postgres',
                'Mysql',
                'Mongo',
                'GraphQL'
              ];
              
              return !problematicIntegrations.includes(name);
            });
          },

          // Configuration des transports pour éviter les warnings
          beforeSend(event) {
            // Filtrer les erreurs liées à require-in-the-middle
            if (event.exception?.values?.[0]?.value?.includes('require-in-the-middle')) {
              return null; // Ne pas envoyer ces erreurs à Sentry
            }
            return event;
          },

          // Configuration des tags par défaut
          initialScope: {
            tags: {
              component: 'logistix-backend',
              version: process.env.npm_package_version || '1.0.0'
            }
          }
        });

        // Sentry initialized successfully
      } catch (error) {
        // Failed to initialize Sentry - will continue without it
      }
    }
  } else {
    // SENTRY_DSN is not set, Sentry will not be initialized
  }
}

export default initSentry;