import { getLogger, ILogger } from "@/lib/utils/logging/logger";
import { ParcelleService } from "./parcelle-service";
import { ParcelleRepository } from "@/lib/repositories";
import { DatabaseService } from "@/lib/database";

/**
 * Service factory function type
 */
type ServiceFactory<T = any> = () => T;

/**
 * Service constructor type
 */
type ServiceConstructor<T = any> = new (...args: any[]) => T;

/**
 * Service registration options
 */
interface ServiceRegistration<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Enhanced dependency injection container with proper service management
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  private readonly services = new Map<string, ServiceRegistration>();
  private readonly logger: ILogger;

  private constructor() {
    this.logger = getLogger("ServiceContainer");
  }

  /**
   * Convenience getter for ParcelleService (creates default instance if needed)
   */
  getParcelleService(): ParcelleService {
    if (this.has("ParcelleService")) {
      return this.get("ParcelleService");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new ParcelleRepository(databaseService);
    const service = new ParcelleService(repository);
    this.register("ParcelleService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for ProductService (creates default instance if needed)
   */
  getProductService(): any {
    if (this.has("ProductService")) {
      return this.get("ProductService");
    }

    // Import ProductService dynamically to avoid circular dependencies
    const { ProductService } = require('@/lib/application/services/product.service');
    const service = new ProductService();
    this.register("ProductService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for CaptchaSolverService (creates default instance if needed)
   */
  getCaptchaSolverService(): any {
    if (this.has("CaptchaSolverService")) {
      return this.get("CaptchaSolverService");
    }

    const { CaptchaSolverService } = require('@/lib/services/captcha-solver-service');
    const { SQLiteCaptchaAttemptRepository } = require('@/lib/infrastructure/repositories/sqlite-captcha-attempt-repository');
    const { SQLiteTrainingDataRepository } = require('@/lib/infrastructure/repositories/sqlite-training-data-repository');
    
    const attemptRepo = new SQLiteCaptchaAttemptRepository();
    const trainingRepo = new SQLiteTrainingDataRepository();
    const service = new CaptchaSolverService(attemptRepo, trainingRepo);
    
    this.register("CaptchaSolverService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for CaptchaTrainingService (creates default instance if needed)
   */
  getCaptchaTrainingService(): any {
    if (this.has("CaptchaTrainingService")) {
      return this.get("CaptchaTrainingService");
    }

    const { CaptchaTrainingService } = require('@/lib/services/captcha-training-service');
    const { SQLiteCaptchaAttemptRepository } = require('@/lib/infrastructure/repositories/sqlite-captcha-attempt-repository');
    const { SQLiteTrainingDataRepository } = require('@/lib/infrastructure/repositories/sqlite-training-data-repository');
    
    const attemptRepo = new SQLiteCaptchaAttemptRepository();
    const trainingRepo = new SQLiteTrainingDataRepository();
    const service = new CaptchaTrainingService(trainingRepo, attemptRepo);
    
    this.register("CaptchaTrainingService", () => service, true);
    return service;
  }

  /**
   * Gets the singleton instance of the service container
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Registers a service with a factory function
   */
  register<T>(
    name: string,
    factory: ServiceFactory<T>,
    singleton: boolean = true,
  ): void {
    if (this.services.has(name)) {
      this.logger.warn(
        `Service '${name}' is already registered. Overwriting existing registration.`,
      );
    }

    this.services.set(name, {
      factory,
      singleton,
      instance: undefined,
    });

    this.logger.debug(`Registered service: ${name}`, { singleton });
  }

  /**
   * Registers a service using a constructor function
   */
  registerClass<T>(
    name: string,
    constructor: ServiceConstructor<T>,
    dependencies: string[] = [],
    singleton: boolean = true,
  ): void {
    const factory = () => {
      const resolvedDependencies = dependencies.map((dep) => this.get(dep));
      return new constructor(...resolvedDependencies);
    };

    this.register(name, factory, singleton);
  }

  /**
   * Gets a service instance by name
   */
  get<T>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return existing instance for singletons
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    try {
      const instance = registration.factory();

      // Store instance for singletons
      if (registration.singleton) {
        registration.instance = instance;
      }

      this.logger.debug(`Created service instance: ${name}`, {
        singleton: registration.singleton,
      });
      return instance as T;
    } catch (error) {
      this.logger.error(`Failed to create service instance: ${name}`, {
        error,
      });
      throw new Error(
        `Failed to create service '${name}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Checks if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Resolves dependencies for a constructor and creates an instance
   */
  resolve<T>(constructor: ServiceConstructor<T>): T {
    // This is a simplified version - in a full DI container, you'd use reflection
    // or decorators to automatically resolve dependencies
    return new constructor();
  }

  /**
   * Unregisters a service
   */
  unregister(name: string): boolean {
    const existed = this.services.has(name);
    this.services.delete(name);

    if (existed) {
      this.logger.debug(`Unregistered service: ${name}`);
    }

    return existed;
  }

  /**
   * Clears all registered services (useful for testing)
   */
  clear(): void {
    const serviceCount = this.services.size;
    this.services.clear();
    this.logger.debug(`Cleared all services`, { clearedCount: serviceCount });
  }

  /**
   * Gets all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Gets service registration info (for debugging)
   */
  getServiceInfo(
    name: string,
  ): { exists: boolean; singleton: boolean; hasInstance: boolean } | null {
    const registration = this.services.get(name);

    if (!registration) {
      return null;
    }

    return {
      exists: true,
      singleton: registration.singleton,
      hasInstance: !!registration.instance,
    };
  }

  /**
   * Registers default services that are commonly used
   */
  registerDefaultServices(): void {
    this.logger.info("Registering default services...");

    // Register services here as they become available
    // Example:
    // this.registerClass('ProductService', ProductService, ['ProductRepository']);
    // this.registerClass('ParcelleService', ParcelleService, ['ParcelleRepository']);

    this.logger.info("Default services registered");
  }
}

/**
 * Global service container instance
 */
export const serviceContainer = ServiceContainer.getInstance();

/**
 * Convenience function to get a service
 */
export function getService<T>(name: string): T {
  return serviceContainer.get<T>(name);
}

/**
 * Convenience function to register a service
 */
export function registerService<T>(
  name: string,
  factory: ServiceFactory<T>,
  singleton: boolean = true,
): void {
  serviceContainer.register(name, factory, singleton);
}

/**
 * Convenience function to register a service class
 */
export function registerServiceClass<T>(
  name: string,
  constructor: ServiceConstructor<T>,
  dependencies: string[] = [],
  singleton: boolean = true,
): void {
  serviceContainer.registerClass(name, constructor, dependencies, singleton);
}
