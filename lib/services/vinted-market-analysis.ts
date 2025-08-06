import axios, { AxiosRequestHeaders } from 'axios';
import { URLSearchParams } from 'url';
import { logger } from '@/lib/utils/logging/logger';
import { VintedIntegrationInstrumentation, MarketAnalysisInstrumentation } from './logging-instrumentation';
import {
    
    SuggestionsResponseSchema,
    ApiResponseSoldItemsSchema,
    
    SoldItem,
    Catalog,
    
} from '@/lib/validations/vinted-market-analysis-schemas';
import { KNOWN_BRANDS } from '@/lib/data/known-brands';

// --- Constantes API ---
const VINTED_API_BASE = 'https://www.vinted.fr/api/v2';
const SOLD_ITEMS_URL = `${VINTED_API_BASE}/item_upload/items/similar_sold_items`;
const SUGGESTIONS_URL = `${VINTED_API_BASE}/items/suggestions`;


// --- Interfaces ---
export interface VintedAnalysisResult {
    salesVolume: number;
    avgPrice: number;
    priceRange: {
        min: number;
        max: number;
    };
    brandInfo: {
        id: number;
        name: string;
    } | null;
    catalogInfo: {
        id: number;
        name: string;
    };
    rawItems: SoldItem[];
    analysisDate: string;
}

export interface AnalysisRequest {
    productName: string;
    catalogId: number;
    categoryName?: string;
    token: string;
}

// --- Classes d'erreur ---
export class VintedApiError extends Error {
    constructor(message: string, public status?: number, public context?: string) {
        super(message);
        this.name = 'VintedApiError';
    }
}

export class VintedValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VintedValidationError';
    }
}

// --- Service principal ---
export class VintedMarketAnalysisService {
    private static instance: VintedMarketAnalysisService;

    public static getInstance(): VintedMarketAnalysisService {
        if (!VintedMarketAnalysisService.instance) {
            VintedMarketAnalysisService.instance = new VintedMarketAnalysisService();
        }
        return VintedMarketAnalysisService.instance;
    }

    /**
     * Analyse un produit sur Vinted
     */
    async analyzeProduct(request: AnalysisRequest): Promise<VintedAnalysisResult> {
        return MarketAnalysisInstrumentation.instrumentAnalysis(
            'PRODUCT_ANALYSIS',
            async () => {
                const { productName, catalogId, categoryName, token } = request;
                
                const headers = this.createHeaders(token);
                
                logger.info(`[VintedService] Début de l'analyse pour "${productName}" (catalog: ${catalogId}, category: ${categoryName})`);

                // 1. Déterminer le meilleur catalogId
                const finalCatalogId = await this.getBestCatalogId(categoryName || '', catalogId);
                
                // 2. Tenter de trouver une marque connue dans le titre
                let brandId: number | null = this.findBrandInTitle(productName)?.id ?? null;
                
                // 3. Si aucune marque connue n'est trouvée, utiliser l'API de suggestion
                if (!brandId) {
                    logger.info(`[VintedService] Aucune marque connue trouvée, appel de l'API de suggestion...`);
                    brandId = await this.getSuggestedBrandId(productName, finalCatalogId, headers);
                }
                logger.info(`[VintedService] Brand ID final: ${brandId}`);
                
                // 4. Récupérer les articles vendus
                const soldItems = await this.getSoldItems(brandId, finalCatalogId, headers);
                logger.info(`[VintedService] ${soldItems.length} articles vendus récupérés`);
                
                // 5. Calculer les métriques
                const result = this.calculateMetrics(soldItems, finalCatalogId, brandId);
                
                logger.info(`[VintedService] Analyse terminée: ${result.salesVolume} ventes, prix moyen ${result.avgPrice}€`);
                return result;
            },
            { productName: request.productName, catalogId: request.catalogId }
        );
    }

