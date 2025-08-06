// Logging utilities
export { getLogger, logger } from './logger';
export type { ILogger } from './logger';
export { SimpleLogger, getLogger as getSimpleLogger, logger as simpleLogger } from './simple-logger';
// Pour éviter les warnings Webpack, importez explicitement './sentry' uniquement côté serveur.
// Specialized loggers
export {
  databaseLogger,
  apiLogger,
  authLogger,
  marketAnalysisLogger,
  vintedLogger,
  performanceLogger,
  securityLogger,
  cacheLogger,
  fsLogger,
  schedulerLogger,
  createRequestLogger,
  PerformanceTimer,
  DatabaseQueryLogger,
  ApiRequestLogger,
  dbQueryLogger,
  apiRequestLogger
} from './specialized-loggers';
