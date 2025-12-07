import { MarketAnalysis, MarketProduct, SearchFilters } from "@/lib/types/market";

// Simulation de délai réseau
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Données factices pour la démo
const MOCK_PRODUCTS: MarketProduct[] = [
    {
        id: '1',
        title: 'Nike Air Force 1 White - T38',
        price: 85.00,
        currency: 'EUR',
        platform: 'Vinted',
        url: '#',
        imageUrl: '👟',
        condition: 'Très bon état',
        sellerRating: 4.8,
        postedAt: new Date()
    },
    {
        id: '2',
        title: 'Nike Air Force 1 Black - T39',
        price: 80.00,
        currency: 'EUR',
        platform: 'Vinted',
        url: '#',
        imageUrl: '👟',
        condition: 'Bon état',
        sellerRating: 4.5,
        postedAt: new Date()
    },
    {
        id: '3',
        title: 'Nike Air Force 1 Shadow - T38',
        price: 95.00,
        currency: 'EUR',
        platform: 'Vinted',
        url: '#',
        imageUrl: '👟',
        condition: 'Neuf avec étiquette',
        sellerRating: 5.0,
        postedAt: new Date()
    },
    {
        id: '4',
        title: 'Nike Air Force 1 Custom',
        price: 120.00,
        currency: 'EUR',
        platform: 'eBay',
        url: '#',
        imageUrl: '🎨',
        condition: 'Neuf',
        sellerRating: 4.9,
        postedAt: new Date()
    }
];

export const MarketService = {
    async searchProducts(filters: SearchFilters): Promise<MarketProduct[]> {
        await delay(800); // Simuler latence API

        if (!filters.query) return [];

        // Filtrage basique simulé
        return MOCK_PRODUCTS.filter(p =>
            p.title.toLowerCase().includes(filters.query.toLowerCase())
        );
    },

    async analyzeProduct(productId: string): Promise<MarketAnalysis> {
        await delay(1500); // Simuler temps de calcul/scraping

        const product = MOCK_PRODUCTS.find(p => p.id === productId);
        if (!product) throw new Error("Produit non trouvé");

        // Génération de données d'analyse basées sur le produit sélectionné
        const basePrice = product.price;

        return {
            productId,
            timestamp: new Date(),
            totalListings: Math.floor(Math.random() * 100) + 50,
            averagePrice: basePrice,
            medianPrice: basePrice - 5,
            minPrice: basePrice * 0.7,
            maxPrice: basePrice * 1.3,
            bestPlatform: 'Vinted',
            demandLevel: 'High',
            priceDistribution: [
                { range: `${Math.floor(basePrice * 0.7)}-${Math.floor(basePrice * 0.8)}€`, min: basePrice * 0.7, max: basePrice * 0.8, count: 10 },
                { range: `${Math.floor(basePrice * 0.8)}-${Math.floor(basePrice * 0.9)}€`, min: basePrice * 0.8, max: basePrice * 0.9, count: 25 },
                { range: `${Math.floor(basePrice * 0.9)}-${Math.floor(basePrice * 1.1)}€`, min: basePrice * 0.9, max: basePrice * 1.1, count: 45 },
                { range: `${Math.floor(basePrice * 1.1)}-${Math.floor(basePrice * 1.3)}€`, min: basePrice * 1.1, max: basePrice * 1.3, count: 15 },
            ],
            recommendation: {
                suggestedPrice: basePrice * 0.95, // Prix légèrement agressif
                confidenceScore: 85,
                reasoning: "Forte demande détectée sur Vinted pour ce modèle. Un prix légèrement inférieur à la moyenne garantit une vente rapide."
            }
        };
    }
};