    /**
     * Tente de trouver le meilleur ID de catalogue basé sur le nom de la catégorie.
     */
    async getBestCatalogId(categoryName: string, initialCatalogId: number): Promise<number> {
        if (!categoryName) {
            logger.warn(`[VintedService] Aucun nom de catégorie fourni, utilisation de l'ID de catalogue initial: ${initialCatalogId}`);
            return initialCatalogId;
        }

        try {
            // Cette partie dépend d'un service de catalogue qui n'est pas complètement implémenté.
            // Pour l'instant, on simule un succès si le nom est "Hauts et t-shirts"
            if (categoryName.toLowerCase() === 'hauts et t-shirts') {
                logger.info(`[VintedService] Catalogue correspondant trouvé pour "${categoryName}": ID 1806`);
                return 1806;
            }
            logger.warn(`[VintedService] Aucun catalogue correspondant trouvé pour "${categoryName}", utilisation de l'ID initial: ${initialCatalogId}`);
            return initialCatalogId;
        } catch (error) {
            logger.error(`[VintedService] Erreur lors de la recherche de catalogue, fallback sur l'ID initial.`, { error });
            return initialCatalogId;
        }
    }

    /**
     * Tente de trouver une marque connue dans le titre du produit.
     */
    private findBrandInTitle(title: string): { id: number; name: string } | null {
        const lowerCaseTitle = title.toLowerCase();
        for (const brand of KNOWN_BRANDS) {
            if (lowerCaseTitle.includes(brand.name.toLowerCase())) {
                logger.info(`[VintedService] Marque connue trouvée dans le titre: "${brand.name}"`);
                return brand;
            }
        }
        return null;
    }

    /**
     * Obtient l'ID de marque suggéré pour un produit. Retourne null si aucune suggestion n'est trouvée.
     */
    async getSuggestedBrandId(title: string, catalogId: number, headers: AxiosRequestHeaders): Promise<number | null> {
        try {
            return await VintedIntegrationInstrumentation.instrumentApiCall(
                'suggestions',
                'GET',
                async () => {
                    const params = new URLSearchParams({
                        title: title,
                        catalog_id: catalogId.toString(),
                        description: '',
                        'photo_ids[]': '',
                        upload_session_id: '',
                    });
                    
                    const url = `${SUGGESTIONS_URL}?${params.toString()}`;
                    logger.info(`[VintedService] Appel suggestions API: ${url}`);
                    
                    const response = await axios.get(url, {
                        headers,
                        timeout: 10000
                    });
                    
                    const parsed = SuggestionsResponseSchema.safeParse(response.data);
                    if (!parsed.success) {
                        logger.warn(`[VintedService] Réponse API suggestions invalide: ${parsed.error.message}`);
                        return null;
                    }
                    
                    if (parsed.data.brands.length === 0) {
                        logger.warn(`[VintedService] Aucune marque suggérée trouvée pour le titre "${title}"`);
                        return null;
                    }
                    
                    const firstBrand = parsed.data.brands[0];
                    return firstBrand ? firstBrand.id : null;
                },
                { title, catalogId }
            );
        } catch (error: any) {
            logger.error(`[VintedService] Erreur lors de la récupération des suggestions de marque, on continue sans marque.`, { error: error.message });
            return null;
        }
    }

    /**
     * Récupère les articles vendus avec pagination
     */
    async getSoldItems(brandId: number | null, catalogId: number, headers: AxiosRequestHeaders): Promise<SoldItem[]> {
        return MarketAnalysisInstrumentation.instrumentDataFetch(
            'VINTED_SOLD_ITEMS',
            async () => {
                let allItems: SoldItem[] = [];
                const ITEMS_PER_PAGE = 20;
                const MAX_PAGES_TO_FETCH = 5;

                for (let page = 1; page <= MAX_PAGES_TO_FETCH; page++) {
                    const params: { [key: string]: string } = {
                        catalog_id: catalogId.toString(),
                        status_id: '6', // Articles vendus
                        page: page.toString(),
                        per_page: ITEMS_PER_PAGE.toString()
                    };

                    if (brandId) {
                        params.brand_id = brandId.toString();
                    }
                    
                    const url = `${SOLD_ITEMS_URL}?${new URLSearchParams(params).toString()}`;
                    
                    try {
                        const pageItems = await VintedIntegrationInstrumentation.instrumentApiCall(
                            `sold_items_page_${page}`,
                            'GET',
                            async () => {
                                logger.info(`[VintedService] Appel sold items API page ${page}: ${url}`);
                                
                                const response = await axios.get(url, { 
                                    headers, 
                                    timeout: 15000 
                                });
                                
                                const parsed = ApiResponseSoldItemsSchema.safeParse(response.data);
                                if (!parsed.success) {
                                    logger.warn(`[VintedService] Réponse invalide page ${page}: ${parsed.error.message}`);
                                    return [];
                                }
                                
                                if (parsed.data.items.length === 0) {
                                    logger.info(`[VintedService] Aucun article trouvé page ${page}, arrêt de la pagination`);
                                    return [];
                                }
                                
                                return parsed.data.items;
                            },
                            { brandId, catalogId, page }
                        );
                        
                        if (pageItems.length === 0) {
                            break;
                        }
                        
                        allItems = allItems.concat(pageItems);
                        
                    } catch (error: any) {
                        logger.warn(`[VintedService] Erreur page ${page}:`, { message: error.message });
                        continue;
                    }
                }

                return allItems;
            },
            `brandId=${brandId}&catalogId=${catalogId}`
        );
    }

