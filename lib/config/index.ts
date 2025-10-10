// ============================================================================
// CONFIGURATION MODULE EXPORTS
// ============================================================================

// Main configuration service (singleton)
export { configService, ConfigService } from "./config-service";

// Configuration schemas and types
export {
  ConfigSchema,
  DatabaseConfigSchema,
  AuthConfigSchema,
  AppConfigSchema,
  AdminConfigSchema,
  FeatureFlagsSchema,
  validateConfig,
  getDefaultConfig,
  parseEnvironmentConfig,
  EnvironmentVariableMapping,
} from "./schemas";

// Edge Runtime configuration utilities
export * from "./edge-config";

// Type exports
export type {
  Config,
  DatabaseConfig,
  AuthConfig,
  AppConfig,
  AdminConfig,
  FeatureFlags,
  LogLevel,
  Environment,
} from "./schemas";

// Default export is the configuration service instance
import { configService as _configService } from "./config-service";
export default _configService;
