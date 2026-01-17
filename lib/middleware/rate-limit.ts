import { NextRequest, NextResponse } from "next/server";
import { createErrorResponse } from "@/lib/utils/api-response";
import { logger } from "@/lib/utils/logging/logger";

interface RateLimitConfig {
    uniqueTokenPerInterval?: number; // Max users per interval
    interval?: number; // Interval in ms
}



const LRU_CACHE_SIZE = 500;
const DEFAULT_INTERVAL = 60000; // 1 minute

export class RateLimitService {
    private tokenCache: Map<string, number[]>;
    private uniqueTokenPerInterval: number;
    private interval: number;

    constructor(options?: RateLimitConfig) {
        this.tokenCache = new Map();
        this.uniqueTokenPerInterval = options?.uniqueTokenPerInterval || LRU_CACHE_SIZE;
        this.interval = options?.interval || DEFAULT_INTERVAL;
    }

    async check(limit: number, token: string): Promise<boolean> {
        const now = Date.now();
        const windowStart = now - this.interval;

        const tokenCount = this.tokenCache.get(token) || [];

        // Filter out old timestamps
        const validTimestamps = tokenCount.filter((timestamp) => timestamp > windowStart);

        // Check if limit exceeded
        if (validTimestamps.length >= limit) {
            return false;
        }

        // Add new timestamp
        validTimestamps.push(now);
        this.tokenCache.set(token, validTimestamps);

        // Cleanup if cache is too large (simple LRU-like protection)
        if (this.tokenCache.size > this.uniqueTokenPerInterval) {
            // Remove the first key (simplistic eviction)
            const firstKey = this.tokenCache.keys().next().value;
            if (firstKey) this.tokenCache.delete(firstKey);
        }

        return true;
    }
}

// Global instance for the application
// Using 500 max unique IPs tracked, 1 minute window
export const rateLimiter = new RateLimitService({
    uniqueTokenPerInterval: 500,
    interval: 60000,
});

/**
 * Middleware helper to enforce rate limiting
 * @param req NextRequest
 * @param limit Max requests per interval
 * @returns Response if blocked, null if allowed
 */
export async function checkRateLimit(req: NextRequest, limit: number = 10): Promise<NextResponse | null> {
    const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown";
    const token = `rl:${ip}:${req.nextUrl.pathname}`;

    try {
        const isAllowed = await rateLimiter.check(limit, token);

        if (!isAllowed) {
            logger.warn("Rate limit exceeded", { ip, path: req.nextUrl.pathname });
            return NextResponse.json(
                createErrorResponse(new Error("Trop de tentatives, veuillez réessayer plus tard.")),
                { status: 429 }
            );
        }

        return null;
    } catch (error) {
        logger.error("Rate limit error", { error });
        // Fail open in case of error
        return null;
    }
}
