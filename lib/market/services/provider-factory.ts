import { MarketplaceProvider } from "../providers/interfaces";
import { VintedProvider } from "../providers/vinted";


export class ProviderFactory {
    // private logger = getLogger("ProviderFactory");
    private providers: Map<string, MarketplaceProvider> = new Map();

    constructor() {
        // Pre-initialize known providers
        // In a real scenario, we might want to lazy-load these
        this.registerProvider(new VintedProvider());
    }

    registerProvider(provider: MarketplaceProvider) {
        this.providers.set(provider.name, provider);
    }

    getProvider(name: string): MarketplaceProvider {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Provider ${name} not found`);
        }
        return provider;
    }

    getAllProviders(): MarketplaceProvider[] {
        return Array.from(this.providers.values());
    }
}
