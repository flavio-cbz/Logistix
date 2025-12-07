import { getLogger } from "@/lib/utils/logging/logger";

export interface Proxy {
    url: string;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    host: string;
    port: number;
    auth?: {
        username: string;
        password: string;
    };
    lastUsed?: Date;
    failureCount: number;
    isBlacklisted: boolean;
}

export class ProxyManager {
    private proxies: Proxy[] = [];
    private logger = getLogger("ProxyManager");

    constructor() {
        // TODO: Load proxies from configuration or database
    }

    /**
     * Gets a rotating proxy for the request.
     */
    getProxy(): Proxy | undefined {
        // Simple round-robin or random selection for now
        const availableProxies = this.proxies.filter(p => !p.isBlacklisted);
        if (availableProxies.length === 0) {
            return undefined;
        }

        // Sort by last used to rotate
        availableProxies.sort((a, b) => {
            if (!a.lastUsed) return -1;
            if (!b.lastUsed) return 1;
            return a.lastUsed.getTime() - b.lastUsed.getTime();
        });

        const proxy = availableProxies[0];
        proxy.lastUsed = new Date();
        return proxy;
    }

    /**
     * Reports a proxy failure to handle blacklisting/rotation logic.
     */
    reportFailure(proxy: Proxy) {
        proxy.failureCount++;
        if (proxy.failureCount > 3) {
            proxy.isBlacklisted = true;
            this.logger.warn(`Proxy ${proxy.host}:${proxy.port} blacklisted due to failures`);
        }
    }

    /**
     * Adds a proxy to the pool.
     */
    addProxy(proxyUrl: string) {
        try {
            const url = new URL(proxyUrl);
            const proxy: Proxy = {
                url: proxyUrl,
                protocol: url.protocol.replace(':', '') as any,
                host: url.hostname,
                port: parseInt(url.port),
                auth: url.username ? {
                    username: url.username,
                    password: url.password
                } : undefined,
                failureCount: 0,
                isBlacklisted: false
            };
            this.proxies.push(proxy);
        } catch (error) {
            this.logger.error("Failed to parse proxy URL", { error, proxyUrl });
        }
    }
}
