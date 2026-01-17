import { logger } from "@/lib/utils/logging/logger";

// Safer mock type that allows chaining but fails on invalid property access at runtime if needed,
// though here we just want it to be compatible with Drizzle's chaining.
// We use 'unknown' to avoid 'any' but still allow flexibility for the mock.
type MockChain = {
    [key: string]: ((...args: unknown[]) => MockChain) | MockChain | Promise<unknown>;
} & Promise<unknown>;

/**
 * Interface for the fallback database service
 * Used when the primary database (SQLite) is unavailable
 */
export interface FallbackDatabaseService {
    initializeDatabase(): Promise<void>;
    queryMany<T>(query: string, params?: unknown[]): Promise<T[]>;
    queryOne<T>(query: string, params?: unknown[]): Promise<T | null>;
    execute?(query: string, params?: unknown[]): Promise<void>;
    // Mock Drizzle methods for type compatibility
    select: MockChain;
    insert: MockChain;
    update: MockChain;
    delete: MockChain;
    transaction: (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    query: Record<string, MockChain>;
}

/**
 * Fallback Database implementation
 * Provides safe degradation when SQLite is not available
 */
class FallbackDb implements FallbackDatabaseService {
    private isInitialized = false;

    // Recursive proxy to mock any Drizzle query chain
    private mockProxy: MockChain;

    public select: MockChain;
    public insert: MockChain;
    public update: MockChain;
    public delete: MockChain;
    public transaction: (cb: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
    public query: Record<string, MockChain>; // Simplified type for query proxy

    constructor() {
        // Create a handler that returns the proxy itself for any property access or function call
        const handler: ProxyHandler<object> = {
            get: (_target, prop) => {
                // Return promises for finalizers
                if (prop === 'then') return undefined; // Let it behave like a non-promise initially unless strictly needed, but Drizzle chains end with .all() or .execute() which return Promises.
                // Actually, Drizzle queries are thenables.
                if (prop === 'execute' || prop === 'all' || prop === 'get' || prop === 'findMany' || prop === 'findFirst') {
                    return () => Promise.resolve(prop === 'findFirst' || prop === 'get' ? null : []);
                }
                return this.mockProxy;
            },
            apply: (_target, _thisArg, _argArray) => {
                return this.mockProxy;
            }
        };
        // We need a function as target to allow function calls
        this.mockProxy = new Proxy(() => { }, handler) as MockChain;

        this.select = this.mockProxy;
        this.insert = this.mockProxy;
        this.update = this.mockProxy;
        this.delete = this.mockProxy;
        this.transaction = async (cb: (tx: unknown) => Promise<unknown>) => cb(this);
        this.query = new Proxy({}, {
            get: () => this.mockProxy
        }) as Record<string, MockChain>;
    }

    async initializeDatabase(): Promise<void> {
        logger.warn("Initializing Fallback Database (No-Op Mode) - Storage is undefined/unavailable");
        this.isInitialized = true;
    }

    async queryMany<T>(query: string, _params?: unknown[]): Promise<T[]> {
        this.logFallbackUsage("queryMany", query);
        return [];
    }

    async queryOne<T>(query: string, _params?: unknown[]): Promise<T | null> {
        this.logFallbackUsage("queryOne", query);
        return null;
    }

    async execute(query: string, _params?: unknown[]): Promise<void> {
        this.logFallbackUsage("execute", query);
        // No-op for writes
    }

    private logFallbackUsage(method: string, query: string): void {
        if (!this.isInitialized) {
            logger.warn(`FallbackDb accessed before initialization: ${method}`);
        }
        logger.debug(`FallbackDb execution (${method})`, {
            query: query.substring(0, 50) + (query.length > 50 ? "..." : ""),
            mode: "fallback_no_op"
        });
    }
}

export const fallbackDb = new FallbackDb();
