// core/container.ts

type Factory<T> = () => T;

class Container {
  private services = new Map<string, Factory<any>>();
  private instances = new Map<string, any>();

  register<T>(name: string, factory: Factory<T>): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered.`);
    }
    this.services.set(name, factory);
  }

  get<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name) as T;
    }

    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found.`);
    }

    const instance = factory();
    this.instances.set(name, instance);
    return instance;
  }
}

export const container = new Container();