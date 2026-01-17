import { getLogger, ILogger } from "@/lib/utils/logging/logger";
import { ParcelleService } from "./parcelle-service";
import { OrderService } from "./order-service";
import { AuthService } from "./auth-service";
import { ProductService } from "./product-service";
import { SuperbuySyncService } from "./superbuy-sync-service";
import { SuperbuyAutomationService } from "./superbuy/automation";
import { SearchService } from "./search-service";
import { StatisticsService } from "./statistics-service";
import { UserService } from "./user-service";
import { JobService } from "./job-service";
import { MarketAnalysisService } from "./market-analysis-service";

import { OrderRepository, ProductRepository, UserRepository, SuperbuySyncRepository, JobRepository, ParcelRepository } from "@/lib/repositories";
import { DatabaseService } from "@/lib/database";

/**
 * Service factory function type
 */
type ServiceFactory<T = unknown> = () => T;

/**
 * Service constructor type
 */
type ServiceConstructor<T = unknown> = new (...args: unknown[]) => T;

/**
 * Service registration options
 */
interface ServiceRegistration<T = unknown> {
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
    const repository = new ParcelRepository(databaseService);
    const service = new ParcelleService(repository);
    this.register("ParcelleService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for OrderService (creates default instance if needed)
   */
  getOrderService(): OrderService {
    if (this.has("OrderService")) {
      return this.get("OrderService");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new OrderRepository(databaseService);
    const service = new OrderService(repository);
    this.register("OrderService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for AuthService (creates default instance if needed)
   */
  getAuthService(): AuthService {
    if (this.has("AuthService")) {
      return this.get("AuthService");
    }

    const service = new AuthService();
    this.register("AuthService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for SuperbuySyncService
   */
  getSuperbuySyncService(): SuperbuySyncService {
    if (this.has("SuperbuySyncService")) {
      return this.get("SuperbuySyncService");
    }

    // The new signature only requires SuperbuySyncRepository and SuperbuyAutomationService
    const service = new SuperbuySyncService(
      this.getSuperbuySyncRepository(),
      this.getSuperbuyAutomationService(),
      this.getJobService()
    );
    this.register("SuperbuySyncService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for SuperbuySyncRepository
   */
  getSuperbuySyncRepository(): SuperbuySyncRepository {
    if (this.has("SuperbuySyncRepository")) {
      return this.get("SuperbuySyncRepository");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new SuperbuySyncRepository(databaseService);
    this.register("SuperbuySyncRepository", () => repository, true);
    return repository;
  }

  /**
   * Convenience getter for ParcelRepository (replacing getParcelsRepository)
   */
  getParcelRepository(): ParcelRepository {
    if (this.has("ParcelRepository")) {
      return this.get("ParcelRepository");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new ParcelRepository(databaseService);
    this.register("ParcelRepository", () => repository, true);
    return repository;
  }

  /**
   * Convenience getter for SuperbuyAutomationService
   */
  getSuperbuyAutomationService(): SuperbuyAutomationService {
    if (this.has("SuperbuyAutomationService")) {
      return this.get("SuperbuyAutomationService");
    }

    const parcelsRepository = this.getParcelRepository();
    const service = new SuperbuyAutomationService(parcelsRepository);
    this.register("SuperbuyAutomationService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for ProductService (creates default instance if needed)
   */
  getProductService(): ProductService {
    if (this.has("ProductService")) {
      return this.get("ProductService");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new ProductRepository(databaseService);
    const service = new ProductService(repository);
    this.register("ProductService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for SearchService
   */
  getSearchService(): SearchService {
    if (this.has("SearchService")) {
      return this.get("SearchService");
    }

    const databaseService = DatabaseService.getInstance();
    const productRepository = new ProductRepository(databaseService);
    const parcelleRepository = new ParcelRepository(databaseService);
    const userRepository = new UserRepository(databaseService);

    const service = new SearchService(productRepository, parcelleRepository, userRepository);
    this.register("SearchService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for StatisticsService
   */
  getStatisticsService(): StatisticsService {
    if (this.has("StatisticsService")) {
      return this.get("StatisticsService");
    }

    const service = new StatisticsService();
    this.register("StatisticsService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for UserService
   */
  getUserService(): UserService {
    if (this.has("UserService")) {
      return this.get("UserService");
    }

    const service = new UserService();
    this.register("UserService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for UserRepository
   */
  getUserRepository(): UserRepository {
    if (this.has("UserRepository")) {
      return this.get("UserRepository");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new UserRepository(databaseService);
    this.register("UserRepository", () => repository, true);
    return repository;
  }

  /**
   * Convenience getter for ProductRepository
   */
  getProductRepository(): ProductRepository {
    if (this.has("ProductRepository")) {
      return this.get("ProductRepository");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new ProductRepository(databaseService);
    this.register("ProductRepository", () => repository, true);
    return repository;
  }

  /**
   * Convenience getter for ParcelleRepository (Legacy alias)
   */
  getParcelleRepository(): ParcelRepository {
    return this.getParcelRepository();
  }



  /**
   * Gets the singleton instance of the service container
   */
  /**
   * Convenience getter for MarketAnalysisService
   */
  getMarketAnalysisService(): MarketAnalysisService {
    if (this.has("MarketAnalysisService")) {
      return this.get("MarketAnalysisService");
    }

    const service = new MarketAnalysisService(this.getProductRepository());
    this.register("MarketAnalysisService", () => service, true);
    return service;
  }

  /**
   * Convenience getter for JobRepository
   */
  getJobRepository(): JobRepository {
    if (this.has("JobRepository")) {
      return this.get("JobRepository");
    }

    const databaseService = DatabaseService.getInstance();
    const repository = new JobRepository(databaseService);
    this.register("JobRepository", () => repository, true);
    return repository;
  }

  /**
   * Convenience getter for JobService
   */
  getJobService(): JobService {
    if (this.has("JobService")) {
      return this.get("JobService");
    }

    const repository = this.getJobRepository();
    const service = new JobService(repository);
    this.register("JobService", () => service, true);
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