    /**
     * Calcule les métriques à partir des articles vendus
     */
    private calculateMetrics(
        soldItems: SoldItem[],
        
        catalogId: number,
        brandId: number | null
    ): VintedAnalysisResult {
        if (soldItems.length === 0) {
            return {
                salesVolume: 0,
                avgPrice: 0,
                priceRange: { min: 0, max: 0 },
                brandInfo: null,
                catalogInfo: { id: catalogId, name: 'Unknown' },
                rawItems: [],
                analysisDate: new Date().toISOString(),
            };
        }

        const prices = soldItems.map(item => parseFloat(item.price.amount));
        const totalPrice = prices.reduce((sum, price) => sum + price, 0);
        const avgPrice = parseFloat((totalPrice / prices.length).toFixed(2));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const itemWithBrand = soldItems.find(item => item.brand);
        const brandInfo = itemWithBrand?.brand ? {
            id: itemWithBrand.brand.id,
            name: itemWithBrand.brand.title
        } : (brandId ? { id: brandId, name: 'Unknown' } : null);

        return {
            salesVolume: soldItems.length,
            avgPrice,
            priceRange: { min: minPrice, max: maxPrice },
            brandInfo,
            catalogInfo: { id: catalogId, name: 'Unknown' },
            rawItems: soldItems,
            analysisDate: new Date().toISOString(),
        };
    }

    /**
     * Crée les en-têtes HTTP pour les requêtes Vinted.
     */
    private createHeaders(cookieString: string): AxiosRequestHeaders {
        return {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Referer': 'https://www.vinted.fr/',
            'Origin': 'https://www.vinted.fr',
            'Cookie': cookieString,
        } as unknown as AxiosRequestHeaders;
    }

    /**
     * Gère les erreurs Axios avec des messages appropriés
     */
    private handleAxiosError(error: any, context: string): never {
        if (error && error.isAxiosError) {
            if (error.response) {
                const { status, statusText } = error.response;
                throw new VintedApiError(
                    `Erreur API ${context} (status: ${status} ${statusText})`, 
                    status, 
                    context
                );
            } else if (error.code === 'ECONNABORTED') {
                throw new VintedApiError(`Timeout de la requête ${context}`, undefined, context);
            } else {
                throw new VintedApiError(
                    `Erreur réseau ${context}: ${error.message}`, 
                    undefined, 
                    context
                );
            }
        }
        throw new Error(`Erreur inattendue ${context}: ${error?.message || 'Unknown error'}`);
    }

    /**
     * Retry avec backoff exponentiel
     */
    async retryWithBackoff<T>(
        operation: () => Promise<T>, 
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries) {
                    break;
                }
                
                const delay = baseDelay * Math.pow(2, attempt);
                logger.warn(`[VintedService] Tentative ${attempt + 1} échouée, retry dans ${delay}ms:`, { error });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    }
}

// --- Service de gestion des catalogues ---
// NOTE: Ce service est un mock et devrait être remplacé par une vraie implémentation.
export class CatalogService {
    private static instance: CatalogService;

    public static getInstance(): CatalogService {
        if (!CatalogService.instance) {
            CatalogService.instance = new CatalogService();
        }
        return CatalogService.instance;
    }

    async findCatalogByName(categoryName: string): Promise<Catalog[]> {
        if (categoryName.toLowerCase() === 'hauts et t-shirts') {
            return [{ id: 1806, title: 'Hauts et t-shirts', catalogs: [] }];
        }
        return [];
    }
}

// Export des instances singleton
export const vintedMarketAnalysisService = VintedMarketAnalysisService.getInstance();
export const catalogService = CatalogService.getInstance();