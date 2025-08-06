/**
 * Service de gestion des catalogues Vinted avec catégories prédéfinies
 */

export interface VintedCatalog {
    id: number;
    name: string;
    description: string;
    parentId?: number;
    keywords: string[];
}

/**
 * Catalogues Vinted prédéfinis basés sur l'API réelle
 */
export const VINTED_CATALOGS: VintedCatalog[] = [
    // Femmes
    {
        id: 1904,
        name: "Femmes",
        description: "Vêtements et accessoires pour femmes",
        keywords: ["femme", "women", "dame", "féminin", "girl"]
    },
    {
        id: 1905,
        name: "Chaussures Femmes",
        description: "Chaussures pour femmes",
        parentId: 1904,
        keywords: ["chaussures", "shoes", "baskets", "talons", "bottes", "sandales", "femme"]
    },
    {
        id: 1906,
        name: "Vêtements Femmes",
        description: "Vêtements pour femmes",
        parentId: 1904,
        keywords: ["vêtements", "clothes", "robe", "jupe", "pantalon", "chemise", "pull", "femme"]
    },
    {
        id: 1907,
        name: "Accessoires Femmes",
        description: "Accessoires pour femmes",
        parentId: 1904,
        keywords: ["accessoires", "sac", "bijoux", "montre", "ceinture", "écharpe", "femme"]
    },

    // Hommes
    {
        id: 5,
        name: "Hommes",
        description: "Vêtements et accessoires pour hommes",
        keywords: ["homme", "men", "masculin", "boy", "garçon"]
    },
    {
        id: 1908,
        name: "Chaussures Hommes",
        description: "Chaussures pour hommes",
        parentId: 5,
        keywords: ["chaussures", "shoes", "baskets", "boots", "sneakers", "homme"]
    },
    {
        id: 1909,
        name: "Vêtements Hommes",
        description: "Vêtements pour hommes",
        parentId: 5,
        keywords: ["vêtements", "clothes", "pantalon", "chemise", "pull", "veste", "homme"]
    },
    {
        id: 1910,
        name: "Accessoires Hommes",
        description: "Accessoires pour hommes",
        parentId: 5,
        keywords: ["accessoires", "montre", "ceinture", "sac", "casquette", "homme"]
    },

    // Enfants
    {
        id: 1193,
        name: "Enfants",
        description: "Vêtements et accessoires pour enfants",
        keywords: ["enfant", "kids", "children", "bébé", "baby"]
    },
    {
        id: 1911,
        name: "Chaussures Enfants",
        description: "Chaussures pour enfants",
        parentId: 1193,
        keywords: ["chaussures", "shoes", "baskets", "enfant", "kids"]
    },
    {
        id: 1912,
        name: "Vêtements Enfants",
        description: "Vêtements pour enfants",
        parentId: 1193,
        keywords: ["vêtements", "clothes", "enfant", "kids", "bébé"]
    },

    // Maison
    {
        id: 1918,
        name: "Maison",
        description: "Articles pour la maison",
        keywords: ["maison", "home", "décoration", "mobilier", "cuisine"]
    },

    // Électronique
    {
        id: 2994,
        name: "Électronique",
        description: "Appareils électroniques",
        keywords: ["électronique", "electronic", "tech", "gadget", "phone", "ordinateur"]
    },

    // Catégories populaires spécifiques
    {
        id: 1913,
        name: "Sneakers",
        description: "Baskets et chaussures de sport",
        keywords: ["sneakers", "baskets", "sport", "nike", "adidas", "jordan"]
    },
    {
        id: 1914,
        name: "Sacs à main",
        description: "Sacs à main et maroquinerie",
        keywords: ["sac", "bag", "handbag", "maroquinerie", "pochette"]
    },
    {
        id: 1915,
        name: "Robes",
        description: "Robes pour femmes",
        keywords: ["robe", "dress", "robe de soirée", "robe d'été"]
    },
    {
        id: 1916,
        name: "Jeans",
        description: "Jeans et pantalons en denim",
        keywords: ["jean", "jeans", "denim", "pantalon"]
    },
    {
        id: 1917,
        name: "Montres",
        description: "Montres et horlogerie",
        keywords: ["montre", "watch", "horlogerie", "temps"]
    }
];

/**
 * Service de recherche et gestion des catalogues Vinted
 */
export class VintedCatalogService {
    private static instance: VintedCatalogService;

    public static getInstance(): VintedCatalogService {
        if (!VintedCatalogService.instance) {
            VintedCatalogService.instance = new VintedCatalogService();
        }
        return VintedCatalogService.instance;
    }

    /**
     * Recherche des catalogues par mots-clés
     */
    searchCatalogs(query: string): VintedCatalog[] {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            return VINTED_CATALOGS.filter(catalog => !catalog.parentId); // Retourner les catégories principales
        }

        return VINTED_CATALOGS.filter(catalog => {
            // Recherche dans le nom
            if (catalog.name.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Recherche dans la description
            if (catalog.description.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Recherche dans les mots-clés
            return catalog.keywords.some(keyword => 
                keyword.toLowerCase().includes(searchTerm) || 
                searchTerm.includes(keyword.toLowerCase())
            );
        }).sort((a, b) => {
            // Prioriser les correspondances exactes dans le nom
            const aExactMatch = a.name.toLowerCase() === searchTerm;
            const bExactMatch = b.name.toLowerCase() === searchTerm;
            
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;
            
            // Puis les correspondances dans le nom
            const aNameMatch = a.name.toLowerCase().includes(searchTerm);
            const bNameMatch = b.name.toLowerCase().includes(searchTerm);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Récupère un catalogue par ID
     */
    getCatalogById(id: number): VintedCatalog | null {
        return VINTED_CATALOGS.find(catalog => catalog.id === id) || null;
    }

    /**
     * Récupère les catalogues principaux (sans parent)
     */
    getMainCatalogs(): VintedCatalog[] {
        return VINTED_CATALOGS.filter(catalog => !catalog.parentId);
    }

    /**
     * Récupère les sous-catalogues d'un catalogue parent
     */
    getSubCatalogs(parentId: number): VintedCatalog[] {
        return VINTED_CATALOGS.filter(catalog => catalog.parentId === parentId);
    }

    /**
     * Suggère des catalogues basés sur un nom de produit
     */
    suggestCatalogsForProduct(productName: string): VintedCatalog[] {
        const suggestions = this.searchCatalogs(productName);
        
        // Limiter à 5 suggestions les plus pertinentes
        return suggestions.slice(0, 5);
    }

    /**
     * Récupère tous les catalogues disponibles
     */
    getAllCatalogs(): VintedCatalog[] {
        return [...VINTED_CATALOGS];
    }

    /**
     * Trouve le meilleur catalogue pour un produit donné
     */
    findBestCatalogForProduct(productName: string): VintedCatalog | null {
        const suggestions = this.suggestCatalogsForProduct(productName);
        return suggestions.length > 0 ? suggestions[0] : null;
    }
}

// Export de l'instance singleton
export const vintedCatalogService = VintedCatalogService.getInstance();