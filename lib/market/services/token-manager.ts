import { getLogger } from "@/lib/utils/logging/logger";
import { AuthTokens } from "../types";

export class TokenManager {
    private tokens: Map<string, AuthTokens> = new Map();
    private logger = getLogger("TokenManager");

    constructor() {
        // TODO: Initialize Redis connection for persistence
    }

    /**
     * Saves tokens for a specific provider.
     */
    async saveTokens(provider: string, tokens: AuthTokens): Promise<void> {
        this.tokens.set(provider, tokens);
        this.logger.debug(`Saved tokens for ${provider}`);
        // TODO: Persist to Redis
    }

    /**
     * Retrieves tokens for a specific provider.
     */
    async getTokens(provider: string): Promise<AuthTokens | undefined> {
        // TODO: Retrieve from Redis if not in memory
        return this.tokens.get(provider);
    }

    /**
     * Clears tokens for a provider (e.g. on auth failure).
     */
    async clearTokens(provider: string): Promise<void> {
        this.tokens.delete(provider);
        this.logger.debug(`Cleared tokens for ${provider}`);
    }

    /**
     * Checks if tokens are valid/expired.
     */
    hasValidTokens(provider: string): boolean {
        const tokens = this.tokens.get(provider);
        if (!tokens) return false;

        if (tokens.expiresAt && tokens.expiresAt < new Date()) {
            return false;
        }

        return true;
    }
}
